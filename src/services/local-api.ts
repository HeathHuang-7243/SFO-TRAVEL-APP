import { getRepository } from "../storage/repository";
import { fileBase64 } from "../storage/photos";
import { loadRates, loadSessions, loadHistory } from "./public-data";

// Compatibility boundary for the imported view. No server or HTTP request here.
export async function localApi(
  path: string,
  options?: RequestInit,
): Promise<any> {
  const url = new URL(path, "https://local.invalid");
  const name = url.pathname.replace("/api/", "");
  const repo = await getRepository();
  const force = url.searchParams.get("refresh") === "1";
  if (name === "expenses") {
    if (options?.method === "POST") {
      const form = options.body as FormData;
      const photo = form.get("photo");
      return repo.add(
        JSON.parse(String(form.get("data"))),
        photo instanceof File && photo.size
          ? await fileBase64(photo)
          : undefined,
      );
    }
    if (options?.method === "DELETE") {
      await repo.remove(url.searchParams.get("id") || "");
      return { ok: true };
    }
    return (await repo.read()).expenses.sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.created_at.localeCompare(a.created_at),
    );
  }
  if (name === "favorites") {
    if (options?.method === "POST") {
      const { id, selected } = JSON.parse(String(options.body));
      await repo.favorite(id, selected);
      return { ok: true };
    }
    return (await repo.read()).favorites;
  }
  if (name === "rates") return loadRates(force);
  if (name === "sessions") return loadSessions(force);
  if (name === "rate-history") return loadHistory(force);
  throw Error("Unknown local operation");
}
