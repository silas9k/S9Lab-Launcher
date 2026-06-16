import { useEffect, useRef, useState } from "react";
import { IdleAnimation, SkinViewer } from "skinview3d";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { commands } from "../lib/commands";
import type { Account, SkinPose } from "../types";
import defaultSkin from "../assets/default-skin.png";

function applyPose(viewer: SkinViewer, pose: SkinPose) {
  const player = viewer.playerObject as unknown as {
    rotation: { y: number };
    skin: {
      head: { rotation: { x: number; y: number; z: number } };
      leftArm: { rotation: { x: number; y: number; z: number } };
      rightArm: { rotation: { x: number; y: number; z: number } };
      leftLeg: { rotation: { x: number; y: number; z: number } };
      rightLeg: { rotation: { x: number; y: number; z: number } };
    };
  };

  player.rotation.y = pose === "relaxed" ? -0.32 : -0.18;
  player.skin.head.rotation.y = pose === "relaxed" ? 0.16 : 0.08;

  if (pose === "hero") {
    player.skin.leftArm.rotation.z = -0.1;
    player.skin.rightArm.rotation.z = 0.1;
    player.skin.leftArm.rotation.x = -0.1;
    player.skin.rightArm.rotation.x = 0.08;
    player.skin.leftLeg.rotation.x = 0.05;
    player.skin.rightLeg.rotation.x = -0.05;
  } else if (pose === "relaxed") {
    player.skin.leftArm.rotation.z = -0.18;
    player.skin.rightArm.rotation.z = 0.14;
    player.skin.leftArm.rotation.x = -0.2;
    player.skin.rightArm.rotation.x = 0.14;
    player.skin.leftLeg.rotation.x = 0.11;
    player.skin.rightLeg.rotation.x = -0.09;
  }
}

export function PlayerSkin({
  account,
  animated = true,
  pose = "hero",
}: {
  account: Account | null;
  animated?: boolean;
  pose?: SkinPose;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback" | "failed">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !account) return;

    let disposed = false;
    let viewer: SkinViewer | null = null;
    setStatus("loading");

    void (async () => {
      try {
        viewer = new SkinViewer({ canvas, width: Math.max(320, canvas.clientWidth || 430), height: Math.max(440, canvas.clientHeight || 570) });
        viewer.zoom = 0.88;
        viewer.fov = 36;
        viewer.camera.position.set(30, 18, 48);
        viewer.camera.lookAt(0, 10, 0);
        viewer.controls.enableRotate = false;
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;

        let source = defaultSkin;
        let usedFallback = false;
        try {
          source = await commands.fetchPlayerSkin(account.id, account.username);
        } catch (error) {
          usedFallback = true;
          console.warn("player_skin_fetch_failed", error);
          const compactUuid = account.id.replace(/-/g, "");
          if (/^[0-9a-fA-F]{32}$/.test(compactUuid)) {
            source = `https://mc-heads.net/skin/${compactUuid}`;
          } else if (account.username.trim()) {
            source = `https://mc-heads.net/skin/${encodeURIComponent(account.username.trim())}`;
          }
        }

        try {
          await viewer.loadSkin(source);
        } catch (firstError) {
          if (source !== defaultSkin) {
            usedFallback = true;
            await viewer.loadSkin(defaultSkin);
          } else {
            throw firstError;
          }
        }
        if (disposed) return;
        applyPose(viewer, pose);

        if (animated) {
          const animation = new IdleAnimation();
          animation.speed = 0.34;
          viewer.animation = animation;
        } else {
          viewer.animation = null;
        }
        setStatus(usedFallback ? "fallback" : "ready");
      } catch (error) {
        console.error("skin_render_failed", error);
        if (!disposed) setStatus("failed");
      }
    })();

    return () => {
      disposed = true;
      viewer?.dispose();
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [account?.id, account?.username, animated, pose, retryKey]);

  if (!account) return <div className="skin-placeholder"><span>S9</span><small>Account auswählen</small></div>;

  return (
    <div className={`skin-canvas-wrap skin-canvas-wrap--${status}`}>
      <canvas ref={canvasRef} className="skin-canvas" aria-label={`3D-Skin von ${account.username}`} />
      {status === "loading" && <div className="skin-loading"><LoaderCircle className="spin" /><span>{account.username} wird geladen</span></div>}
      {status === "fallback" && <div className="skin-source-note">Fallback-Skin · Account erneut auswählen zum Aktualisieren</div>}
      {status === "failed" && (
        <div className="skin-fallback">
          <strong>{account.username.slice(0, 1).toUpperCase()}</strong>
          <span>3D-Skin konnte nicht gerendert werden</span>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)}><RotateCcw size={14} /> Erneut versuchen</button>
        </div>
      )}
    </div>
  );
}
