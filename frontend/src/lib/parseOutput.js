// Best-effort extraction of structured fields from Claude's markdown output.
// Display always uses the raw text; these parsers feed the DB columns and
// summary chips, degrading to null/[] when a field isn't found.

export function pick(text, re) {
  const m = String(text || '').match(re);
  return m ? m[1].trim() : null;
}

// Collect bullet lines that follow a header line matching `headerRe`.
export function bulletsAfter(text, headerRe) {
  const lines = String(text || '').split('\n');
  const start = lines.findIndex((l) => headerRe.test(l));
  if (start < 0) return [];
  const out = [];
  for (let j = start + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (/^([-*•]|\d+\.)\s+/.test(t)) {
      out.push(t.replace(/^([-*•]|\d+\.)\s+/, '').replace(/\*\*/g, ''));
    } else if (out.length && t === '') {
      continue; // tolerate blank lines inside a list
    } else if (out.length) {
      break; // list ended
    }
  }
  return out;
}

export function parseGrade(text) {
  return pick(text, /GRADE[:*\s]*([A-F][+-]?)/i);
}

export function parseConfidence(text) {
  const v = pick(text, /CONFIDENCE[:*\s]*([0-9]{1,3})\s*%/i);
  return v ? Math.min(100, Number(v)) : null;
}

// Single-line value following a label (e.g. "VERDICT: ...").
export function parseLabeledLine(text, label) {
  return pick(text, new RegExp(`${label}[:*\\s]*([^\\n]+)`, 'i'));
}

// Parse "Player, POS, $salary" from a free-form first answer.
export function parsePlayerLine(s) {
  const str = String(s || '');
  const position = (str.match(/\b(QB|RB|WR|TE|DST|D\/ST)\b/i) || [])[1]?.toUpperCase() || null;
  const salaryMatch = str.match(/\$?\s*([0-9]{3,5})/);
  const salary = salaryMatch ? Number(salaryMatch[1]) : null;
  const name = str.split(',')[0]?.trim() || str.trim() || null;
  return { name, position: position === 'D/ST' ? 'DST' : position, salary };
}
