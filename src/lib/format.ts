/** 3桁区切りの円表記（Intl非依存でHermesでも安定）。 */
export function formatYen(n: number): string {
  const rounded = Math.round(n);
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${rounded < 0 ? "-" : ""}¥${grouped}`;
}
