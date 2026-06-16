import type { LauncherSettings } from "../types";

export type DesignValues = Pick<LauncherSettings,
  "accent_color" | "secondary_accent" | "background_style" | "ui_density" |
  "reduced_motion" | "glow_intensity" | "panel_style" | "corner_style" |
  "sidebar_labels" | "surface_opacity" | "background_motion"
>;

export type DesignPreset = {
  format: "S9LAB_DESIGN";
  version: 1;
  name: string;
  createdAt: string;
  design: DesignValues;
};

export const DEFAULT_DESIGN: DesignValues = {
  accent_color: "#ef1717",
  secondary_accent: "#7c5cff",
  background_style: "void",
  ui_density: "comfortable",
  reduced_motion: false,
  glow_intensity: 65,
  panel_style: "glass",
  corner_style: "soft",
  sidebar_labels: false,
  surface_opacity: 82,
  background_motion: true,
};

const THEMES = new Set(["void", "carbon", "aurora", "ember", "glacier", "nebula"]);
const DENSITIES = new Set(["compact", "comfortable"]);
const PANELS = new Set(["glass", "solid", "outline"]);
const CORNERS = new Set(["sharp", "soft", "round"]);
const HEX = /^#[0-9a-f]{6}$/i;

function color(value: unknown, fallback: string): string {
  const candidate = String(value ?? "").trim();
  return HEX.test(candidate) ? candidate.toLowerCase() : fallback;
}

function choice(value: unknown, allowed: Set<string>, fallback: string): string {
  const candidate = String(value ?? "").trim().toLowerCase();
  return allowed.has(candidate) ? candidate : fallback;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function extractDesign(settings: LauncherSettings): DesignValues {
  const {
    accent_color,
    secondary_accent,
    background_style,
    ui_density,
    reduced_motion,
    glow_intensity,
    panel_style,
    corner_style,
    sidebar_labels,
    surface_opacity,
    background_motion,
  } = settings;

  return {
    accent_color,
    secondary_accent,
    background_style,
    ui_density,
    reduced_motion,
    glow_intensity,
    panel_style,
    corner_style,
    sidebar_labels,
    surface_opacity,
    background_motion,
  };
}

export function createDesignPreset(settings: LauncherSettings): DesignPreset {
  return {
    format: "S9LAB_DESIGN",
    version: 1,
    name: `S9Lab-${settings.background_style}`,
    createdAt: new Date().toISOString(),
    design: extractDesign(settings),
  };
}

export function parseDesignPreset(text: string): DesignPreset {
  if (text.length > 65536) {
    throw new Error("Die Designdatei ist zu groß.");
  }

  let parsed: Partial<DesignPreset>;
  try {
    parsed = JSON.parse(text) as Partial<DesignPreset>;
  } catch {
    throw new Error("Die .designs9c-Datei enthält kein gültiges Design.");
  }

  if (parsed.format !== "S9LAB_DESIGN" || parsed.version !== 1 || !parsed.design) {
    throw new Error("Ungültige oder nicht unterstützte .designs9c-Datei.");
  }

  const raw = parsed.design as Record<string, unknown>;
  const design: DesignValues = {
    accent_color: color(raw.accent_color, DEFAULT_DESIGN.accent_color),
    secondary_accent: color(raw.secondary_accent, DEFAULT_DESIGN.secondary_accent),
    background_style: choice(raw.background_style, THEMES, DEFAULT_DESIGN.background_style) as DesignValues["background_style"],
    ui_density: choice(raw.ui_density, DENSITIES, DEFAULT_DESIGN.ui_density) as DesignValues["ui_density"],
    reduced_motion: bool(raw.reduced_motion, DEFAULT_DESIGN.reduced_motion),
    glow_intensity: numberInRange(raw.glow_intensity, DEFAULT_DESIGN.glow_intensity, 0, 100),
    panel_style: choice(raw.panel_style, PANELS, DEFAULT_DESIGN.panel_style) as DesignValues["panel_style"],
    corner_style: choice(raw.corner_style, CORNERS, DEFAULT_DESIGN.corner_style) as DesignValues["corner_style"],
    sidebar_labels: bool(raw.sidebar_labels, DEFAULT_DESIGN.sidebar_labels),
    surface_opacity: numberInRange(raw.surface_opacity, DEFAULT_DESIGN.surface_opacity, 45, 100),
    background_motion: bool(raw.background_motion, DEFAULT_DESIGN.background_motion),
  };

  return {
    format: "S9LAB_DESIGN",
    version: 1,
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 64) : "S9Lab Design",
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    design,
  };
}
