import { Check, Download, FolderOpen, RefreshCw, Sparkles } from "lucide-react";
import { useLauncherStore } from "../store/launcherStore";

export function ClientPage() {
  const { snapshot, busy, installProgress, install, openGameDirectory } = useLauncherStore();
  if (!snapshot) return null;
  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">INSTALLATION</span><h1>S9Lab Client</h1><p>Eine saubere, getrennte Minecraft-Installation mit Fabric und allen benötigten Client-Mods.</p></div></header>
      <section className="client-card panel">
        <div className="client-card__visual"><div className="client-monogram">S9</div><span className={snapshot.client.installed ? "badge badge--good" : "badge"}>{snapshot.client.installed ? "INSTALLIERT" : "NICHT INSTALLIERT"}</span></div>
        <div className="client-card__body">
          <h2>S9Lab Client <small>Stable</small></h2>
          <p>Minecraft {snapshot.client.game_version} · Fabric · GeckoLib · S9Lab Cosmetics</p>
          <div className="feature-row"><span><Check /> Automatische Assets</span><span><Check /> Sichere Accounts</span><span><Check /> Eigener Spielordner</span></div>
          <div className="client-card__actions">
            {!snapshot.client.installed ? <button className="button button--primary" onClick={() => void install(false)} disabled={busy}><Download size={17} /> Installieren</button> : <button className="button button--primary" onClick={() => void install(true)} disabled={busy}><RefreshCw size={17} /> Reparieren</button>}
            <button className="button button--ghost" onClick={() => void openGameDirectory()}><FolderOpen size={17} /> Ordner öffnen</button>
          </div>
        </div>
      </section>
      {installProgress && <section className="install-detail panel"><div className="install-detail__head"><div><Sparkles size={18} /><span><strong>{installProgress.stage}</strong><small>{installProgress.detail}</small></span></div><b>{Math.round(installProgress.percent)}%</b></div><div className="progress-track"><i style={{ width: `${installProgress.percent}%` }} /></div></section>}
      <section className="panel table-card"><header><h3>Enthaltene Mods</h3><span>{snapshot.client.bundled_mods.length} Dateien</span></header>{snapshot.client.bundled_mods.map((mod) => <div className="table-row" key={mod}><span className="file-icon">JAR</span><strong>{mod}</strong><span className="badge badge--good">VERWALTET</span></div>)}</section>
    </div>
  );
}
