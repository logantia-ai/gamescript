// Small shared helpers.

// Merge inline style objects (later wins). Falsy entries ignored.
export function mergeStyles(...styles) {
  return Object.assign({}, ...styles.filter(Boolean));
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function formatCurrency(n, { sign = false } = {}) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const str = v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return sign && v > 0 ? `+${str}` : str;
}

export function formatPct(n, digits = 1) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toFixed(digits)}%`;
}

export function formatNum(n, digits = 1) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(digits);
}

// Leverage tier → color, for badges and tables.
export function leverageColor(score) {
  if (score == null) return 'var(--silver)';
  if (score >= 70) return 'var(--green-text)';
  if (score >= 50) return 'var(--copper)';
  return 'var(--silver)';
}

export function gradeColor(grade) {
  const g = String(grade || '').toUpperCase()[0];
  if (g === 'A') return 'var(--green-text)';
  if (g === 'B') return 'var(--copper-bright)';
  if (g === 'C') return 'var(--copper)';
  return 'var(--red-bright)';
}
