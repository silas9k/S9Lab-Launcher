mod app;
mod auth;
mod commands;
mod error;
mod logging;
mod discord_rpc;
mod minecraft;
mod rewards;
use app::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::default())
        .setup(|_| {
            let _ = app::config::load_settings()?;
            let _ = auth::store::list_accounts()?;
            discord_rpc::start();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            rewards::claim_logo_reward,
            commands::start_microsoft_login,
            commands::complete_microsoft_login,
            commands::select_account,
            commands::remove_account,
            commands::save_settings,
            commands::get_client_status,
            commands::install_client,
            commands::launch_client,
            commands::stop_client,
            commands::get_launch_status,
            commands::read_launcher_logs,
            commands::open_game_directory,
            commands::pending_design_import,
            commands::fetch_player_skin,
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            commands::window_start_dragging,
        ])
        .run(tauri::generate_context!())
        .expect("S9Lab Launcher konnte nicht gestartet werden");
}




