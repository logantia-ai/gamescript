import { forwardRef } from 'react';
import { mergeStyles } from '../../lib/utils';

export const Select = forwardRef(function Select({ options = [], style, children, ...props }, ref) {
  const base = {
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
  return (
    <select ref={ref} style={mergeStyles(base, style)} {...props}>
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
      {children}
    </select>
  );
});
