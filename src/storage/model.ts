import { expenseSnapshot } from "../lib/expense-rates";

export type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  currency: "USD" | "EUR" | "CNY";
  amount: number;
  tip: number;
  total: number;
  cny: number;
  eur: number;
  usd_cny: number;
  usd_eur: number;
  rate_snapshot_at: string;
  rate_info: string;
  created_at: string;
  photo_key: string | null;
};
export type PersonalData = {
  version: 1;
  expenses: Expense[];
  favorites: string[];
};
export const emptyPersonal = (): PersonalData => ({
  version: 1,
  expenses: [],
  favorites: [],
});
export const categories = ["餐饮", "交通", "住宿", "门票", "购物", "其他"];
export const safeId = (s: unknown): s is string =>
  typeof s === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(s);

export function createExpense(
  v: Record<string, unknown>,
  id: string,
  now = new Date().toISOString(),
): Expense {
  const { date, description, category, currency, amount, tip, usdCny, usdEur } =
    v;
  if (
    !safeId(id) ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T12:00:00Z")) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
    typeof description !== "string" ||
    !description.trim() ||
    description.length > 1000 ||
    !categories.includes(String(category)) ||
    !["USD", "EUR", "CNY"].includes(String(currency)) ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e8 ||
    typeof tip !== "number" ||
    !Number.isFinite(tip) ||
    tip < 0 ||
    tip > 100
  ) {
    throw Error("请检查金额、日期、小费和描述 / Check the expense fields");
  }
  const total =
    Math.round((amount * (1 + tip / 100) + Number.EPSILON) * 100) / 100;
  const rates = expenseSnapshot(
    String(currency),
    total,
    Number(usdCny),
    Number(usdEur),
  );
  return {
    id,
    date,
    description: description.trim(),
    category: String(category),
    currency: currency as Expense["currency"],
    amount,
    tip,
    total,
    cny: rates.cny,
    eur: rates.eur,
    usd_cny: rates.usdCny,
    usd_eur: rates.usdEur,
    rate_snapshot_at: now,
    created_at: now,
    rate_info: String(v.rateInfo || "手动参考价").slice(0, 300),
    photo_key: null,
  };
}

// Validate the complete payload before any database or filesystem mutation.
export function validatePersonal(input: unknown): PersonalData {
  const p = input as PersonalData;
  if (
    !p ||
    p.version !== 1 ||
    !Array.isArray(p.expenses) ||
    p.expenses.length > 10000 ||
    !Array.isArray(p.favorites) ||
    p.favorites.length > 10000 ||
    !p.favorites.every(safeId)
  )
    throw Error("备份格式不支持 / Unsupported backup");
  const ids = new Set<string>();
  const expenses = p.expenses.map((e) => {
    if (!e || ids.has(e.id)) throw Error("备份中有重复记录 / Duplicate record");
    ids.add(e.id);
    const normalized = createExpense(
      { ...e, usdCny: e.usd_cny, usdEur: e.usd_eur, rateInfo: e.rate_info },
      e.id,
      e.created_at,
    );
    if (
      ![e.created_at, e.rate_snapshot_at].every(
        (d) => typeof d === "string" && Number.isFinite(Date.parse(d)),
      ) ||
      normalized.total !== e.total ||
      normalized.cny !== e.cny ||
      normalized.eur !== e.eur ||
      (e.photo_key !== null &&
        (typeof e.photo_key !== "string" ||
          !/^receipts\/[a-zA-Z0-9_-]+\.jpg$/.test(e.photo_key)))
    ) {
      throw Error("备份记录校验失败 / Invalid expense record");
    }
    return {
      ...normalized,
      photo_key: e.photo_key,
      rate_snapshot_at: e.rate_snapshot_at,
    };
  });
  return { version: 1, expenses, favorites: [...new Set(p.favorites)] };
}

export function mergePersonal(
  current: PersonalData,
  incoming: PersonalData,
): PersonalData {
  const ids = new Set(current.expenses.map((e) => e.id));
  return validatePersonal({
    version: 1,
    expenses: [
      ...current.expenses,
      ...incoming.expenses.filter((e) => !ids.has(e.id)),
    ],
    favorites: [...new Set([...current.favorites, ...incoming.favorites])],
  });
}
