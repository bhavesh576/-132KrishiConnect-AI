"use client";
// Demo-safe session handling: JWT + role in localStorage (per spec Section 9).
// All storage access is guarded — sandboxed iframes / privacy modes can throw
// on window.localStorage, and a thrown error here must never crash the UI or
// reset the language selection.
export type Role = "FARMER" | "BUYER" | "FPO" | "ADMIN";

export interface Session {
  token: string;
  role: Role;
  user_id: number;
  name: string;
  phone: string;
}

const KEY = "kc_session";
const LANG_KEY = "kc_lang";

export const getSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

export const setSession = (s: Session) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};
export const clearSession = () => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
};
export const getLang = (): string => {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(LANG_KEY) || "en";
  } catch {
    return "en";
  }
};
export const setLang = (l: string) => {
  try {
    window.localStorage.setItem(LANG_KEY, l);
  } catch {}
};
