use crate::{app::paths, error::AppResult};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

pub const DEFAULT_GAME_VERSION: &str = "1.21.11";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LauncherSettings {
    pub game_version: String,
    pub memory_mb: u32,
    pub java_path: Option<String>,
    pub game_directory: String,
    pub close_on_launch: bool,
    #[serde(default = "default_accent_color")] pub accent_color: String,
    #[serde(default = "default_background_style")] pub background_style: String,
    #[serde(default = "default_ui_density")] pub ui_density: String,
    #[serde(default)] pub reduced_motion: bool,
    #[serde(default = "default_glow_intensity")] pub glow_intensity: u8,
    #[serde(default = "default_backend_url")] pub backend_url: String,
    #[serde(default = "default_panel_style")] pub panel_style: String,
    #[serde(default = "default_corner_style")] pub corner_style: String,
    #[serde(default)] pub sidebar_labels: bool,
    #[serde(default = "default_skin_scale")] pub skin_scale: u16,
    #[serde(default = "default_skin_pose")] pub skin_pose: String,
    #[serde(default = "default_true")] pub skin_animation: bool,
    #[serde(default = "default_secondary_accent")] pub secondary_accent: String,
    #[serde(default = "default_surface_opacity")] pub surface_opacity: u8,
    #[serde(default = "default_true")] pub background_motion: bool,
}

impl LauncherSettings {
    pub fn defaults() -> AppResult<Self> {
        Ok(Self {
            game_version: DEFAULT_GAME_VERSION.to_string(), memory_mb: 4096, java_path: None,
            game_directory: paths::default_game_directory()?.to_string_lossy().to_string(), close_on_launch: false,
            accent_color: default_accent_color(), background_style: default_background_style(), ui_density: default_ui_density(),
            reduced_motion: false, glow_intensity: default_glow_intensity(), backend_url: default_backend_url(),
            panel_style: default_panel_style(), corner_style: default_corner_style(), sidebar_labels: false,
            skin_scale: default_skin_scale(), skin_pose: default_skin_pose(), skin_animation: true,
            secondary_accent: default_secondary_accent(), surface_opacity: default_surface_opacity(), background_motion: true,
        })
    }

    fn normalize(mut self) -> AppResult<Self> {
        self.game_version = DEFAULT_GAME_VERSION.to_string();
        self.memory_mb = self.memory_mb.clamp(2048, 16384);
        self.java_path = self.java_path.and_then(|value| { let value = value.trim().to_string(); (!value.is_empty()).then_some(value) });
        if !is_valid_accent(&self.accent_color) { self.accent_color = default_accent_color(); }
        if !is_valid_accent(&self.secondary_accent) { self.secondary_accent = default_secondary_accent(); }
        if !matches!(self.background_style.as_str(), "void"|"carbon"|"aurora"|"ember"|"glacier"|"nebula") { self.background_style = default_background_style(); }
        if !matches!(self.ui_density.as_str(), "compact"|"comfortable") { self.ui_density = default_ui_density(); }
        if !matches!(self.panel_style.as_str(), "glass"|"solid"|"outline") { self.panel_style = default_panel_style(); }
        if !matches!(self.corner_style.as_str(), "sharp"|"soft"|"round") { self.corner_style = default_corner_style(); }
        if !matches!(self.skin_pose.as_str(), "hero"|"relaxed"|"classic") { self.skin_pose = default_skin_pose(); }
        self.glow_intensity = self.glow_intensity.min(100); self.surface_opacity = self.surface_opacity.clamp(45,100); self.skin_scale = self.skin_scale.clamp(70,140);
        if self.backend_url.trim().is_empty() { self.backend_url = default_backend_url(); }
        self.backend_url = self.backend_url.trim_end_matches('/').to_string();
        if self.game_directory.trim().is_empty() { self.game_directory = paths::default_game_directory()?.to_string_lossy().to_string(); }
        Ok(self)
    }
}

fn default_accent_color()->String{"#ef1717".into()} fn default_secondary_accent()->String{"#7c5cff".into()}
fn default_background_style()->String{"void".into()} fn default_ui_density()->String{"comfortable".into()}
fn default_glow_intensity()->u8{65} fn default_surface_opacity()->u8{82} fn default_skin_scale()->u16{100}
fn default_panel_style()->String{"glass".into()} fn default_corner_style()->String{"soft".into()} fn default_skin_pose()->String{"hero".into()}
fn default_true()->bool{true} fn default_backend_url()->String{"http://31.70.89.55:25614/api/v1".into()}
fn is_valid_accent(value:&str)->bool{value.len()==7&&value.starts_with('#')&&value[1..].chars().all(|c|c.is_ascii_hexdigit())}

pub fn load_settings()->AppResult<LauncherSettings>{let file=paths::launcher_paths()?.settings_file;if !file.exists(){let d=LauncherSettings::defaults()?;save_settings(&d)?;return Ok(d)};let parsed:LauncherSettings=serde_json::from_str(&fs::read_to_string(file)?)?;parsed.normalize()}
pub fn save_settings(settings:&LauncherSettings)->AppResult<LauncherSettings>{let normalized=settings.clone().normalize()?;let file=paths::launcher_paths()?.settings_file;write_atomic(&file,serde_json::to_string_pretty(&normalized)?.as_bytes())?;paths::game_paths(&normalized.game_directory)?;Ok(normalized)}
fn write_atomic(path:&Path,data:&[u8])->AppResult<()>{let temp=path.with_extension("tmp");fs::write(&temp,data)?;if path.exists(){fs::remove_file(path)?;}fs::rename(temp,path)?;Ok(())}
