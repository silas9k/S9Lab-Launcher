import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Boxes,
  Command,
  Download,
  Home,
  Layers3,
  MoonStar,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useLauncherStore } from "../store/launcherStore";
import { LAUNCHER_UPDATER_ENABLED } from "../updater-config";
import "../enhancements.css";

type InterfaceMode = "signature" | "obsidian";
type RewardResult = { claimed: boolean; coins: number; message: string };

function applyInterfaceMode(mode: InterfaceMode) {
  document.documentElement.dataset.interfaceMode = mode;
  localStorage.setItem("s9lab-interface-mode", mode);
}

export function LauncherEnhancements() {
  const { snapshot, setPage } = useLauncherStore();
  const [studioOpen, setStudioOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mode, setMode] = useState<InterfaceMode>(() =>
    localStorage.getItem("s9lab-interface-mode") === "obsidian" ? "obsidian" : "signature",
  );
  const [update, setUpdate] = useState<Update | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeAccountId = snapshot?.active_account_id ?? null;
  const activeAccount = useMemo(
    () => snapshot?.accounts.find((account) => account.id === activeAccountId) ?? null,
    [snapshot, activeAccountId],
  );

  useEffect(() => applyInterfaceMode(mode), [mode]);

  useEffect(() => {
    if (!LAUNCHER_UPDATER_ENABLED) return;
    const timer = window.setTimeout(async () => {
      try {
        const available = await check({ timeout: 15_000 });
        if (available) setUpdate(available);
      } catch (error) {
        console.info("launcher_update_check_skipped", error);
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setStudioOpen(false);
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const logo = document.querySelector<HTMLButtonElement>(".sidebar__logo");
    if (!logo) return;

    const claim = async () => {
      if (!activeAccountId) {
        setMessage("Wähle zuerst einen Account aus.");
        return;
      }
      try {
        const result = await invoke<RewardResult>("claim_logo_reward", { accountId: activeAccountId });
        setMessage(result.claimed ? `Secret gefunden: +1000 Coins · ${result.coins} Coins` : result.message);
      } catch (error) {
        setMessage(String(error));
      }
    };

    logo.addEventListener("dblclick", claim);
    return () => logo.removeEventListener("dblclick", claim);
  }, [activeAccountId]);

  const installLauncherUpdate = async () => {
    if (!update) return;
    setUpdateBusy(true);
    let downloaded = 0;
    let total = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        if (total > 0) setUpdateProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        if (event.event === "Finished") setUpdateProgress(100);
      });
      await relaunch();
    } catch (error) {
      setMessage(`Launcher-Update fehlgeschlagen: ${String(error)}`);
      setUpdateBusy(false);
    }
  };

  const go = (page: "home" | "accounts" | "settings" | "logs") => {
    setPage(page);
    setCommandOpen(false);
  };

  return (
    <>
      <div className="interface-tools">
        <button onClick={() => setStudioOpen(true)} title="Interface Studio">
          <Layers3 size={17} />
        </button>
        <button onClick={() => setCommandOpen(true)} title="Command Center (Ctrl+K)">
          <Command size={17} />
        </button>
      </div>

      {studioOpen && (
        <div className="obsidian-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setStudioOpen(false)}>
          <section className="interface-studio-v2">
            <header>
              <div>
                <span>INTERFACE STUDIO</span>
                <h2>Launcher-Architektur wechseln</h2>
              </div>
              <button onClick={() => setStudioOpen(false)} aria-label="Schließen"><X size={18} /></button>
            </header>

            <div className="interface-mode-grid-v2">
              <button className={mode === "signature" ? "mode-card-v2 active" : "mode-card-v2"} onClick={() => setMode("signature")}>
                <div className="mode-shot signature-shot"><i/><i/><i/></div>
                <div><strong>Signature</strong><span>Dein bisheriges S9Lab Interface.</span></div>
              </button>
              <button className={mode === "obsidian" ? "mode-card-v2 active" : "mode-card-v2"} onClick={() => setMode("obsidian")}>
                <div className="mode-shot obsidian-shot"><i/><i/><i/></div>
                <div><strong>Obsidian</strong><span>Matte, düstere Oberfläche mit komplett anderer Navigation.</span></div>
              </button>
            </div>

            <p className="studio-note-v2">Das S9Lab-Logo bleibt unverändert. Die Auswahl wird lokal gespeichert.</p>
          </section>
        </div>
      )}

      {commandOpen && (
        <div className="obsidian-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCommandOpen(false)}>
          <section className="command-center-v2">
            <header><Command size={17}/><strong>Command Center</strong><kbd>ESC</kbd></header>
            <div className="command-list-v2">
              <button onClick={() => go("home")}><Home/><span><strong>Startseite</strong><small>Client starten</small></span></button>
              <button onClick={() => go("accounts")}><UserRound/><span><strong>{activeAccount?.username ?? "Accounts"}</strong><small>Accounts verwalten</small></span></button>
              <button onClick={() => go("settings")}><Settings/><span><strong>Einstellungen</strong><small>Launcher konfigurieren</small></span></button>
              <button onClick={() => setStudioOpen(true)}><MoonStar/><span><strong>Interface Studio</strong><small>Signature oder Obsidian</small></span></button>
            </div>
          </section>
        </div>
      )}

      {update && (
        <aside className="launcher-update-card-v2">
          <ShieldCheck size={20}/>
          <div>
            <strong>Launcher {update.version} verfügbar</strong>
            <span>{update.body || "Neue S9Lab-Version verfügbar."}</span>
            {updateBusy && <div className="update-progress-v2"><i style={{ width: `${updateProgress}%` }}/></div>}
          </div>
          <button onClick={() => void installLauncherUpdate()} disabled={updateBusy}>
            <Download size={15}/>{updateBusy ? `${updateProgress}%` : "Installieren"}
          </button>
          {!updateBusy && <button className="close-update-v2" onClick={() => setUpdate(null)}><X size={14}/></button>}
        </aside>
      )}

      {message && <button className="enhancement-toast-v2" onClick={() => setMessage(null)}>{message}<X size={14}/></button>}
    </>
  );
}
