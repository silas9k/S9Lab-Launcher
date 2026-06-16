use crate::minecraft::launcher::LaunchStatus;
use std::sync::Arc;
use tokio::{process::Child, sync::{Mutex, RwLock}};

#[derive(Clone)]
pub struct AppState {
    pub child: Arc<Mutex<Option<Child>>>,
    pub launch: Arc<RwLock<LaunchStatus>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            launch: Arc::new(RwLock::new(LaunchStatus::idle())),
        }
    }
}
