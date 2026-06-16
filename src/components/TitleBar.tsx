import React from "react";
import { FolderOpen, Minus, Square, Users, X } from "lucide-react";
import { activeAccount, useLauncherStore } from "../store/launcherStore";
import { commands } from "../lib/commands";

function Head({ id, name }: { id?: string; name?: string }) {
  const [failed, setFailed] = React.useState(false);
  const uuid = id?.replace(/-/g, "");
  return !failed && uuid ? <img className="minecraft-head" src={`https://mc-heads.net/avatar/${uuid}/48`} alt="" onError={() => setFailed(true)} /> : <span className="top-avatar">{name?.slice(0, 1).toUpperCase() ?? "?"}</span>;
}

export function TitleBar() {
  const { snapshot, setPage, openGameDirectory } = useLauncherStore();
  const account = activeAccount(snapshot);
  const dragWindow = (event: React.MouseEvent<HTMLElement>) => { if (event.button !== 0 || (event.target as HTMLElement).closest("button,input,a,[data-no-drag]")) return; event.preventDefault(); void commands.windowStartDragging(); };
  const action = (event: React.MouseEvent<HTMLButtonElement>, fn: () => Promise<void>) => { event.preventDefault(); event.stopPropagation(); void fn(); };
  return <header className="titlebar" onMouseDown={dragWindow} onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest("button,input,a,[data-no-drag]")) void commands.windowToggleMaximize(); }}>
    <div className="titlebar__brand"><strong>S9LAB</strong><span><i/> LAUNCHER · 1.0.0</span></div>
    <div className="titlebar__center" data-no-drag>
      <button className="top-chip top-chip--account" onClick={() => setPage("accounts")}><Head id={account?.id} name={account?.username}/>{account?.username ?? "ACCOUNT HINZUFÜGEN"}</button>
      <button className="top-icon" aria-label="Freunde" title="Freunde" onClick={() => setPage("friends")}><Users size={16}/></button>
      <button className="top-icon" aria-label="Spielordner öffnen" title="Spielordner öffnen" onClick={() => void openGameDirectory()}><FolderOpen size={16}/></button>
    </div>
    <div className="titlebar__controls" data-no-drag>
      <button aria-label="Minimieren" onClick={(e) => action(e, commands.windowMinimize)}><Minus size={16}/></button>
      <button aria-label="Maximieren" onClick={(e) => action(e, commands.windowToggleMaximize)}><Square size={12}/></button>
      <button className="titlebar__close" aria-label="Schließen" onClick={(e) => action(e, commands.windowClose)}><X size={16}/></button>
    </div>
  </header>;
}
