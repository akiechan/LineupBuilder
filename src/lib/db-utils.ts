const JSON_FIELDS = ['attendance', 'lineup', 'strategy_priorities'];
const BOOL_FIELDS = ['count_goalie_as_playing_time', 'has_goalie'];

export function deserializeGame(row: Record<string, unknown>): Record<string, unknown> {
  const result = { ...row };
  for (const field of JSON_FIELDS) {
    if (typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field] as string); } catch { /* leave as string */ }
    }
  }
  for (const field of BOOL_FIELDS) {
    if (field in result) {
      result[field] = Boolean(result[field]);
    }
  }
  return result;
}

export function serializeForDb(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  for (const field of JSON_FIELDS) {
    if (field in result && result[field] !== null && typeof result[field] !== 'string') {
      result[field] = JSON.stringify(result[field]);
    }
  }
  for (const field of BOOL_FIELDS) {
    if (field in result) {
      result[field] = result[field] ? 1 : 0;
    }
  }
  return result;
}
