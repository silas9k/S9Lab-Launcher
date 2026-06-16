import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FolderOpen,
  Gauge,
  Palette,
  RefreshCcw,
  Save,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { useLauncherStore } from "../store/launcherStore";
import type { BackgroundStyle, CornerStyle, LauncherSettings, PanelStyle } from "../types";
import { createDesignPreset, DEFAULT_DESIGN, parseDesignPreset } from "../lib/designProfiles";

const ACCENTS = ["#ef1717", "#ff4d4d", "#ff7a18", "#f5a623", "#12b886", "#17c3b2", "#16a8e0", "#4d8cff", "#7656ff", "#9b5cff", "#e548a0", "#8b98a9"];
const THEMES: Array<{ id: BackgroundStyle; label: string }> = [
  { id: "void", label: "Void" }, { id: "carbon", label: "Carbon" },
  { id: "aurora", label: "Aurora" }, { id: "ember", label: "Ember" },
  { id: "glacier", label: "Glacier" }, { id: "nebula", label: "Nebula" },
];
type SettingsTab = "general" | "design" | "advanced";

function normalizeSettings(settings: LauncherSettings): LauncherSettings {
  return {
    ...settings,
    accent_color: settings.accent_color || DEFAULT_DESIGN.accent_color,
    memory_mb: Number.isFinite(settings.memory_mb) ? settings.memory_mb : 4096,
    java_path: settings.java_path ?? null,
    close_on_launch: Boolean(settings.close_on_launch),
    background_style: settings.background_style || DEFAULT_DESIGN.background_style,
    ui_density: settings.ui_density || DEFAULT_DESIGN.ui_density,
    reduced_motion: Boolean(settings.reduced_motion),
    glow_intensity: Number.isFinite(settings.glow_intensity) ? settings.glow_intensity : DEFAULT_DESIGN.glow_intensity,
    backend_url: settings.backend_url || "http://31.70.89.55:25614/api/v1",
    panel_style: settings.panel_style || DEFAULT_DESIGN.panel_style,
    corner_style: settings.corner_style || DEFAULT_DESIGN.corner_style,
    sidebar_labels: Boolean(settings.sidebar_labels),
    skin_scale: Number.isFinite(settings.skin_scale) ? settings.skin_scale : 100,
    skin_pose: settings.skin_pose || "hero",
    skin_animation: settings.skin_animation !== false,
    secondary_accent: settings.secondary_accent || DEFAULT_DESIGN.secondary_accent,
    surface_opacity: Number.isFinite(settings.surface_opacity) ? settings.surface_opacity : DEFAULT_DESIGN.surface_opacity,
    background_motion: settings.background_motion !== false,
  };
}

