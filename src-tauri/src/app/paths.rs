use crate::error::{AppError, AppResult};
use std::{fs, path::PathBuf};

#[derive(Debug, Clone)]
pub struct LauncherPaths {
    pub root: PathBuf,
    pub settings_file: PathBuf,
    pub accounts_file: PathBuf,
    pub log_file: PathBuf,
    pub installation_file: PathBuf,
}

#[derive(Debug, Clone)]
pub struct GamePaths {
    pub root: PathBuf,
    pub assets: PathBuf,
    pub libraries: PathBuf,
    pub versions: PathBuf,
    pub natives: PathBuf,
    pub mods: PathBuf,
    pub logs: PathBuf,
}

pub fn launcher_paths() -> AppResult<LauncherPaths> {
    let data = dirs::data_dir()
        .or_else(dirs::data_local_dir)
        .ok_or_else(|| AppError::Message("Windows-AppData konnte nicht ermittelt werden.".into()))?;
    let root = data.join("S9Lab Launcher");
    fs::create_dir_all(&root)?;
    Ok(LauncherPaths {
        settings_file: root.join("settings.json"),
        accounts_file: root.join("accounts.json"),
        log_file: root.join("launcher.log"),
        installation_file: root.join("installation.json"),
        root,
    })
}

pub fn default_game_directory() -> AppResult<PathBuf> {
    Ok(launcher_paths()?.root.join("minecraft"))
}

pub fn game_paths(root: impl Into<PathBuf>) -> AppResult<GamePaths> {
    let root = root.into();
    let paths = GamePaths {
        assets: root.join("assets"),
        libraries: root.join("libraries"),
        versions: root.join("versions"),
        natives: root.join("natives"),
        mods: root.join("mods"),
        logs: root.join("logs"),
        root,
    };
    for dir in [
        &paths.root,
        &paths.assets,
        &paths.libraries,
        &paths.versions,
        &paths.natives,
        &paths.mods,
        &paths.logs,
    ] {
        fs::create_dir_all(dir)?;
    }
    Ok(paths)
}
