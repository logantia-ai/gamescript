export function Spinner({ size = 20, color = 'var(--copper)' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid var(--border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'gs-spin 0.7s linear infinite',
      }}
    />
  );
}

export function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      <Spinner size={28} />
      <div className="eyebrow">{label}</div>
    </div>
  );
}
