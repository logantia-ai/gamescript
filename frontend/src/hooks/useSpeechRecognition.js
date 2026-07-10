// Thin React wrapper around the Web Speech API (SpeechRecognition).
// Returns { supported, listening, toggle, stop }. Recognition auto-stops on a
// pause in speech; toggle() also stops it on a second click.
import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useSpeechRecognition({ onResult } = {}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const supported = !!getRecognitionCtor();

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* already stopped */ }
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (event) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      finalText = finalText.trim();
      if (finalText && onResultRef.current) onResultRef.current(finalText);
    };

    const finish = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    rec.onend = finish;
    rec.onerror = finish;

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      finish();
    }
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  // Abort any in-flight recognition if the component unmounts.
  useEffect(() => () => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.abort(); } catch { /* noop */ }
    }
  }, []);

  return { supported, listening, toggle, stop, start };
}
