import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  Account,
  ClientStatus,
  InstallProgress,
  LauncherSettings,
  LauncherSnapshot,
  LaunchStatus,
  LogEvent,
  MicrosoftDeviceCode,
} from "../types";


export interface PendingDesignImport {
  path: string;
  file_name: string;
  content: string;
}

export const commands = {
  bootstrap: () => invoke<LauncherSnapshot>("bootstrap"),
  startLogin: () => invoke<MicrosoftDeviceCode>("start_microsoft_login"),
  completeLogin: (code: MicrosoftDeviceCode) =>
    invoke<Account>("complete_microsoft_login", {
      deviceCode: code.device_code,
      interval: code.interval,
      expiresIn: code.expires_in,
    }),
  selectAccount: (accountId: string) => invoke<Account>("select_account", { accountId }),
  removeAccount: (accountId: string) => invoke<void>("remove_account", { accountId }),
  saveSettings: (settings: LauncherSettings) => invoke<LauncherSettings>("save_settings", { settings }),
  installClient: (repair = false) => invoke<ClientStatus>("install_client", { repair }),
  getClientStatus: () => invoke<ClientStatus>("get_client_status"),
  launchClient: (accountId: string) => invoke<LaunchStatus>("launch_client", { accountId }),
  stopClient: () => invoke<LaunchStatus>("stop_client"),
  getLaunchStatus: () => invoke<LaunchStatus>("get_launch_status"),
  readLogs: (limit = 500) => invoke<string[]>("read_launcher_logs", { limit }),
  openGameDirectory: () => invoke<void>("open_game_directory"),
  pendingDesignImport: () => invoke<PendingDesignImport | null>("pending_design_import"),
  fetchPlayerSkin: (accountId: string, username: string) => invoke<string>("fetch_player_skin", { accountId, username }),
  windowMinimize: () => invoke<void>("window_minimize"),
  windowToggleMaximize: () => invoke<void>("window_toggle_maximize"),
  windowClose: () => invoke<void>("window_close"),
  windowStartDragging: () => invoke<void>("window_start_dragging"),
};

export const events = {
  installProgress: (handler: (event: InstallProgress) => void): Promise<UnlistenFn> =>
    listen<InstallProgress>("install-progress", ({ payload }) => handler(payload)),
  launchLog: (handler: (event: LogEvent) => void): Promise<UnlistenFn> =>
    listen<LogEvent>("launch-log", ({ payload }) => handler(payload)),
  launchStatus: (handler: (event: LaunchStatus) => void): Promise<UnlistenFn> =>
    listen<LaunchStatus>("launch-status", ({ payload }) => handler(payload)),
};
