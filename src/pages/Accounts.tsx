import { Check, Copy, ExternalLink, LogIn, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Modal } from "../components/Modal";
import { formatDate, shortId } from "../lib/format";
import { useLauncherStore } from "../store/launcherStore";

export function AccountsPage() {
  const { snapshot, busy, deviceCode, beginLogin, finishLogin, cancelLogin, selectAccount, removeAccount } = useLauncherStore();
  if (!snapshot) return null;
  const openLogin = async () => {
    const url = deviceCode?.verification_uri_complete ?? deviceCode?.verification_uri;
    if (url) await openUrl(url);
  };
  return (
    <div className="page">
      <header className="page-header page-header--actions"><div><span className="eyebrow">MICROSOFT</span><h1>Accounts</h1><p>Mehrere Minecraft-Accounts lokal verwalten und mit einem Klick wechseln.</p></div><button className="button button--primary" onClick={() => void beginLogin()} disabled={busy}><Plus size={17} /> Account hinzufügen</button></header>
      <div className="security-note"><ShieldCheck size={18} /><div><strong>Sicher gespeichert</strong><span>Tokens landen im Windows-Anmeldeinformationsspeicher, nicht im Browser-LocalStorage.</span></div></div>
      <section className="account-list">
        {snapshot.accounts.length === 0 ? (
          <div className="empty panel"><UserRound size={36} /><h2>Noch kein Account</h2><p>Melde deinen Minecraft-Account über Microsoft an.</p><button className="button button--primary" onClick={() => void beginLogin()}><LogIn size={17} /> Microsoft Login</button></div>
        ) : snapshot.accounts.map((account) => {
          const active = snapshot.active_account_id === account.id;
          return <article className={active ? "account-card panel account-card--active" : "account-card panel"} key={account.id}>
            <div className="avatar avatar--head"><img src={`https://mc-heads.net/avatar/${account.id.replace(/-/g, "")}/64`} alt="" /></div>
            <div className="account-card__info"><div><h3>{account.username}</h3>{active && <span className="badge badge--good"><Check size={12} /> AKTIV</span>}</div><span>UUID {shortId(account.id)}</span><small>Hinzugefügt {formatDate(account.added_at_unix)}</small></div>
            <div className="account-card__actions">{!active && <button className="button button--ghost" onClick={() => void selectAccount(account.id)} disabled={busy}>Auswählen</button>}<button className="icon-button icon-button--danger" onClick={() => void removeAccount(account.id)} disabled={busy} title="Entfernen"><Trash2 size={17} /></button></div>
          </article>;
        })}
      </section>
      {deviceCode && <Modal title="Microsoft-Account verbinden" onClose={cancelLogin}>
        <div className="login-flow"><p>Öffne die Microsoft-Seite und gib diesen Code ein:</p><button className="login-code" onClick={() => void navigator.clipboard.writeText(deviceCode.user_code)}>{deviceCode.user_code}<Copy size={18} /></button><button className="button button--primary button--wide" onClick={() => void openLogin()}><ExternalLink size={17} /> Microsoft Login öffnen</button><button className="button button--ghost button--wide" onClick={() => void finishLogin()} disabled={busy}>{busy ? "Anmeldung wird geprüft…" : "Ich habe mich angemeldet"}</button><small>{deviceCode.message}</small></div>
      </Modal>}
    </div>
  );
}
