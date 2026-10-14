import { beforeEach, expect, it, vi } from "vitest";
const { api, gallery, platform } = vi.hoisted(() => ({
  api: vi.fn(),
  gallery: vi.fn(),
  platform: vi.fn(),
}));
vi.mock("../src/services/local-api", () => ({ localApi: api }));
vi.mock("../src/services/native-device", () => ({
  saveReceiptToGallery: gallery,
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: platform } }));
import { recordExpense } from "../src/services/save-expense";

beforeEach(() => {
  vi.resetAllMocks();
  platform.mockReturnValue("android");
  api.mockResolvedValue({ id: "saved", photo_key: "receipts/saved.jpg" });
});
it("does not write to the gallery without opt-in, without a photo, or in browser preview", async () => {
  await recordExpense(new FormData(), false);
  platform.mockReturnValue("web");
  await recordExpense(new FormData(), true);
  platform.mockReturnValue("android");
  api.mockResolvedValue({ id: "saved", photo_key: null });
  await recordExpense(new FormData(), true);
  expect(gallery).not.toHaveBeenCalled();
});
it("copies a photo only after the expense was committed", async () => {
  const events: string[] = [];
  api.mockImplementation(async () => {
    events.push("expense");
    return { photo_key: "receipts/saved.jpg" };
  });
  gallery.mockImplementation(async () => {
    events.push("gallery");
  });
  expect((await recordExpense(new FormData(), true)).gallerySaved).toBe(true);
  expect(events).toEqual(["expense", "gallery"]);
});
it("keeps a committed expense when gallery permission or writing fails", async () => {
  gallery.mockRejectedValue(Error("Permission denied"));
  const result = await recordExpense(new FormData(), true);
  expect(result.expense.id).toBe("saved");
  expect(result.galleryError).toBe("Permission denied");
  expect(api).toHaveBeenCalledTimes(1);
  expect(result.gallerySaved).toBe(false);
});
it("does not create a gallery photo when the expense could not be saved", async () => {
  api.mockRejectedValue(Error("Disk full"));
  await expect(recordExpense(new FormData(), true)).rejects.toThrow(
    "Disk full",
  );
  expect(gallery).not.toHaveBeenCalled();
});
