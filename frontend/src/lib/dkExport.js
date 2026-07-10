// DraftKings lineup export helpers.
// DK Classic NFL upload order: QB, RB, RB, WR, WR, WR, TE, FLEX, DST.

export const DK_SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'DST'];

// Order a flat list of {position, name} players into the DK slot sequence,
// filling FLEX with the first leftover RB/WR/TE.
export function orderForDk(players) {
  const pool = [...players];
  const take = (pos) => {
    const i = pool.findIndex((p) => (p.position || '').toUpperCase() === pos);
    return i >= 0 ? pool.splice(i, 1)[0] : null;
  };
  const row = {};
  for (const slot of ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'DST']) {
    const key = slot + (row[slot] ? '2' : '');
    row[key] = take(slot);
  }
  // FLEX = first remaining RB/WR/TE.
  row.FLEX = pool.find((p) => ['RB', 'WR', 'TE'].includes((p.position || '').toUpperCase())) || pool[0] || null;
  return row;
}

// Build a single-lineup DK CSV (header + one row of player names).
export function lineupToDkCsv(players) {
  const row = orderForDk(players);
  const cells = ['QB', 'RB', 'RB2', 'WR', 'WR2', 'WR3', 'TE', 'FLEX', 'DST']
    .map((k) => (row[k]?.name || '').replace(/,/g, ''));
  return `${DK_SLOTS.join(',')}\n${cells.join(',')}`;
}

// Build a bulk DK CSV for many lineups.
export function lineupsToDkCsv(lineups) {
  const header = DK_SLOTS.join(',');
  const body = lineups
    .map((players) => {
      const row = orderForDk(players);
      return ['QB', 'RB', 'RB2', 'WR', 'WR2', 'WR3', 'TE', 'FLEX', 'DST']
        .map((k) => (row[k]?.name || '').replace(/,/g, ''))
        .join(',');
    })
    .join('\n');
  return `${header}\n${body}`;
}

// Trigger a browser download of a CSV string.
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
