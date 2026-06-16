use crate::{auth::store, error::{AppError, AppResult}};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const CONFIG_RAW: &str = include_str!("../backend-integration.json");

#[derive(Debug, Deserialize)]
struct BackendConfig { base_url: String, #[serde(default)] allow_insecure_http: bool }
#[derive(Debug, Deserialize)]
struct HandshakeResponse { #[serde(rename = "sessionToken")] session_token: String }
#[derive(Debug, Deserialize, Serialize)]
pub struct RewardResult { pub claimed: bool, pub coins: i64, pub message: String }
#[derive(Debug, Deserialize)]
struct RewardResponse { claimed: bool, coins: i64, #[serde(default)] message: String }

#[tauri::command]
pub async fn claim_logo_reward(account_id: String) -> Result<RewardResult, String> {
    claim(&account_id).await.map_err(|error| error.to_string())
}

async fn claim(account_id: &str) -> AppResult<RewardResult> {
    let config: BackendConfig = serde_json::from_str(CONFIG_RAW)?;
    if config.base_url.contains("CHANGE_ME") { return Err(AppError::Message("Backend-URL für den Secret-Reward ist noch nicht konfiguriert.".into())); }
    let base_value = format!("{}/", config.base_url.trim_end_matches('/'));
    let base = Url::parse(&base_value).map_err(|_| AppError::Message("Ungültige Backend-URL".into()))?;
    if base.scheme() != "https" && !(config.allow_insecure_http && base.scheme() == "http") { return Err(AppError::Message("Backend-Verbindung benötigt HTTPS.".into())); }
    let account = store::list_accounts()?.into_iter().find(|account| account.id == account_id).ok_or_else(|| AppError::AccountNotFound(account_id.to_string()))?;
    let uuid = normalize_uuid(&account.id)?;
    let client = reqwest::Client::builder().timeout(Duration::from_secs(15)).user_agent("S9Lab-Launcher/1.0").build()?;
    let handshake: HandshakeResponse = client.post(base.join("handshake").map_err(|_| AppError::Message("Ungültige Handshake-URL".into()))?)
        .json(&serde_json::json!({"uuid": uuid, "name": account.username, "clientVersion": "launcher-1.0"}))
        .send().await?.error_for_status()?.json().await?;
    let response: RewardResponse = client.post(base.join("rewards/logo-secret").map_err(|_| AppError::Message("Ungültige Reward-URL".into()))?)
        .header("X-S9Lab-Session", handshake.session_token).send().await?.error_for_status()?.json().await?;
    Ok(RewardResult { claimed: response.claimed, coins: response.coins, message: if response.message.is_empty() { if response.claimed { "1000 Coins wurden gutgeschrieben.".into() } else { "Dieser Account hat das Secret bereits eingelöst.".into() } } else { response.message } })
}

fn normalize_uuid(value: &str) -> AppResult<String> {
    let compact = value.trim().replace('-', "").to_lowercase();
    if compact.len() != 32 || !compact.chars().all(|character| character.is_ascii_hexdigit()) { return Err(AppError::Message("Ungültige Minecraft-UUID".into())); }
    Ok(format!("{}-{}-{}-{}-{}", &compact[0..8], &compact[8..12], &compact[12..16], &compact[16..20], &compact[20..32]))
}
