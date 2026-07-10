// Voice-input mic button. Click to start dictation; a pulsing red dot shows
// while recording. Transcribed speech is handed back via onTranscript. Renders
// nothing when the browser has no Web Speech API support.
import { Mic } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export function MicButton({ onTranscript, style, size = 15 }) {
  const { supported, listening, toggle } = useSpeechRecognition({ onResult: onTranscript });
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      title={listening ? 'Listening… click to stop' : 'Voice input'}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      aria-pressed={listening}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '26px',
        height: '26px',
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: listening ? 'var(--red-bright)' : 'var(--silver)',
        ...style,
      }}
    >
      {listening ? (
        <span
          className="gs-mic-pulse"
          style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'var(--red-bright)' }}
        />
      ) : (
        <Mic size={size} />
      )}
    </button>
  );
}
