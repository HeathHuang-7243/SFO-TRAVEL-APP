export function expenseSnapshot(
  currency: string,
  total: number,
  usdCny: number,
  usdEur: number,
) {
  if (
    !["USD", "EUR", "CNY"].includes(currency) ||
    ![total, usdCny, usdEur].every((n) => Number.isFinite(n) && n > 0) ||
    usdCny > 1000000 ||
    usdEur > 1000000
  )
    throw Error("请先获取或手动填写 USD→CNY 和 USD→EUR 汇率");
  const usd =
    currency === "USD"
      ? total
      : currency === "EUR"
        ? total / usdEur
        : total / usdCny;
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  return {
    cny: currency === "CNY" ? total : round(usd * usdCny),
    eur: currency === "EUR" ? total : round(usd * usdEur),
    usdCny,
    usdEur,
  };
}
export function savedExpenseValue(
  expense: any,
  base: "CNY" | "EUR",
): number | null {
  // Original-currency totals need no FX quote, including legacy records.
  if (expense.currency === base) return expense.total;
  const value = base === "EUR" ? expense.eur : expense.cny;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
