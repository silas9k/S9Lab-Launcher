use std::path::PathBuf;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
    #[error("Dateifehler: {0}")]
    Io(#[from] std::io::Error),
    #[error("Netzwerkfehler: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Ungültige Daten: {0}")]
    Json(#[from] serde_json::Error),
    #[error("ZIP-Fehler: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("Account wurde nicht gefunden: {0}")]
    AccountNotFound(String),
    #[error("S9Lab Client ist noch nicht installiert")]
    ClientNotInstalled,
    #[error("Java 21 wurde nicht gefunden. Installiere Java 21 oder hinterlege den Pfad in den Einstellungen.")]
    JavaNotFound,
    #[error("Minecraft läuft bereits")]
    AlreadyRunning,
    #[error("Datei-Prüfsumme stimmt nicht: {path:?}")]
    HashMismatch { path: PathBuf },
}

impl From<keyring::Error> for AppError {
    fn from(value: keyring::Error) -> Self {
        Self::Message(format!("Windows-Anmeldeinformationsspeicher: {value}"))
    }
}
