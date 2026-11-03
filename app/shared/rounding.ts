// Diners and residents are modelled, so they are shown to the nearest 10; under 5 would read as 0, so it is "<10".
// Shared by Page 1 (pages/closures/format.ts) and the Ask HawkerReach chat. Seniors: roughSeniors in closure-engine.
export function roughDiners(n: number): string {
  const r = Math.round(n / 10) * 10;
  if (n <= 0) return '0';
  return r === 0 ? '<10' : r.toLocaleString('en-US');
}
