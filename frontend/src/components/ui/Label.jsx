export function Label({ children, htmlFor, style }) {
  return (
    <label
      htmlFor={htmlFor}
      className="eyebrow"
      style={{ display: 'block', marginBottom: '6px', ...style }}
    >
      {children}
    </label>
  );
}
