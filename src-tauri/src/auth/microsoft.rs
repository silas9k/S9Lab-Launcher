use crate::{
    auth::{model::{Account, AccountKind, AccountSession}, store},
    error::{AppError, AppResult},
    logging,
};
use chrono::Utc;
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{Duration, Instant};
use tokio::time::sleep;

pub const MICROSOFT_CLIENT_ID: &str = "e686aebd-d575-4472-b163-b0c54f388f43";
const MICROSOFT_SCOPE: &str = "XboxLive.signin offline_access";
const DEVICE_CODE_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicrosoftDeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    #[serde(default)]
    pub verification_uri_complete: Option<String>,
    pub expires_in: u64,
    #[serde(default = "default_interval")]
    pub interval: u64,
    pub message: String,
}

fn default_interval() -> u64 { 5 }

#[derive(Debug, Deserialize)]
struct MicrosoftTokenResponse {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(rename = "expires_in")]
    _expires_in: i64,
}

#[derive(Debug, Deserialize)]
struct MicrosoftTokenError {
    error: String,
    #[serde(default)]
    error_description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct XboxAuthResponse {
    #[serde(rename = "Token")]
    token: String,
    #[serde(rename = "DisplayClaims")]
    display_claims: XboxDisplayClaims,
}

#[derive(Debug, Deserialize)]
struct XboxDisplayClaims {
    xui: Vec<XboxClaim>,
}

#[derive(Debug, Deserialize)]
struct XboxClaim {
    uhs: String,
    #[serde(default)]
    xid: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MinecraftLoginResponse {
    access_token: String,
    expires_in: i64,
}

#[derive(Debug, Deserialize)]
struct MinecraftProfileResponse {
    id: String,
    name: String,
}

pub async fn start_login() -> AppResult<MicrosoftDeviceCode> {
    let response = http_client()?
        .post(DEVICE_CODE_URL)
        .form(&[("client_id", MICROSOFT_CLIENT_ID), ("scope", MICROSOFT_SCOPE)])
        .send()
        .await?;
    parse_success_json(response, "Microsoft Device-Code").await
}

pub async fn complete_login(device_code: &str, interval: u64, expires_in: u64) -> AppResult<Account> {
    let client = http_client()?;
    let microsoft = poll_microsoft_token(&client, device_code, interval, expires_in).await?;
    let (profile, minecraft, xuid) = exchange_for_minecraft(&client, &microsoft.access_token).await?;
    let now = Utc::now().timestamp();
    let account = Account {
        id: profile.id,
        username: profile.name,
        kind: AccountKind::Microsoft,
        added_at_unix: now,
        last_used_at_unix: now,
    };
    let session = AccountSession {
        microsoft_refresh_token: microsoft.refresh_token,
        minecraft_access_token: minecraft.access_token,
        minecraft_expires_at_unix: now + minecraft.expires_in,
        xuid,
    };
    let saved = store::upsert_account(account, &session)?;
    logging::append(&format!("Microsoft-Account verbunden: {}", saved.username))?;
    Ok(saved)
}

pub async fn ensure_minecraft_session(account_id: &str) -> AppResult<(Account, AccountSession)> {
    let account = store::list_accounts()?
        .into_iter()
        .find(|account| account.id == account_id)
        .ok_or_else(|| AppError::AccountNotFound(account_id.to_string()))?;
    let mut session = store::load_session(account_id)?;
    let now = Utc::now().timestamp();
    if session.minecraft_expires_at_unix > now + 300 {
        let selected = store::select_account(account_id)?;
        return Ok((selected, session));
    }

    let refresh = session.microsoft_refresh_token.clone().ok_or_else(|| {
        AppError::Message("Microsoft-Sitzung ist abgelaufen. Bitte den Account erneut anmelden.".into())
    })?;
    let client = http_client()?;
    let microsoft = refresh_microsoft_token(&client, &refresh).await?;
    let (profile, minecraft, xuid) = exchange_for_minecraft(&client, &microsoft.access_token).await?;
    session.microsoft_refresh_token = microsoft.refresh_token.or(Some(refresh));
    session.minecraft_access_token = minecraft.access_token;
    session.minecraft_expires_at_unix = now + minecraft.expires_in;
    if xuid.is_some() { session.xuid = xuid; }
    store::save_session(account_id, &session)?;
    store::update_account_name(account_id, &profile.name)?;
    let refreshed = Account { username: profile.name, ..account };
    logging::append(&format!("Minecraft-Sitzung erneuert: {}", refreshed.username))?;
    Ok((refreshed, session))
}

fn http_client() -> AppResult<Client> {
    Ok(Client::builder()
        .user_agent("S9Lab-Launcher/1.0.0")
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(50))
        .build()?)
}

async fn poll_microsoft_token(client: &Client, device_code: &str, initial_interval: u64, expires_in: u64) -> AppResult<MicrosoftTokenResponse> {
    let deadline = Instant::now() + Duration::from_secs(expires_in.max(60));
    let mut interval = initial_interval.max(5);
    while Instant::now() < deadline {
        sleep(Duration::from_secs(interval)).await;
        let response = client.post(TOKEN_URL).form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("client_id", MICROSOFT_CLIENT_ID),
            ("device_code", device_code),
        ]).send().await?;
        if response.status().is_success() {
            return Ok(response.json().await?);
        }
        let error: MicrosoftTokenError = response.json().await?;
        match error.error.as_str() {
            "authorization_pending" => continue,
            "slow_down" => { interval += 5; continue; }
            "authorization_declined" => return Err(AppError::Message("Microsoft-Anmeldung wurde abgelehnt.".into())),
            "expired_token" => return Err(AppError::Message("Der Microsoft-Code ist abgelaufen. Bitte erneut starten.".into())),
            _ => return Err(AppError::Message(error.error_description.unwrap_or(error.error))),
        }
    }
    Err(AppError::Message("Microsoft-Anmeldung ist abgelaufen. Bitte erneut versuchen.".into()))
}

