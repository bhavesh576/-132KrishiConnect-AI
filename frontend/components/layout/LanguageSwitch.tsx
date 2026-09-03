"use client";
import { LANGS, useT, type Lang } from "@/components/i18n/LanguageProvider";

// EN/HI/MR pill toggle — instant, no reload; persists via provider.
export default function LanguageSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="flex overflow-hidden rounded-btn border border-white/40 text-xs" role="group" aria-label="Language">
      {LANGS.map((l: { id: Lang; label: string }) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          className={`px-2 py-0.5 font-semibold transition-colors ${
            lang === l.id ? "bg-white text-primary" : "bg-primary text-white hover:bg-primary-dark"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
