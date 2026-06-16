use crate::{auth::store, error::{AppError, AppResult}};
use reqwest::{StatusCode, Url};
use serde::{Deserialize, Serialize};
use std::time::Duration;

const CONFIG_RAW: &str = include_str!("../backend-integration.json");

#[derive(Debug, Deserialize)]
struct BackendConfig { base_url: String, #[serde(default)] allow_insecure_http: bool }
#[derive(Debug, Deserialize, Serialize)]
pub struct RewardResult { pub claimed: bool, pub coins: i64, pub message: String }
#[derive(Debug, Deserialize)]
struct RewardResponse { claimed: bool, coins: i64, #[serde(default)] message: String }

#[tauri::command]
pub async fn claim_logo_reward(account_id: String, session_token: String) -> Result<RewardResult, String> {
    claim(&account_id, &session_token).await.map_err(|error| error.to_string())
}

async fn claim(account_id: &str, session_token: &str) -> AppResult<RewardResult> {
    let config: BackendConfig = serde_json::from_str(CONFIG_RAW)?;
    if config.base_url.contains("CHANGE_ME") {
        return Err(AppError::Message("Backend-URL für den Secret-Reward ist noch nicht konfiguriert.".into()));
    }

    let base_value = format!("{}/", config.base_url.trim_end_matches('/'));
    let base = Url::parse(&base_value).map_err(|_| AppError::Message("Ungültige Backend-URL".into()))?;
    if base.scheme() != "https" && !(config.allow_insecure_http && base.scheme() == "http") {
        return Err(AppError::Message("Backend-Verbindung benötigt HTTPS.".into()));
    }

    store::list_accounts()?
        .into_iter()
        .find(|account| account.id == account_id)
        .ok_or_else(|| AppError::AccountNotFound(account_id.to_string()))?;

    let token = session_token.trim();
    if token.is_empty() {
        return Err(AppError::Message("Die Backend-Session ist ungültig. Bitte den Account erneut auswählen.".into()));
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("S9Lab-Launcher/1.0")
        .build()?;
    let response = client
        .post(base.join("rewards/logo-secret").map_err(|_| AppError::Message("Ungültige Reward-URL".into()))?)
        .header("X-S9Lab-Session", token)
        .send()
        .await?;

    if response.status() == StatusCode::UNAUTHORIZED || response.status() == StatusCode::FORBIDDEN {
        return Err(AppError::Message("Die Backend-Session ist ungültig oder abgelaufen. Bitte den Account erneut auswählen.".into()));
    }

    let response: RewardResponse = response.error_for_status()?.json().await?;
    let message = if response.message.is_empty() {
        if response.claimed {
            "1000 Coins wurden gutgeschrieben.".into()
        } else {
            "Dieser Account hat das Secret bereits eingelöst.".into()
        }
    } else {
        response.message
    };

    Ok(RewardResult { claimed: response.claimed, coins: response.coins, message })
}