async fn refresh_microsoft_token(client: &Client, refresh_token: &str) -> AppResult<MicrosoftTokenResponse> {
    let response = client.post(TOKEN_URL).form(&[
        ("client_id", MICROSOFT_CLIENT_ID),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("scope", MICROSOFT_SCOPE),
    ]).send().await?;
    parse_success_json(response, "Microsoft Token Refresh").await
}

async fn exchange_for_minecraft(client: &Client, microsoft_access_token: &str) -> AppResult<(MinecraftProfileResponse, MinecraftLoginResponse, Option<String>)> {
    let xbl = authenticate_xbox_live(client, microsoft_access_token).await?;
    let xbl_claim = xbl.display_claims.xui.first()
        .ok_or_else(|| AppError::Message("Xbox Live lieferte keinen Benutzer-Hash.".into()))?;
    let user_hash = xbl_claim.uhs.clone();
    let xsts = authorize_xsts(client, &xbl.token).await?;
    let xuid = xsts.display_claims.xui.first().and_then(|claim| claim.xid.clone())
        .or_else(|| xbl_claim.xid.clone());
    let minecraft = login_minecraft(client, &user_hash, &xsts.token).await?;
    let profile = fetch_minecraft_profile(client, &minecraft.access_token).await?;
    Ok((profile, minecraft, xuid))
}

async fn authenticate_xbox_live(client: &Client, microsoft_access_token: &str) -> AppResult<XboxAuthResponse> {
    send_xbox_request(client, "https://user.auth.xboxlive.com/user/authenticate", json!({
        "Properties": {
            "AuthMethod": "RPS",
            "SiteName": "user.auth.xboxlive.com",
            "RpsTicket": format!("d={microsoft_access_token}")
        },
        "RelyingParty": "http://auth.xboxlive.com",
        "TokenType": "JWT"
    })).await
}

async fn authorize_xsts(client: &Client, xbox_token: &str) -> AppResult<XboxAuthResponse> {
    send_xbox_request(client, "https://xsts.auth.xboxlive.com/xsts/authorize", json!({
        "Properties": { "SandboxId": "RETAIL", "UserTokens": [xbox_token] },
        "RelyingParty": "rp://api.minecraftservices.com/",
        "TokenType": "JWT"
    })).await
}

async fn send_xbox_request(client: &Client, url: &str, body: Value) -> AppResult<XboxAuthResponse> {
    let response = client.post(url).json(&body).send().await?;
    let status = response.status();
    let text = response.text().await?;
    if status.is_success() {
        return Ok(serde_json::from_str(&text)?);
    }
    let xerr = serde_json::from_str::<Value>(&text).ok()
        .and_then(|value| value.get("XErr").and_then(Value::as_i64));
    let message = match xerr {
        Some(2148916233) => "Für diesen Microsoft-Account existiert noch kein Xbox-Profil.",
        Some(2148916235) => "Xbox Live ist in der Region dieses Accounts nicht verfügbar.",
        Some(2148916236 | 2148916237) => "Dieser Xbox-Account benötigt eine Altersverifikation.",
        Some(2148916238) => "Kinderaccounts müssen von einem Familienkonto freigegeben werden.",
        _ => "Xbox-/XSTS-Anmeldung ist fehlgeschlagen.",
    };
    Err(AppError::Message(format!("{message} ({status}) {text}")))
}

async fn login_minecraft(client: &Client, user_hash: &str, xsts_token: &str) -> AppResult<MinecraftLoginResponse> {
    let response = client.post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .json(&json!({ "identityToken": format!("XBL3.0 x={user_hash};{xsts_token}") }))
        .send().await?;
    parse_success_json(response, "Minecraft Services Login").await
}

async fn fetch_minecraft_profile(client: &Client, access_token: &str) -> AppResult<MinecraftProfileResponse> {
    let response = client.get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(access_token).send().await?;
    if response.status() == StatusCode::NOT_FOUND {
        return Err(AppError::Message("Dieser Microsoft-Account besitzt kein Minecraft: Java Edition Profil.".into()));
    }
    parse_success_json(response, "Minecraft Profil").await
}

async fn parse_success_json<T: for<'de> Deserialize<'de>>(response: reqwest::Response, label: &str) -> AppResult<T> {
    let status = response.status();
    let body = response.text().await?;
    if !status.is_success() {
        return Err(AppError::Message(format!("{label} fehlgeschlagen ({status}): {body}")));
    }
    Ok(serde_json::from_str(&body)?)
}
