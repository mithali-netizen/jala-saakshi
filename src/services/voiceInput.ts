import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpeechRecognitionCtor, SpeechRecognitionLike } from '../types/speech';

/**
 * Voice input using the browser's own speech recognition.
 *
 * This is the Web Speech API running in the browser — not a model we host, and nothing
 * here reaches our backend. The UI must call it "voice input", never AI. The transcript
 * always lands in an editable field so the person can correct it before submitting;
 * recognition of Kannada and Indian English is imperfect and we should not pretend
 * otherwise.
 */

export const VOICE_LANGS = [
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'en-IN', label: 'English' },
] as const;

export type VoiceLang = (typeof VOICE_LANGS)[number]['code'];

const LANG_KEY = 'jala-voice-lang';
export const DEFAULT_LANG: VoiceLang = 'kn-IN';

export function loadVoiceLang(): VoiceLang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (VOICE_LANGS.some((l) => l.code === saved)) return saved as VoiceLang;
  } catch {
    /* storage unavailable: fall through to the default */
  }
  return DEFAULT_LANG;
}

function saveVoiceLang(lang: VoiceLang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* the choice just will not persist */
  }
}

/** Undefined when the browser has no speech recognition at all. */
function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/** Short, plain messages. Never fail silently. */
function messageFor(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'Did not catch anything. Try again, closer to the mic.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone blocked. Allow mic access in your browser settings, or type instead.';
    case 'audio-capture':
      return 'No microphone found. You can type instead.';
    case 'network':
      return 'Speech recognition needs a connection and could not reach it. You can type instead.';
    case 'aborted':
      return '';
    default:
      return 'Voice input stopped unexpectedly. You can type instead.';
  }
}

export interface VoiceInput {
  /** False when the browser cannot do this at all — hide the button entirely. */
  supported: boolean;
  listening: boolean;
  /** Words recognised so far in this run, not yet committed. */
  interim: string;
  error: string | null;
  lang: VoiceLang;
  setLang: (lang: VoiceLang) => void;
  start: () => void;
  stop: () => void;
}

/**
 * @param onTranscript appends a finished phrase. Called as each phrase is finalised so a
 *   long description is not lost if recognition ends early.
 */
export function useVoiceInput(onTranscript: (text: string) => void): VoiceInput {
  const Ctor = useMemo(getRecognitionCtor, []);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLangState] = useState<VoiceLang>(loadVoiceLang);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Keep the newest callback without restarting recognition.
  const live = useRef({ onTranscript });
  live.current = { onTranscript };

  const setLang = useCallback((next: VoiceLang) => {
    setLangState(next);
    saveVoiceLang(next);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Ctor || recognitionRef.current) return;
    setError(null);
    setInterim('');

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) live.current.onTranscript(text.trim());
        else pending += text;
      }
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      const msg = messageFor(event.error);
      if (msg) setError(msg);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Chrome throws if start() is called twice in quick succession.
      setError('Could not start voice input. Try again.');
      recognitionRef.current = null;
    }
  }, [Ctor, lang]);

  // Changing language mid-run restarts cleanly rather than mixing languages.
  useEffect(() => {
    if (listening) recognitionRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported: !!Ctor, listening, interim, error, lang, setLang, start, stop };
}
