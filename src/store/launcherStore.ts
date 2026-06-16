import { create } from "zustand";
import { commands, events } from "../lib/commands";
import { cleanError } from "../lib/format";
import type {
  Account,
  InstallProgress,
  LauncherSettings,
  LauncherSnapshot,
  LogEvent,
  MicrosoftDeviceCode,
} from "../types";

type Page = "home" | "accounts" | "settings" | "logs" | "friends" | "shop";

interface LauncherStore {
  page: Page;
  snapshot: LauncherSnapshot | null;
  initialized: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  deviceCode: MicrosoftDeviceCode | null;
  installProgress: InstallProgress | null;
  logs: LogEvent[];
  setPage: (page: Page) => void;
  clearMessage: () => void;
  bootstrap: () => Promise<void>;
  beginLogin: () => Promise<void>;
  finishLogin: () => Promise<void>;
  cancelLogin: () => void;
  selectAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  updateSettings: (settings: LauncherSettings) => Promise<void>;
  install: (repair?: boolean) => Promise<void>;
  launch: () => Promise<void>;
  stop: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  openGameDirectory: () => Promise<void>;
}

let eventsRegistered = false;

function updateSnapshot(
  current: LauncherSnapshot | null,
  patch: Partial<LauncherSnapshot>,
): LauncherSnapshot | null {
  return current ? { ...current, ...patch } : current;
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
  page: "home",
  snapshot: null,
  initialized: false,
  busy: false,
  error: null,
  notice: null,
  deviceCode: null,
  installProgress: null,
  logs: [],

  setPage: (page) => set({ page }),
  clearMessage: () => set({ error: null, notice: null }),

  bootstrap: async () => {
    set({ busy: true, error: null });
    try {
      if (!eventsRegistered) {
        eventsRegistered = true;
        await Promise.all([
          events.installProgress((progress) => set({ installProgress: progress })),
          events.launchLog((event) => {
            if (event.stream !== "stdout" && event.stream !== "stderr") return;
            set((state) => ({ logs: [...state.logs.slice(-999), event] }));
          }),
          events.launchStatus((launch) =>
            set((state) => ({ snapshot: updateSnapshot(state.snapshot, { launch }) })),
          ),
        ]);
      }
      const snapshot = await commands.bootstrap();
      set({ snapshot, initialized: true });
    } catch (error) {
      set({ error: cleanError(error), initialized: true });
    } finally {
      set({ busy: false });
    }
  },

  beginLogin: async () => {
    set({ busy: true, error: null, notice: null });
    try {
      const deviceCode = await commands.startLogin();
      set({ deviceCode });
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  finishLogin: async () => {
    const code = get().deviceCode;
    if (!code) return;
    set({ busy: true, error: null });
    try {
      const account = await commands.completeLogin(code);
      const snapshot = await commands.bootstrap();
      set({
        snapshot,
        deviceCode: null,
        notice: `${account.username} wurde sicher hinzugefügt.`,
        page: "accounts",
      });
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  cancelLogin: () => set({ deviceCode: null }),

  selectAccount: async (id) => {
    set({ busy: true, error: null });
    try {
      const account = await commands.selectAccount(id);
      set((state) => ({
        snapshot: updateSnapshot(state.snapshot, { active_account_id: account.id }),
        notice: `${account.username} ist jetzt aktiv.`,
      }));
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  removeAccount: async (id) => {
    set({ busy: true, error: null });
    try {
      await commands.removeAccount(id);
      const snapshot = await commands.bootstrap();
      set({ snapshot, notice: "Account wurde entfernt." });
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  updateSettings: async (settings) => {
    set({ busy: true, error: null });
    try {
      const saved = await commands.saveSettings(settings);
      const client = await commands.getClientStatus();
      set((state) => ({
        snapshot: updateSnapshot(state.snapshot, { settings: saved, client }),
        notice: "Einstellungen gespeichert.",
      }));
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  install: async (repair = false) => {
    set({ busy: true, error: null, installProgress: null });
    try {
      const client = await commands.installClient(repair);
      set((state) => ({
        snapshot: updateSnapshot(state.snapshot, { client }),
        notice: repair ? "Client wurde repariert." : "Client ist startbereit.",
      }));
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  launch: async () => {
    const snapshot = get().snapshot;
    const accountId = snapshot?.active_account_id;
    if (!accountId) {
      set({ error: "Wähle zuerst einen Microsoft-Account aus.", page: "accounts" });
      return;
    }
    set({ busy: true, error: null, logs: [], installProgress: null });
    try {
      let latestSnapshot = get().snapshot;
      if (!latestSnapshot?.client.installed) {
        const client = await commands.installClient(false);
        set((state) => ({ snapshot: updateSnapshot(state.snapshot, { client }) }));
        latestSnapshot = get().snapshot;
      }
      const launch = await commands.launchClient(accountId);
      set((state) => ({ snapshot: updateSnapshot(state.snapshot, { launch }) }));
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  stop: async () => {
    set({ busy: true, error: null });
    try {
      const launch = await commands.stopClient();
      set((state) => ({ snapshot: updateSnapshot(state.snapshot, { launch }) }));
    } catch (error) {
      set({ error: cleanError(error) });
    } finally {
      set({ busy: false });
    }
  },

  refreshLogs: async () => { /* Client-Logs sind absichtlich nur live verfügbar. */ },

  openGameDirectory: async () => {
    try {
      await commands.openGameDirectory();
    } catch (error) {
      set({ error: cleanError(error) });
    }
  },
}));

export type { Page };
export function activeAccount(snapshot: LauncherSnapshot | null): Account | null {
  if (!snapshot?.active_account_id) return null;
  return snapshot.accounts.find((account) => account.id === snapshot.active_account_id) ?? null;
}
