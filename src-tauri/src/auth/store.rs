use crate::{
    app::paths,
    auth::model::{Account, AccountKind, AccountSession},
    error::{AppError, AppResult},
    logging,
};
use chrono::Utc;
use keyring::Error as KeyringError;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

const SERVICE: &str = "S9Lab Launcher";
const LEGACY_SERVICE: &str = "S9LAB Client Launcher";
const LEGACY_USER: &str = "minecraft_session";
const FIELD_REFRESH: &str = "ms-refresh";
const FIELD_MINECRAFT: &str = "mc-access";
const FIELD_META: &str = "session-meta";

#[derive(Debug, Default, Serialize, Deserialize)]
struct AccountIndex {
    #[serde(default)]
    active_account_id: Option<String>,
    #[serde(default)]
    accounts: Vec<Account>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionMeta {
    minecraft_expires_at_unix: i64,
    #[serde(default)]
    xuid: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LegacyAccount {
    id: String,
    username: String,
}

#[derive(Debug, Deserialize)]
struct LegacySession {
    account: LegacyAccount,
    microsoft_refresh_token: Option<String>,
    minecraft_access_token: String,
    expires_at_unix: i64,
}

fn index_path() -> AppResult<std::path::PathBuf> {
    Ok(paths::launcher_paths()?.accounts_file)
}

fn load_index() -> AppResult<AccountIndex> {
    let path = index_path()?;
    if !path.exists() {
        return Ok(AccountIndex::default());
    }
    let mut index: AccountIndex = serde_json::from_str(&fs::read_to_string(path)?)?;
    index
        .accounts
        .sort_by_key(|account| std::cmp::Reverse(account.last_used_at_unix));
    if index
        .active_account_id
        .as_ref()
        .is_some_and(|id| !index.accounts.iter().any(|account| &account.id == id))
    {
        index.active_account_id = index.accounts.first().map(|account| account.id.clone());
    }
    Ok(index)
}

fn save_index(index: &AccountIndex) -> AppResult<()> {
    let path = index_path()?;
    write_atomic(&path, serde_json::to_string_pretty(index)?.as_bytes())
}

fn entry(account_id: &str, field: &str) -> AppResult<keyring::Entry> {
    Ok(keyring::Entry::new(
        SERVICE,
        &format!("{account_id}:{field}"),
    )?)
}

fn set_secret(account_id: &str, field: &str, value: &str) -> AppResult<()> {
    entry(account_id, field)?.set_password(value)?;
    Ok(())
}

fn get_secret(account_id: &str, field: &str) -> AppResult<Option<String>> {
    match entry(account_id, field)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

fn delete_secret(account_id: &str, field: &str) -> AppResult<()> {
    match entry(account_id, field)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

pub fn list_accounts() -> AppResult<Vec<Account>> {
    migrate_legacy_if_needed()?;
    Ok(load_index()?.accounts)
}

pub fn active_account_id() -> AppResult<Option<String>> {
    migrate_legacy_if_needed()?;
    Ok(load_index()?.active_account_id)
}

pub fn select_account(account_id: &str) -> AppResult<Account> {
    let mut index = load_index()?;
    let account = index
        .accounts
        .iter_mut()
        .find(|account| account.id == account_id)
        .ok_or_else(|| AppError::AccountNotFound(account_id.to_string()))?;
    account.last_used_at_unix = Utc::now().timestamp();
    let selected = account.clone();
    index.active_account_id = Some(account_id.to_string());
    index
        .accounts
        .sort_by_key(|item| std::cmp::Reverse(item.last_used_at_unix));
    save_index(&index)?;
    Ok(selected)
}

pub fn upsert_account(mut account: Account, session: &AccountSession) -> AppResult<Account> {
    save_session(&account.id, session)?;
    let mut index = load_index()?;
    if let Some(existing) = index.accounts.iter_mut().find(|item| item.id == account.id) {
        account.added_at_unix = existing.added_at_unix;
        *existing = account.clone();
    } else {
        index.accounts.push(account.clone());
    }
    index.active_account_id = Some(account.id.clone());
    index
        .accounts
        .sort_by_key(|item| std::cmp::Reverse(item.last_used_at_unix));
    save_index(&index)?;
    Ok(account)
}

pub fn update_account_name(account_id: &str, username: &str) -> AppResult<()> {
    let mut index = load_index()?;
    let account = index
        .accounts
        .iter_mut()
        .find(|account| account.id == account_id)
        .ok_or_else(|| AppError::AccountNotFound(account_id.to_string()))?;
    account.username = username.to_string();
    account.last_used_at_unix = Utc::now().timestamp();
    save_index(&index)
}

pub fn remove_account(account_id: &str) -> AppResult<()> {
    let mut index = load_index()?;
    let old_len = index.accounts.len();
    index.accounts.retain(|account| account.id != account_id);
    if old_len == index.accounts.len() {
        return Err(AppError::AccountNotFound(account_id.to_string()));
    }
    for field in [FIELD_REFRESH, FIELD_MINECRAFT, FIELD_META] {
        delete_secret(account_id, field)?;
    }
    if index.active_account_id.as_deref() == Some(account_id) {
        index.active_account_id = index.accounts.first().map(|account| account.id.clone());
    }
    save_index(&index)
}

pub fn save_session(account_id: &str, session: &AccountSession) -> AppResult<()> {
    if let Some(refresh) = &session.microsoft_refresh_token {
        set_secret(account_id, FIELD_REFRESH, refresh)?;
    }
    set_secret(account_id, FIELD_MINECRAFT, &session.minecraft_access_token)?;
    set_secret(
        account_id,
        FIELD_META,
        &serde_json::to_string(&SessionMeta {
            minecraft_expires_at_unix: session.minecraft_expires_at_unix,
            xuid: session.xuid.clone(),
        })?,
    )?;
    Ok(())
}

pub fn load_session(account_id: &str) -> AppResult<AccountSession> {
    let minecraft_access_token = get_secret(account_id, FIELD_MINECRAFT)?.ok_or_else(|| {
        AppError::Message(
            "Gespeicherte Minecraft-Sitzung fehlt. Bitte Account erneut anmelden.".into(),
        )
    })?;
    let meta_raw = get_secret(account_id, FIELD_META)?.ok_or_else(|| {
        AppError::Message(
            "Gespeicherte Sitzungsdaten fehlen. Bitte Account erneut anmelden.".into(),
        )
    })?;
    let meta: SessionMeta = serde_json::from_str(&meta_raw)?;
    Ok(AccountSession {
        microsoft_refresh_token: get_secret(account_id, FIELD_REFRESH)?,
        minecraft_access_token,
        minecraft_expires_at_unix: meta.minecraft_expires_at_unix,
        xuid: meta.xuid,
    })
}

fn migrate_legacy_if_needed() -> AppResult<()> {
    if index_path()?.exists() {
        return Ok(());
    }
    let legacy_entry = match keyring::Entry::new(LEGACY_SERVICE, LEGACY_USER) {
        Ok(entry) => entry,
        Err(_) => return Ok(()),
    };
    let raw = match legacy_entry.get_password() {
        Ok(raw) if !raw.trim().is_empty() => raw,
        _ => return Ok(()),
    };
    let legacy: LegacySession = match serde_json::from_str(&raw) {
        Ok(session) => session,
        Err(_) => return Ok(()),
    };
    let now = Utc::now().timestamp();
    let account = Account {
        id: legacy.account.id,
        username: legacy.account.username,
        kind: AccountKind::Microsoft,
        added_at_unix: now,
        last_used_at_unix: now,
    };
    let session = AccountSession {
        microsoft_refresh_token: legacy.microsoft_refresh_token,
        minecraft_access_token: legacy.minecraft_access_token,
        minecraft_expires_at_unix: legacy.expires_at_unix,
        xuid: None,
    };
    let _ = upsert_account(account, &session)?;
    let _ = legacy_entry.delete_credential();
    logging::append(
        "Alter Launcher-Account wurde in die neue Mehrfach-Account-Verwaltung übernommen",
    )?;
    Ok(())
}

fn write_atomic(path: &Path, data: &[u8]) -> AppResult<()> {
    let temp = path.with_extension("tmp");
    fs::write(&temp, data)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(temp, path)?;
    Ok(())
}
