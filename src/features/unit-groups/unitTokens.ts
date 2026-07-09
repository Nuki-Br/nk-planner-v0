// Tokenizer do input de números de unidade (UnitNumberInput do protótipo):
// split por espaço/vírgula/ponto-e-vírgula, dedupe e ordenação numérica
// (empate resolve por localeCompare).
export function addUnitTokens(values: readonly string[], raw: string): string[] {
  const tokens = String(raw)
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return [...values];
  const next = [...values];
  for (const t of tokens) {
    if (!next.includes(t)) next.push(t);
  }
  next.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b));
  return next;
}
