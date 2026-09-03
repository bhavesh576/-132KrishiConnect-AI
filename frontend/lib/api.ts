"use client";
import { getSession } from "./auth";

// Local/dev: undefined → same-origin "/api" (Next.js rewrite proxies to :8000).
// Render/cloud: set NEXT_PUBLIC_API_URL at BUILD time to the backend service
// URL, e.g. https://krishiconnect-api.onrender.com (CORS is open on backend).
export const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
