import { mergeStyles } from '../../lib/utils';

const VARIANTS = {
  primary: { background: 'var(--green-bg)', border: '1px solid var(--green-bright)', color: 'var(--green-text)' },
  copper: { background: 'transparent', border: '1px solid var(--copper)', color: 'var(--copper)' },
  ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--silver)' },
  danger: { background: 'transparent', border: '1px solid var(--red-bright)', color: 'var(--red-bright)' },
};

export function Button({ variant = 'primary', children, style, disabled, ...props }) {
  const base = {
    padding: '11px 24px',
    fontSize: '11px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-data)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  };
  return (
    <button disabled={disabled} style={mergeStyles(base, VARIANTS[variant], style)} {...props}>
      {children}
    </button>
  );
}
