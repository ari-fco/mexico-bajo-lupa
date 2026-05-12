const nfInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const nfDec = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nfCurrency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const nfPct = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const fmtInt = (n: number) => nfInt.format(n);
export const fmtDec = (n: number) => nfDec.format(n);
export const fmtMxn = (n: number) => nfCurrency.format(n);
export const fmtPct = (n: number) => nfPct.format(n);

export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return nfInt.format(n);
}

export function fmtPer100k(n: number): string {
  return `${nfDec.format(n)} / 100k`;
}
