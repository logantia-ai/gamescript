import { mergeStyles } from '../../lib/utils';

export function Badge({ children, color = 'var(--copper)', bg, style }) {
  const base = {
    display: 'inline-block',
    fontFamily: 'var(--font-data)',
    fontSize: '9px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${color}`,
    color,
    background: bg || 'transparent',
  };
  return <span style={mergeStyles(base, style)}>{children}</span>;
}
