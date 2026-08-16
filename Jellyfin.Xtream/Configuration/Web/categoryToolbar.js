export function categoryMatches(name, query) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return true;
  return String(name ?? '').toLowerCase().includes(q);
}

// live === [] means "all channels in this category".
export function isFullySelected(live) {
  return Array.isArray(live) && live.length === 0;
}

export function nextBulkAction(lives) {
  if (lives.length > 0 && lives.every(isFullySelected)) return 'deselect';
  return 'select';
}
