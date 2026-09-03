"use client";
// Simple JSON-dictionary i18n via React context (no external i18n SaaS).
// Language persists in localStorage and applies instantly, without reload.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setLang as persistLang, getLang } from "@/lib/auth";
import en from "../../i18n/en.json";
import hi from "../../i18n/hi.json";
import mr from "../../i18n/mr.json";

export type Lang = "en" | "hi" | "mr";
const DICTS: Record<Lang, any> = { en, hi, mr };
export const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" }, { id: "hi", label: "हि" }, { id: "mr", label: "मराठी" },
];

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
  tc: (crop: string) => string; // crop translation with English fallback
}

const Ctx = createContext<LangCtx>(null as any);

function lookup(dict: any, path: string): string | undefined {
  let cur: any = dict;
  for (const part of path.split(".")) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = getLang() as Lang;
    if (saved in DICTS) setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    persistLang(l);
  }, []);

  const t = useCallback(
    (path: string) => lookup(DICTS[lang], path) ?? lookup(DICTS.en, path) ?? path,
    [lang]
  );
  const tc = useCallback(
    (crop: string) => lookup(DICTS[lang], `crops.${crop}`) ?? crop,
    [lang]
  );

  return <Ctx.Provider value={{ lang, setLang, t, tc }}>{children}</Ctx.Provider>;
};

export const useT = () => useContext(Ctx);