export function SettingsPage() {
  const { snapshot, busy, updateSettings, openGameDirectory } = useLauncherStore();
  const initial = useMemo(() => snapshot ? normalizeSettings(snapshot.settings) : null, [snapshot]);
  const [form, setForm] = useState<LauncherSettings | null>(initial);
  const [tab, setTab] = useState<SettingsTab>("general");
  const [designMessage, setDesignMessage] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (initial) setForm(initial); }, [initial]);
  useEffect(() => {
    if (!form) return;
    document.documentElement.style.setProperty("--accent", form.accent_color);
    document.documentElement.style.setProperty("--glow-strength", `${form.glow_intensity / 100}`);
    document.documentElement.style.setProperty("--accent-secondary", form.secondary_accent);
    document.documentElement.style.setProperty("--surface-opacity", `${form.surface_opacity / 100}`);
  }, [form]);

  if (!snapshot || !form) return <div className="page"><div className="panel settings-loading">Einstellungen werden geladen…</div></div>;

  const resetDesign = () => {
    setForm({ ...form, ...DEFAULT_DESIGN });
    setDesignMessage("Design wurde auf den S9Lab-Standard zurückgesetzt. Zum Übernehmen speichern.");
  };

  const saveDesign = async () => {
    await updateSettings(form);
    setDesignMessage("Design wurde dauerhaft gespeichert.");
  };

  const exportDesign = () => {
    const preset = createDesignPreset(form);
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/x-s9lab-design+json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${preset.name.replace(/[^a-z0-9-_]/gi, "-")}.designs9c`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDesignMessage("Design als .designs9c exportiert.");
  };

  const importDesign = async (file: File) => {
    try {
      const parsed = parseDesignPreset(await file.text());
      setForm({ ...form, ...DEFAULT_DESIGN, ...parsed.design });
      setDesignMessage("Design importiert. Klicke auf Speichern, um es dauerhaft zu übernehmen.");
    } catch (error) {
      setDesignMessage(error instanceof Error ? error.message : "Design konnte nicht importiert werden.");
    }
  };

  return (
    <div className="page settings-page">
      <header className="page-header"><div><span className="eyebrow">LAUNCHER STUDIO</span><h1>Einstellungen</h1><p>Design, Performance und Startverhalten zentral verwalten.</p></div></header>

      <div className="settings-tabs" role="tablist">
        <button className={tab === "general" ? "settings-tab settings-tab--active" : "settings-tab"} onClick={() => setTab("general")}><SlidersHorizontal size={14} /> GENERAL</button>
        <button className={tab === "design" ? "settings-tab settings-tab--active" : "settings-tab"} onClick={() => setTab("design")}><Palette size={14} /> DESIGN</button>
        <button className={tab === "advanced" ? "settings-tab settings-tab--active" : "settings-tab"} onClick={() => setTab("advanced")}><Gauge size={14} /> ADVANCED</button>
      </div>

      {tab === "general" && <section className="settings-grid">
        <div className="panel settings-section">
          <h2>Spiel</h2>
          <label><span>Minecraft-Version</span><input className="text-input" value={form.game_version} readOnly /></label>
          <label><span>Spielordner</span><div className="input-with-button"><input className="text-input" value={form.game_directory} readOnly /><button className="icon-button" onClick={() => void openGameDirectory()}><FolderOpen size={17} /></button></div></label>
        </div>
        <div className="panel settings-section">
          <h2>Startverhalten</h2>
          <label className="toggle-row"><div><strong>Launcher nach Start ausblenden</strong><small>Das Fenster erscheint wieder, sobald Minecraft beendet wird.</small></div><input type="checkbox" checked={form.close_on_launch} onChange={(event) => setForm({ ...form, close_on_launch: event.target.checked })} /></label>
          <label className="toggle-row"><div><strong>Bewegungen reduzieren</strong><small>Reduziert Übergänge und Hintergrundeffekte.</small></div><input type="checkbox" checked={form.reduced_motion} onChange={(event) => setForm({ ...form, reduced_motion: event.target.checked })} /></label>
          <label className="toggle-row"><div><strong>Sidebar mit Text</strong><small>Zeigt neben den Icons eindeutige Bezeichnungen.</small></div><input type="checkbox" checked={form.sidebar_labels} onChange={(event) => setForm({ ...form, sidebar_labels: event.target.checked })} /></label>
        </div>
      </section>}

      {tab === "design" && <>
        <div className="design-actionbar panel">
          <div><strong>Design-Profil</strong><span>Speichern, zurücksetzen oder als eigene Datei teilen.</span></div>
          <div className="design-actionbar__buttons">
            <button className="button" onClick={resetDesign}><RefreshCcw size={15}/> Reset</button>
            <button className="button" onClick={() => importRef.current?.click()}><Upload size={15}/> Importieren</button>
            <button className="button" onClick={exportDesign}><Download size={15}/> .designs9c</button>
            <button className="button button--primary" onClick={() => void saveDesign()} disabled={busy}><Save size={15}/> Speichern</button>
            <input ref={importRef} hidden type="file" accept=".designs9c,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importDesign(file); event.target.value = ""; }} />
          </div>
        </div>
        {designMessage && <div className="design-message">{designMessage}</div>}
        <section className="settings-grid">
          <div className="panel settings-section settings-section--wide">
            <h2><Palette size={18} /> Akzentfarben</h2>
            <p className="section-copy">Die Hauptfarbe wird sofort dargestellt und beim Speichern dauerhaft übernommen.</p>
            <div className="accent-picker">
              {ACCENTS.map((color) => <button key={color} aria-label={color} title={color} className={form.accent_color.toLowerCase() === color ? "accent-dot accent-dot--active" : "accent-dot"} style={{ background: color }} onClick={() => setForm({ ...form, accent_color: color })} />)}
              <label className="custom-color"><input type="color" value={form.accent_color} onChange={(event) => setForm({ ...form, accent_color: event.target.value })} /><span>Custom</span><b>{form.accent_color}</b></label>
            </div>
            <label><span>Zweite Akzentfarbe</span><input type="color" value={form.secondary_accent} onChange={(event) => setForm({ ...form, secondary_accent: event.target.value })} /></label>
          </div>

          <div className="panel settings-section settings-section--wide">
            <h2>Hintergrundwelt</h2>
            <div className="theme-grid">{THEMES.map((theme) => <button key={theme.id} className={form.background_style === theme.id ? `theme-card theme-card--active theme-card--${theme.id}` : `theme-card theme-card--${theme.id}`} onClick={() => setForm({ ...form, background_style: theme.id })}><i/><span>{theme.label}</span></button>)}</div>
          </div>

          <div className="panel settings-section">
            <h2>Oberflächenstil</h2>
            <label><span>Panels</span><div className="segmented-control">{(["glass", "solid", "outline"] as PanelStyle[]).map((value) => <button key={value} className={form.panel_style === value ? "active" : ""} onClick={() => setForm({ ...form, panel_style: value })}>{value}</button>)}</div></label>
            <label><span>Ecken</span><div className="segmented-control">{(["sharp", "soft", "round"] as CornerStyle[]).map((value) => <button key={value} className={form.corner_style === value ? "active" : ""} onClick={() => setForm({ ...form, corner_style: value })}>{value}</button>)}</div></label>
            <label><span>Abstände</span><div className="segmented-control"><button className={form.ui_density === "compact" ? "active" : ""} onClick={() => setForm({ ...form, ui_density: "compact" })}>compact</button><button className={form.ui_density === "comfortable" ? "active" : ""} onClick={() => setForm({ ...form, ui_density: "comfortable" })}>comfortable</button></div></label>
          </div>

          <div className="panel settings-section">
            <h2>Effekte</h2>
            <label><span>Glow-Intensität <b>{form.glow_intensity}%</b></span><input type="range" min="0" max="100" step="5" value={form.glow_intensity} onChange={(event) => setForm({ ...form, glow_intensity: Number(event.target.value) })} /></label>
            <label><span>Panel-Deckkraft <b>{form.surface_opacity}%</b></span><input type="range" min="45" max="100" step="5" value={form.surface_opacity} onChange={(event) => setForm({ ...form, surface_opacity: Number(event.target.value) })} /></label>
            <label className="toggle-row"><div><strong>Animierter Hintergrund</strong><small>Schaltet die dezenten Hintergrundbewegungen separat.</small></div><input type="checkbox" checked={form.background_motion} onChange={(event) => setForm({ ...form, background_motion: event.target.checked })} /></label>
          </div>
        </section>
      </>}

      {tab === "advanced" && <section className="settings-grid">
        <div className="panel settings-section settings-section--wide">
          <h2>Performance</h2>
          <label><span>Arbeitsspeicher <b>{form.memory_mb} MB</b></span><input type="range" min="2048" max="16384" step="512" value={form.memory_mb} onChange={(event) => setForm({ ...form, memory_mb: Number(event.target.value) })} /></label>
          <label><span>Java-21-Pfad <small>Leer lassen für automatische Erkennung</small></span><input className="text-input" value={form.java_path ?? ""} placeholder="C:\\Program Files\\Java\\jdk-21\\bin\\java.exe" onChange={(event) => setForm({ ...form, java_path: event.target.value || null })} /></label>
        </div>
      </section>}

      {tab !== "design" && <button className="button button--primary settings-save" onClick={() => void updateSettings(form)} disabled={busy}><Save size={17} /> Einstellungen speichern</button>}
    </div>
  );
}
