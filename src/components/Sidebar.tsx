import { Home, ScrollText, Settings, ShoppingBag, UserRound, Users } from "lucide-react";
import logo from "../assets/logo.png";
import type { Page } from "../store/launcherStore";

const items: Array<{ id: Page; label: string; icon: typeof Home }> = [
  { id: "home", label: "Spielen", icon: Home },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "friends", label: "Freunde", icon: Users },
  { id: "accounts", label: "Accounts", icon: UserRound },
  { id: "settings", label: "Einstellungen", icon: Settings },
];

export function Sidebar({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  return (
    <aside className="sidebar">
      <button type="button" className="sidebar__logo" onClick={() => onChange("home")} aria-label="S9Lab Startseite">
        <img src={logo} alt="S9Lab" />
        <span>S9LAB</span>
      </button>
      <nav className="sidebar__nav" aria-label="Launcher Navigation">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            title={label}
            aria-label={label}
            aria-current={page === id ? "page" : undefined}
            className={page === id ? "nav-item nav-item--active" : "nav-item"}
            onClick={() => onChange(id)}
          >
            <Icon size={21} strokeWidth={2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="sidebar__bottom" onClick={() => onChange("logs")} title="Client-Logs">
        <ScrollText size={20} />
        <span>Client-Logs</span>
      </button>
    </aside>
  );
}
