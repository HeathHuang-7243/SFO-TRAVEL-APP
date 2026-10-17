import { Capacitor } from "@capacitor/core";
import { localApi } from "./local-api";
import { saveReceiptToGallery } from "./native-device";
import type { Expense } from "../storage/model";

export async function recordExpense(
  form: FormData,
  saveToGallery: boolean,
  editingId?: string,
) {
  const expense: Expense = await localApi(
    "/api/expenses" + (editingId ? "?id=" + encodeURIComponent(editingId) : ""),
    {
      method: editingId ? "PUT" : "POST",
      body: form,
    },
  );
  let galleryError: string | null = null;
  let gallerySaved = false;
  if (
    saveToGallery &&
    (!editingId || form.get("photo") instanceof File) &&
    expense.photo_key &&
    Capacitor.getPlatform() === "android"
  ) {
    try {
      await saveReceiptToGallery(expense.photo_key);
      gallerySaved = true;
    } catch (error) {
      galleryError = error instanceof Error ? error.message : String(error);
    }
  }
  // A gallery failure is separate from the already committed expense.
  return { expense, galleryError, gallerySaved };
}
