import type { Account, BackendProfile, LauncherSettings } from "../types";

export interface BackendSession {
  token: string;
  profile: BackendProfile;
}

export function backendBaseUrl(settings: LauncherSettings): string {
  return settings.backend_url.replace(/\/$/, "");
}

export function normalizeMinecraftUuid(uuid: string): string {
  const compact = uuid.trim().replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) {
    throw new Error("Der aktive Minecraft-Account besitzt keine gültige UUID.");
  }
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");
}

export async function backendRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Backend-Zeitüberschreitung. Bitte später erneut versuchen.");
    }
    throw new Error("Backend ist aktuell nicht erreichbar.");
  } finally {
    window.clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = (data as { error?: string }).error;
    throw new Error(error ?? `HTTP ${response.status}`);
  }
  return data as T;
}

export async function createBackendSessionInfo(
  account: Account,
  settings: LauncherSettings,
): Promise<BackendSession> {
  const profile = await backendRequest<BackendProfile>(
    `${backendBaseUrl(settings)}/handshake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uuid: normalizeMinecraftUuid(account.id),
        name: account.username,
        clientVersion: "launcher-1.1.0",
      }),
    },
  );

  if (!profile.sessionToken) {
    throw new Error("Das Backend hat kein Session-Token zurückgegeben.");
  }

  return { token: profile.sessionToken, profile };
}
