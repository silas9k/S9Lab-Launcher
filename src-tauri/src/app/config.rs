const SETTINGS_VERSION: u32 = 1;

use crate::{app::paths, error::AppResult};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

pub const DEFAULT_GAME_VERSION: &str = "1.21.11";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LauncherSettings {
    #[serde(default = "default_settings_version")]
    pub settings_version: u32,
    #[serde(default)]
    pub ultimate_installer_mode: bool,

    pub game_version: String,
    pub memory_mb: u32,
    pub java_path: Option<String>,
    pub game_directory: String,
    pub close_on_launch: bool,

    #[serde(default = "default_accent_color")]
    pub accent_color: String,
    #[serde(default = "default_background_style")]
    pub background_style: String,
    #[serde(default = "default_ui_density")]
    pub ui_density: String,

    #[serde(default)]
    pub reduced_motion: bool,

    #[serde(default = "default_glow_intensity")]
    pub glow_intensity: u8,

    #[serde(default = "default_backend_url")]
    pub backend_url: String,

    #[serde(default = "default_panel_style")]
    pub panel_style: String,
    #[serde(default = "default_corner_style")]
    pub corner_style: String,

    #[serde(default)]
    pub sidebar_labels: bool,

    #[serde(default = "default_skin_scale")]
    pub skin_scale: u16,

    #[serde(default = "default_skin_pose")]
    pub skin_pose: String,

    #[serde(default = "default_true")]
    pub skin_animation: bool,

    #[serde(default = "default_secondary_accent")]
    pub secondary_accent: String,

    #[serde(default = "default_surface_opacity")]
    pub surface_opacity: u8,

    #[serde(default = "default_true")]
    pub background_motion: bool,
}

impl LauncherSettings {
    pub fn defaults() -> AppResult<Self> {
        Ok(Self {
            settings_version: SETTINGS_VERSION,
            ultimate_installer_mode: false,
            game_version: DEFAULT_GAME_VERSION.to_string(),
            memory_mb: 4096,
            java_path: None,
            game_directory: paths::default_game_directory()?
                .to_string_lossy()
                .to_string(),
            close_on_launch: false,

            accent_color: default_accent_color(),
            background_style: default_background_style(),
            ui_density: default_ui_density(),

            reduced_motion: false,
            glow_intensity: default_glow_intensity(),

            backend_url: default_backend_url(),
            panel_style: default_panel_style(),
            corner_style: default_corner_style(),

            sidebar_labels: false,
            skin_scale: default_skin_scale(),
            skin_pose: default_skin_pose(),
            skin_animation: true,
            secondary_accent: default_secondary_accent(),
            surface_opacity: default_surface_opacity(),
            background_motion: true,
        })
    }

    fn normalize(mut self) -> AppResult<Self> {
        self.memory_mb = self.memory_mb.clamp(2048, 16384);

        if self.accent_color.len() != 7 || !self.accent_color.starts_with('#') {
            self.accent_color = default_accent_color();
        }

        if self.backend_url.trim().is_empty() {
            self.backend_url = default_backend_url();
        }

        self.backend_url = self.backend_url.trim_end_matches('/').to_string();

        Ok(self)
    }
}

// ---------------- DEFAULTS ----------------

fn default_accent_color() -> String {
    "#ef1717".into()
}

fn default_secondary_accent() -> String {
    "#7c5cff".into()
}

fn default_background_style() -> String {
    "void".into()
}

fn default_ui_density() -> String {
    "comfortable".into()
}

fn default_glow_intensity() -> u8 {
    65
}

fn default_surface_opacity() -> u8 {
    82
}

fn default_skin_scale() -> u16 {
    100
}

fn default_panel_style() -> String {
    "glass".into()
}

fn default_corner_style() -> String {
    "soft".into()
}

fn default_skin_pose() -> String {
    "hero".into()
}

fn default_true() -> bool {
    true
}

fn default_backend_url() -> String {
    "http://31.70.89.55:25614/api/v1".into()
}

// ---------------- IO ----------------

pub fn load_settings() -> AppResult<LauncherSettings> {
    let file = paths::launcher_paths()?.settings_file;

    if !file.exists() {
        let defaults = LauncherSettings::defaults()?;
        save_settings(&defaults)?;
        return Ok(defaults);
    }

    let raw = fs::read_to_string(&file)?;
    let json: serde_json::Value = serde_json::from_str(&raw)?;
let migrated = migrate_settings(json);
let parsed: LauncherSettings = serde_json::from_value(migrated)?;

    parsed.normalize()
}

pub fn save_settings(settings: &LauncherSettings) -> AppResult<LauncherSettings> {
    let normalized = settings.clone().normalize()?;
    let file = paths::launcher_paths()?.settings_file;

    let tmp = file.with_extension("tmp");
    fs::write(&tmp, serde_json::to_string_pretty(&normalized)?)?;

    if file.exists() {
        fs::remove_file(&file)?;
    }

    fs::rename(tmp, file)?;

    Ok(normalized)
}
fn default_settings_version() -> u32 {
    SETTINGS_VERSION
}

fn migrate_settings(mut old: serde_json::Value) -> serde_json::Value {
    let version = old.get("settings_version")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    if version < SETTINGS_VERSION {
        // v1 migration
        if version == 0 {
            old["ultimate_installer_mode"] = serde_json::Value::Bool(false);
        }

        old["settings_version"] = serde_json::Value::Number(SETTINGS_VERSION.into());
    }

    old
}
