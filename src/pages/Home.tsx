import JavaProgressBar from "../components/JavaProgressBar";
import { Download, Play, Plus, Square } from "lucide-react";
import { activeAccount, useLauncherStore } from "../store/launcherStore";

export function HomePage() {
  const { snapshot, busy, installProgress, launch, stop, setPage } = useLauncherStore();
  if (!snapshot) return null;
  const account = activeAccount(snapshot);
  const running = snapshot.launch.state === "running" || snapshot.launch.state === "starting";
  const canStart = Boolean(account) && snapshot.client.java_found;

  return (
    <div className={`launcher-home launcher-home--minimal ${snapshot.settings?.ultimate_installer_mode && busy ? "blurred" : ""}`}>
      <section className="minimal-stage">
        <div className="wave wave--one" /><div className="wave wave--two" />
        <div className="minimal-launch">
          <h1>{account?.username ?? "S9LAB"}</h1>
          <button className="launch-main" onClick={() => running ? void stop() : void launch()} disabled={busy || (!canStart && !running)}>
            {running ? <Square size={19} fill="currentColor" /> : snapshot.client.installed ? <Play size={20} fill="currentColor" /> : <Download size={20} />}
            <span><strong>{running ? "ALLE STOPPEN" : "START"}</strong><small>{running ? `${snapshot.launch.running_instances} INSTANZ(EN) AKTIV` : `S9LAB CLIENT · ${snapshot.client.game_version}`}</small></span>
          </button>
          {running && <button className="stage-hint" onClick={() => void launch()} disabled={busy || !canStart}><Plus size={15}/> Weitere Instanz starten</button>}
          {!account && <button className="stage-hint" onClick={() => setPage("accounts")}>Microsoft-Account hinzufügen</button>}
          {!snapshot.client.java_found && <button className="stage-hint stage-hint--java" onClick={() => setPage("settings")}>Java 21 konfigurieren</button>}
          {installProgress && busy && <div className="stage-progress"><span>{installProgress.stage}</span><b>{Math.round(installProgress.percent)}%</b><i><em style={{ width: `${installProgress.percent}%` }} /></i><small>{installProgress.detail}</small>  
</div>}
          
</div>
      </section>
      
</div>
  );
}



