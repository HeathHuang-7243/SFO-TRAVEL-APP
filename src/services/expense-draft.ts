import { getDriver, type KeyValue } from "../storage/driver";
import { safeId } from "../storage/model";
import { validatePhoto } from "../storage/photos";

export type ExpenseDraft = {
  clientId: string;
  id?: string;
  amount: string;
  currency: "USD" | "EUR" | "CNY";
  tip: string;
  date: string;
  description: string;
  category: string;
  usdCny: string;
  usdEur: string;
  rateInfo: string;
  photoData: string | null;
  photoKey: string | null;
  removePhoto: boolean;
};
const key = "expense-draft:v1";
export class ExpenseDraftStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private driver: () => Promise<KeyValue>) {}
  private enqueue<T>(job: (db: KeyValue) => Promise<T>) {
    const next = this.queue.then(() => this.driver()).then(job);
    this.queue = next.catch(() => {});
    return next;
  }
  read() {
    return this.enqueue(async (db): Promise<ExpenseDraft | null> => {
      const raw = await db.get(key);
      if (!raw) return null;
      const value = JSON.parse(raw) as ExpenseDraft;
      if (
        !value ||
        !safeId(value.clientId) ||
        (value.id !== undefined && !safeId(value.id)) ||
        typeof value.removePhoto !== "boolean" ||
        (value.photoKey !== null &&
          (typeof value.photoKey !== "string" ||
            !/^receipts\/[a-zA-Z0-9_-]+\.jpg$/.test(value.photoKey))) ||
        !["USD", "EUR", "CNY"].includes(value.currency) ||
        [
          "amount",
          "tip",
          "date",
          "description",
          "category",
          "usdCny",
          "usdEur",
          "rateInfo",
        ].some(
          (field) => typeof value[field as keyof ExpenseDraft] !== "string",
        ) ||
        value.description.length > 1000
      )
        throw Error(
          "草稿无法读取，请保留现有数据并重试 / Could not read the draft; retry without clearing app data",
        );
      if (value.photoData) validatePhoto(value.photoData);
      return value;
    });
  }
  write(value: ExpenseDraft) {
    return this.enqueue((db) => db.set(key, JSON.stringify(value)));
  }
  clear() {
    return this.enqueue((db) => db.remove(key));
  }
}
export const expenseDraft = new ExpenseDraftStore(getDriver);

export function lastExpenseCurrency(): ExpenseDraft["currency"] {
  try {
    const value = localStorage.getItem("expense-currency:v1");
    if (value === "EUR" || value === "CNY") return value;
  } catch {
    /* Default currency when device preferences cannot be read. */
  }
  return "USD";
}
