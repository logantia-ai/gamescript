import { mergeStyles } from '../../lib/utils';
import { FlipNumber } from './Effects';

export function Card({ children, style, ...props }) {
  const base = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
  };
  return (
    <div style={mergeStyles(base, style)} {...props}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = 'var(--copper)' }) {
  return (
    <Card style={{ padding: '16px', minWidth: '140px', flex: 1 }}>
      <div className="eyebrow" style={{ marginBottom: '8px' }}>{label}</div>
      <FlipNumber style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: accent }}>
        {value}
      </FlipNumber>
      {sub && <div style={{ fontSize: '10px', color: 'var(--chalk-dim)', marginTop: '4px' }}>{sub}</div>}
    </Card>
  );
}
