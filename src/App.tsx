import { LauncherEnhancements } from "./components/LauncherEnhancements";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { Modal } from "./components/Modal";
import { commands, type PendingDesignImport } from "./lib/commands";
import { DEFAULT_DESIGN, parseDesignPreset } from "./lib/designProfiles";
import { AccountsPage } from "./pages/Accounts";
import { FriendsPage } from "./pages/Friends";
import { HomePage } from "./pages/Home";
import { LogsPage } from "./pages/Logs";
import { SettingsPage } from "./pages/Settings";
import { ShopPage } from "./pages/Shop";
import { useLauncherStore } from "./store/launcherStore";

export default function App() {
  const { page, setPage, bootstrap, initialized, busy, error, notice, clearMessage, snapshot, updateSettings } = useLauncherStore();
  const [pendingDesign, setPendingDesign] = useState<PendingDesignImport | null>(null);
  const [designImportError, setDesignImportError] = useState<string | null>(null);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    void commands.pendingDesignImport().then((value) => { if (value) setPendingDesign(value); }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const settings = useLauncherStore.getState().snapshot?.settings;
    if (!settings) return;
    document.documentElement.style.setProperty("--accent", settings.accent_color);
    document.documentElement.style.setProperty("--glow-strength", `${settings.glow_intensity / 100}`);
    document.documentElement.style.setProperty("--accent-secondary", settings.secondary_accent);
    document.documentElement.style.setProperty("--surface-opacity", `${settings.surface_opacity / 100}`);
  }, [initialized, snapshot?.settings.accent_color, snapshot?.settings.glow_intensity, snapshot?.settings.secondary_accent, snapshot?.settings.surface_opacity]);

  const content = page === "accounts" ? <AccountsPage />
    : page === "settings" ? <SettingsPage />
    : page === "logs" ? <LogsPage />
    : page === "friends" ? <FriendsPage />
    : page === "shop" ? <ShopPage />
    : <HomePage />;

  const settings = snapshot?.settings;
  const classes = [
    "app-shell",
    `theme-${settings?.background_style ?? "void"}`,
    `density-${settings?.ui_density ?? "comfortable"}`,
    `panels-${settings?.panel_style ?? "glass"}`,
    `corners-${settings?.corner_style ?? "soft"}`,
    settings?.sidebar_labels ? "sidebar-labels" : "",
    settings?.reduced_motion ? "reduced-motion" : "",
    settings?.background_motion ? "background-motion" : "background-static",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <TitleBar />
      <LauncherEnhancements />
      <div className="app-layout">
        <Sidebar page={page} onChange={setPage} />
        <main className="content">
          {!initialized ? <div className="boot"><LoaderCircle className="spin" /><span>S9Lab Launcher wird geladenâ€¦</span></div> : content}
        </main>
      </div>
      {busy && <div className="busy-indicator"><LoaderCircle className="spin" size={15} /> Vorgang lÃ¤uft</div>}
      {error && <div className="toast toast--error"><AlertTriangle size={18} /><span>{error}</span><button onClick={clearMessage}><X size={16} /></button></div>}
      {notice && <div className="toast toast--success"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={clearMessage}><X size={16} /></button></div>}
      {pendingDesign && <Modal title="S9Lab-Design importieren" onClose={() => setPendingDesign(null)}>
        <div className="design-import-confirm">
          <p>MÃ¶chtest du das Farbprofil <strong>{pendingDesign.file_name}</strong> importieren?</p>
          {designImportError && <div className="friends-error">{designImportError}</div>}
          <div className="modal-actions">
            <button className="button" onClick={() => setPendingDesign(null)}>Nein</button>
            <button className="button button--primary" onClick={() => {
              if (!snapshot) return;
              try {
                const preset = parseDesignPreset(pendingDesign.content);
                void updateSettings({ ...snapshot.settings, ...DEFAULT_DESIGN, ...preset.design }).then(() => { setPendingDesign(null); setPage("settings"); });
              } catch (cause) { setDesignImportError(cause instanceof Error ? cause.message : "Import fehlgeschlagen."); }
            }}>Ja, importieren</button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}


