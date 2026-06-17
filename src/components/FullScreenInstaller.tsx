import React from "react";
import { useLauncherStore } from "../store/launcherStore";

export default function FullScreenInstaller() {
  const { installProgress, busy, snapshot } = useLauncherStore();

  if (!busy || !snapshot?.settings?.ultimate_installer_mode) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(20px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999
    }}>
      <div style={{
        width: 520,
        padding: 30,
        borderRadius: 16,
        background: "linear-gradient(145deg,#111,#1a1a1a)",
        color: "white"
      }}>

        <h2>Installing S9Lab Client</h2>

        <div style={{
          height: 10,
          width: "100%",
          background: "#222",
          borderRadius: 999,
          overflow: "hidden",
          marginTop: 20
        }}>
          <div style={{
            width: `${installProgress?.percent || 0}%`,
            height: "100%",
            background: "linear-gradient(90deg,#4ade80,#38bdf8,#a78bfa)",
            transition: "width 0.2s ease"
          }} />
        </div>

        <p style={{ marginTop: 10, opacity: 0.8 }}>
          {installProgress?.stage} • {installProgress?.detail}
        </p>

      </div>
    </div>
  );
}
