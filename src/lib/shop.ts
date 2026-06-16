import type { Account, BackendProfile, Cosmetic, LauncherSettings } from "../types";
import { backendBaseUrl, backendRequest, createBackendSessionInfo, normalizeMinecraftUuid } from "./backend";

export interface ShopSnapshot { token: string; profile: BackendProfile; catalog: Cosmetic[]; }

export async function loadShop(account: Account, settings: LauncherSettings): Promise<ShopSnapshot> {
  const session = await createBackendSessionInfo(account, settings);
  const catalogResponse = await backendRequest<{ ok: boolean; catalog: Cosmetic[] }>(`${backendBaseUrl(settings)}/cosmetics`);
  return { token: session.token, profile: session.profile, catalog: catalogResponse.catalog.filter((item) => item.enabled) };
}

export async function buyCosmetic(account: Account, settings: LauncherSettings, token: string, cosmeticId: string, type: string): Promise<BackendProfile> {
  return backendRequest(`${backendBaseUrl(settings)}/shop/buy`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-S9Lab-Session": token },
    body: JSON.stringify({ uuid: normalizeMinecraftUuid(account.id), cosmeticId, type }),
  });
}

export async function equipCosmetic(account: Account, settings: LauncherSettings, token: string, cosmeticId: string, type: string): Promise<BackendProfile> {
  return backendRequest(`${backendBaseUrl(settings)}/cosmetics/equip`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-S9Lab-Session": token },
    body: JSON.stringify({ uuid: normalizeMinecraftUuid(account.id), cosmeticId, type }),
  });
}

export async function unequipCosmetic(account: Account, settings: LauncherSettings, token: string, cosmeticId: string, type: string): Promise<BackendProfile> {
  return backendRequest(`${backendBaseUrl(settings)}/cosmetics/unequip`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-S9Lab-Session": token },
    body: JSON.stringify({ uuid: normalizeMinecraftUuid(account.id), cosmeticId, type }),
  });
}
