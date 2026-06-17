use crate::{
    app::paths::GamePaths,
    error::{AppError, AppResult},
    logging,
};
use reqwest::{Client, Url};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};
use tokio::io::AsyncWriteExt;

const CLIENT_FILE: &str = "s9labclient-1.0-SNAPSHOT.jar";
const ETAG_FILE: &str = ".s9lab-client-etag";
const CONFIG_RAW: &str = include_str!("../../client-update.json");

#[derive(Debug, Clone, Deserialize)]
struct ClientUpdateConfig {
    enabled: bool,
    url: String,
    #[serde(default = "default_timeout")]
    timeout_seconds: u64,
    #[serde(default)]
    allow_insecure_http: bool,
}

#[derive(Debug, Clone)]
pub struct ClientUpdateResult {
    pub updated: bool,
    pub hash: String,
}

fn default_timeout() -> u64 {
    45
}

pub async fn sync_latest(game: &GamePaths) -> AppResult<ClientUpdateResult> {
    let config: ClientUpdateConfig = serde_json::from_str(CONFIG_RAW)?;
    let target = game.mods.join(CLIENT_FILE);
    if !config.enabled || config.url.contains("CHANGE_ME") {
        return Ok(ClientUpdateResult {
            updated: false,
            hash: file_sha256_optional(&target)?.unwrap_or_default(),
        });
    }

    let url = Url::parse(&config.url)
        .map_err(|_| AppError::Message("Ungültige Client-Update-URL".into()))?;
    if url.scheme() != "https" && !(config.allow_insecure_http && url.scheme() == "http") {
        return Err(AppError::Message(
            "Client-Updates benötigen HTTPS. HTTP muss ausdrücklich freigeschaltet werden.".into(),
        ));
    }

    fs::create_dir_all(&game.mods)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(config.timeout_seconds.clamp(10, 180)))
        .user_agent("S9Lab-Launcher-Client-Updater/1.0")
        .build()?;

    let etag_path = game.mods.join(ETAG_FILE);
    let stored_etag = fs::read_to_string(&etag_path)
        .ok()
        .map(|value| value.trim().to_string());
    if target.exists() {
        if let Ok(response) = client.head(url.clone()).send().await {
            if response.status().is_success() {
                let remote_etag = response
                    .headers()
                    .get(reqwest::header::ETAG)
                    .and_then(|value| value.to_str().ok())
                    .map(str::to_string);
                if remote_etag.is_some() && remote_etag == stored_etag {
                    return Ok(ClientUpdateResult {
                        updated: false,
                        hash: file_sha256(&target)?,
                    });
                }
            }
        }
    }

    logging::append("Prüfe S9Lab Client-Datei auf Updates")?;
    let response = client.get(url).send().await?.error_for_status()?;
    let remote_etag = response
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let bytes = response.bytes().await?;
    if bytes.len() < 32_768 || !bytes.starts_with(b"PK") {
        return Err(AppError::Message(
            "Die heruntergeladene Client-Datei ist keine gültige JAR.".into(),
        ));
    }

    let remote_hash = bytes_sha256(&bytes);
    if target.exists() && file_sha256(&target)? == remote_hash {
        if let Some(etag) = remote_etag {
            write_atomic(&etag_path, etag.as_bytes()).await?;
        }
        return Ok(ClientUpdateResult {
            updated: false,
            hash: remote_hash,
        });
    }

    let temp = target.with_extension("jar.download");
    let backup = target.with_extension("jar.backup");
    {
        let mut file = tokio::fs::File::create(&temp).await?;
        file.write_all(&bytes).await?;
        file.flush().await?;
    }
    if file_sha256(&temp)? != remote_hash {
        let _ = fs::remove_file(&temp);
        return Err(AppError::Message(
            "SHA-256-Prüfung der Client-JAR ist fehlgeschlagen.".into(),
        ));
    }
    if backup.exists() {
        fs::remove_file(&backup)?;
    }
    if target.exists() {
        fs::rename(&target, &backup)?;
    }
    if let Err(error) = fs::rename(&temp, &target) {
        if backup.exists() {
            let _ = fs::rename(&backup, &target);
        }
        return Err(error.into());
    }
    if let Some(etag) = remote_etag {
        write_atomic(&etag_path, etag.as_bytes()).await?;
    }
    logging::append(&format!("S9Lab Client aktualisiert: SHA-256 {remote_hash}"))?;
    Ok(ClientUpdateResult {
        updated: true,
        hash: remote_hash,
    })
}

async fn write_atomic(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let temp = path.with_extension("tmp");
    tokio::fs::write(&temp, bytes).await?;
    if path.exists() {
        tokio::fs::remove_file(path).await?;
    }
    tokio::fs::rename(temp, path).await?;
    Ok(())
}
fn bytes_sha256(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
fn file_sha256(path: &Path) -> AppResult<String> {
    Ok(hex::encode(Sha256::digest(fs::read(path)?)))
}
fn file_sha256_optional(path: &PathBuf) -> AppResult<Option<String>> {
    if path.exists() {
        Ok(Some(file_sha256(path)?))
    } else {
        Ok(None)
    }
}
