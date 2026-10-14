import { expect, it, vi } from "vitest";

const { open } = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("@capacitor-community/sqlite", () => ({
  CapacitorSQLite: {},
  SQLiteConnection: class {},
}));
vi.mock("../src/storage/native", () => ({ openNativeDriver: open }));
vi.mock("../src/storage/photos", () => ({
  photos: {},
  validatePhoto: vi.fn(),
}));

import { getRepository } from "../src/storage/repository";

it("shares initialization and clears both rejected caches before a retry", async () => {
  open.mockRejectedValueOnce(Error("Temporary open failure"));
  const first = getRepository();
  expect(getRepository()).toBe(first);
  await expect(first).rejects.toThrow("Temporary open failure");
  open.mockResolvedValueOnce({ get: async () => null });
  const retry = getRepository();
  expect(getRepository()).toBe(retry);
  expect(await (await retry).read()).toEqual({
    version: 1,
    expenses: [],
    favorites: [],
  });
  expect(open).toHaveBeenCalledTimes(2);
});
