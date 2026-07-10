// VoiceBriefing (Task 12) — reads a script aloud via the Web Speech API,
// like a sports-radio segment. Feature-detects SpeechSynthesis and renders
// nothing interactive when it's unavailable.
import { useEffect, useRef, useState } from 'react';

const SPEEDS = [0.75, 1.0, 1.25, 1.5];
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function VoiceBriefing({ script }) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const utterRef = useRef(null);

  // Always cancel any in-flight speech on unmount.
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, []);

  if (!supported) {
    return (
      <span title="Voice not supported in this browser" style={{ fontSize: '10px', color: 'var(--chalk-dim)' }}>
        🔇
      </span>
    );
  }

  function play() {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(script);
    u.rate = rate;
    u.onend = () => { setSpeaking(false); setPaused(false); };
    u.onerror = () => { setSpeaking(false); setPaused(false); };
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    setPaused(false);
  }

  function togglePause() {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  function changeRate(r) {
    setRate(r);
    if (speaking) { // restart at the new rate so it takes effect immediately
      play();
    }
  }

  const btn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '50%',
    border: '1px solid var(--copper)', background: 'transparent', color: 'var(--copper)',
    fontSize: '13px', cursor: 'pointer', padding: 0,
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {!speaking ? (
        <button type="button" onClick={play} style={btn} title="Listen to your Sharp Report" aria-label="Listen to your Sharp Report">🔊</button>
      ) : (
        <>
          <button type="button" onClick={togglePause} style={btn} title={paused ? 'Resume' : 'Pause'} aria-label={paused ? 'Resume' : 'Pause'}>
            {paused ? '▶' : '❚❚'}
          </button>
          <button type="button" onClick={stop} style={btn} title="Stop" aria-label="Stop">■</button>
          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            aria-label="Playback speed"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--chalk)', fontSize: '10px', padding: '3px 4px' }}
          >
            {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
          </select>
        </>
      )}
    </span>
  );
}
