import { useCallback, useSyncExternalStore } from 'react';
import { translate, ISSUE_LABELS, type Lang, type StringKey } from './strings';

/**
 * App language for the citizen app, shared across screens and persisted.
 *
 * One setting drives both the interface and speech recognition: someone reading the app
 * in Kannada will dictate in Kannada, and a second toggle for that would be noise.
 */

const KEY = 'jala-lang';
export const DEFAULT_LANG: Lang = 'kn';

let current: Lang | null = null;
const listeners = new Set<() => void>();

function read(): Lang {
  if (current) return current;
  try {
    const saved = localStorage.getItem(KEY);
    current = saved === 'en' || saved === 'kn' ? saved : DEFAULT_LANG;
  } catch {
    current = DEFAULT_LANG; // storage blocked; the choice just will not persist
  }
  return current;
}

export function setLanguage(lang: Lang): void {
  current = lang;
  listeners.forEach((fn) => fn());
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface Translator {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
  /** Issue chip label in the current language, falling back to the English key. */
  issue: (name: string) => string;
}

export function useLanguage(): Translator {
  const lang = useSyncExternalStore(subscribe, read, read);
  const t = useCallback((key: StringKey) => translate(lang, key), [lang]);
  const issue = useCallback((name: string) => ISSUE_LABELS[lang][name] ?? name, [lang]);
  return { lang, setLang: setLanguage, t, issue };
}
