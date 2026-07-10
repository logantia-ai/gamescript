import { forwardRef, useCallback, useRef } from 'react';
import { mergeStyles } from '../../lib/utils';
import { MicButton } from './MicButton';
import { setNativeFieldValue } from '../../lib/voice';

const fieldStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--chalk)',
  padding: '10px 12px',
  fontSize: '13px',
  fontFamily: 'var(--font-data)',
  outline: 'none',
};

// Combine a forwarded ref with a local one so the mic can write into the field.
function useMergedRef(forwarded) {
  const local = useRef(null);
  const setRef = useCallback((el) => {
    local.current = el;
    if (typeof forwarded === 'function') forwarded(el);
    else if (forwarded) forwarded.current = el;
  }, [forwarded]);
  return [local, setRef];
}

// Mic is OFF by default on single-line inputs — number fields, dropdowns and
// short labeled inputs don't get one. Opt a genuine free-text sentence field in
// with `voice` (e.g. the Coordinator chat box). Free-text areas use <Textarea>,
// which keeps the mic by default.
export const Input = forwardRef(function Input({ style, voice = false, type, ...props }, ref) {
  const [local, setRef] = useMergedRef(ref);
  // Never voice-enable a number/credential field even if asked.
  const enabled = voice && type !== 'password' && type !== 'email' && type !== 'number';
  const numeric = type === 'number';

  const field = (
    <input
      ref={setRef}
      type={type}
      style={mergeStyles(fieldStyle, enabled ? { paddingRight: '38px' } : null, style)}
      {...props}
    />
  );
  if (!enabled) return field;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {field}
      <MicButton
        onTranscript={(text) => setNativeFieldValue(local.current, text, { numeric })}
        style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ style, rows = 5, voice = true, ...props }, ref) {
  const [local, setRef] = useMergedRef(ref);

  const field = (
    <textarea
      ref={setRef}
      rows={rows}
      style={mergeStyles(fieldStyle, { resize: 'vertical', lineHeight: 1.6 }, voice ? { paddingRight: '38px' } : null, style)}
      {...props}
    />
  );
  if (!voice) return field;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {field}
      <MicButton
        onTranscript={(text) => setNativeFieldValue(local.current, text)}
        style={{ position: 'absolute', right: '6px', top: '8px' }}
      />
    </div>
  );
});
