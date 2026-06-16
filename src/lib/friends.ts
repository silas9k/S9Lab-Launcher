import type { Account, LauncherSettings } from "../types";
import { backendBaseUrl, backendRequest, createBackendSessionInfo } from "./backend";

export interface Friend { uuid:string; name:string; online:boolean; lastSeen:number; status:string; favorite:boolean; unreadMessages:number; }
export interface FriendRequest { uuid:string; name:string; createdAt:number; }
export interface FriendsResponse { ok:boolean; friends:Friend[]; incomingRequests:FriendRequest[]; outgoingRequests:FriendRequest[]; }
export interface FriendMessage { messageId:number; senderUuid:string; receiverUuid:string; senderName:string; message:string; sentAt:number; read:boolean; }
export interface FriendMessagesResponse { ok:boolean; friendUuid:string; messages:FriendMessage[]; }

export async function createBackendSession(account:Account, settings:LauncherSettings){ return (await createBackendSessionInfo(account,settings)).token; }
export async function getFriends(settings:LauncherSettings, token:string){ return backendRequest<FriendsResponse>(`${backendBaseUrl(settings)}/friends`,{headers:{"X-S9Lab-Session":token}}); }
export async function addFriend(settings:LauncherSettings, token:string, name:string){ return backendRequest<FriendsResponse>(`${backendBaseUrl(settings)}/friends/add`,{method:"POST",headers:{"Content-Type":"application/json","X-S9Lab-Session":token},body:JSON.stringify({targetUuid:"",targetName:name})}); }
export async function respondFriend(settings:LauncherSettings, token:string, requesterUuid:string, accept:boolean){ return backendRequest<FriendsResponse>(`${backendBaseUrl(settings)}/friends/respond`,{method:"POST",headers:{"Content-Type":"application/json","X-S9Lab-Session":token},body:JSON.stringify({requesterUuid,accept})}); }
export async function removeFriend(settings:LauncherSettings, token:string, friendUuid:string){ return backendRequest<FriendsResponse>(`${backendBaseUrl(settings)}/friends/remove`,{method:"POST",headers:{"Content-Type":"application/json","X-S9Lab-Session":token},body:JSON.stringify({friendUuid})}); }
export async function getFriendMessages(settings:LauncherSettings, token:string, friendUuid:string){ return backendRequest<FriendMessagesResponse>(`${backendBaseUrl(settings)}/friends/messages/${encodeURIComponent(friendUuid)}`,{headers:{"X-S9Lab-Session":token}}); }
export async function sendFriendMessage(settings:LauncherSettings, token:string, friendUuid:string, message:string){ return backendRequest<FriendMessage>(`${backendBaseUrl(settings)}/friends/message`,{method:"POST",headers:{"Content-Type":"application/json","X-S9Lab-Session":token},body:JSON.stringify({friendUuid,message})}); }
