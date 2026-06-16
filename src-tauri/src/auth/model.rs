use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AccountKind {
    Microsoft,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub username: String,
    pub kind: AccountKind,
    pub added_at_unix: i64,
    pub last_used_at_unix: i64,
}

#[derive(Debug, Clone)]
pub struct AccountSession {
    pub microsoft_refresh_token: Option<String>,
    pub minecraft_access_token: String,
    pub minecraft_expires_at_unix: i64,
    pub xuid: Option<String>,
}
