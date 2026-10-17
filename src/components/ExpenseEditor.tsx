import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X, Save, FilePenLine } from "lucide-react";
import type { Expense } from "../storage/model";
import { categories } from "../storage/model";
import { photoUrl } from "../storage/photos";
import { getRepository } from "../storage/repository";
import {
  expenseDraft,
  lastExpenseCurrency,
  type ExpenseDraft,
} from "../services/expense-draft";
import { captureReceipt, prepareReceipt } from "../services/device";
import { recordExpense } from "../services/save-expense";
import { translate } from "../lib/i18n";

export type ExpenseSeed = {
  expense?: Expense;
  calculator?: { amount: string; currency: Expense["currency"]; tip: string };
};
type Saved = Awaited<ReturnType<typeof recordExpense>>;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export default function ExpenseEditor({
  en,
  seed,
  fx,
  saveToGallery,
  onClose,
  onSaved,
}: {
  en: boolean;
  seed: ExpenseSeed;
  fx: { usdCny: number; usdEur: number; note: string };
  saveToGallery: boolean;
  onClose: () => void;
  onSaved: (result: Saved) => Promise<void>;
}) {
  const say = (zh: string, english: string) => (en ? english : zh);
  const t = (text: string) => translate(text, en ? "en" : "zh");
  const [value, setValue] = useState<ExpenseDraft>(() => {
    const e = seed.expense;
    return {
      clientId: crypto.randomUUID(),
      id: e?.id,
      amount: e ? String(e.amount) : (seed.calculator?.amount ?? ""),
      currency:
        e?.currency ?? seed.calculator?.currency ?? lastExpenseCurrency(),
      tip: e ? String(e.tip) : (seed.calculator?.tip ?? "0"),
      date: e?.date ?? today(),
      description: e?.description ?? "",
      category: e?.category ?? "餐饮",
      usdCny: String(e?.usd_cny ?? fx.usdCny),
      usdEur: String(e?.usd_eur ?? fx.usdEur),
      rateInfo: e?.rate_info ?? fx.note,
      photoData: null,
      photoKey: e?.photo_key ?? null,
      removePhoto: false,
    };
  });
  const baseline = useRef(JSON.stringify(value));
  const serialized = JSON.stringify(value);
  const dirty = serialized !== baseline.current;
  const latest = useRef(value);
  latest.current = value;
  const [draftReadFailed, setDraftReadFailed] = useState(false);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState<ExpenseDraft | null>(null);
  const [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [closing, setClosing] = useState(false);
  const [error, setError] = useState(""),
    [draftState, setDraftState] = useState<
      "idle" | "saving" | "saved" | "error"
    >("idle");
  const [existingUrl, setExistingUrl] = useState("");
  const stopped = useRef(false);
  const ownsDraft = useRef(false);
  useEffect(() => {
    let active = true;
    void expenseDraft
      .read()
      .then(async (draft) => {
        if (
          draft &&
          !draft.id &&
          (await (await getRepository()).read()).expenses.some(
            (e) => e.id === draft!.clientId,
          )
        ) {
          await expenseDraft.clear();
          draft = null;
        }
        if (active) setPending(draft);
      })
      .catch((e) => {
        if (active) {
          setDraftReadFailed(true);
          setError(String(e.message || e));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!value.photoKey || value.removePhoto) {
      setExistingUrl("");
      return;
    }
    let active = true;
    void photoUrl(value.photoKey)
      .then((url) => {
        if (active) setExistingUrl(url);
      })
      .catch(() => {
        if (active) setExistingUrl("");
      });
    return () => {
      active = false;
    };
  }, [value.photoKey, value.removePhoto]);
  async function persist() {
    ownsDraft.current = true;
    const snapshot = latest.current;
    setDraftState("saving");
    try {
      await expenseDraft.write(snapshot);
      setDraftState(
        JSON.stringify(snapshot) === JSON.stringify(latest.current)
          ? "saved"
          : "saving",
      );
      return true;
    } catch (e) {
      setDraftState("error");
      setError(
        say(
          "草稿保存失败，请保持窗口打开并重试。",
          "Draft could not be saved. Keep this window open and retry.",
        ),
      );
      return false;
    }
  }
  useEffect(() => {
    if (loading || pending || busy || stopped.current) return;
    if (!dirty) {
      if (ownsDraft.current) {
        ownsDraft.current = false;
        void expenseDraft
          .clear()
          .then(() => setDraftState("idle"))
          .catch(() => {
            ownsDraft.current = true;
            setDraftState("error");
          });
      }
      return;
    }
    const timer = setTimeout(() => {
      if (!stopped.current) void persist();
    }, 350);
    return () => clearTimeout(timer);
  }, [serialized, loading, pending, busy]);
  useEffect(() => {
    const background = () => {
      if (
        document.visibilityState === "hidden" &&
        dirty &&
        !pending &&
        !stopped.current
      )
        void persist();
    };
    const back = () => requestClose();
    document.addEventListener("visibilitychange", background);
    window.addEventListener("sfo-expense-back", back);
    return () => {
      document.removeEventListener("visibilitychange", background);
      window.removeEventListener("sfo-expense-back", back);
    };
  }, [dirty, pending, busy, photoBusy]);
  const change = <K extends keyof ExpenseDraft>(
    key: K,
    next: ExpenseDraft[K],
  ) => setValue((previous) => ({ ...previous, [key]: next }));
  function requestClose() {
    if (busy || photoBusy) return;
    if (dirty) {
      setClosing(true);
      document.querySelector(".expense-editor")?.scrollTo(0, 0);
    } else if (ownsDraft.current) void discard(true);
    else onClose();
  }
  async function discard(close: boolean) {
    setBusy(true);
    stopped.current = true;
    try {
      await expenseDraft.clear();
      setPending(null);
      setClosing(false);
      if (close) onClose();
      else stopped.current = false;
    } catch {
      stopped.current = false;
      setError(
        say(
          "无法清除草稿，请重试。",
          "Could not discard the draft. Please retry.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function resume() {
    if (!pending) return;
    if (
      pending.id &&
      !(await (await getRepository()).read()).expenses.some(
        (e) => e.id === pending.id,
      )
    ) {
      setError(
        say(
          "这笔账目已被删除，请放弃此编辑草稿后新建。",
          "This expense was deleted. Discard its draft to start a new entry.",
        ),
      );
      return;
    }
    baseline.current = "restored";
    setValue(pending);
    setPending(null);
    setDraftState("saved");
  }
  async function select(file?: File | null) {
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    try {
      const data = await prepareReceipt(file);
      setValue((v) => ({ ...v, photoData: data, removePhoto: false }));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setPhotoBusy(false);
    }
  }
  const amount = Number(value.amount),
    tip = Number(value.tip);
  const total =
    Math.round((amount * (1 + tip / 100) + Number.EPSILON) * 100) / 100;
  const validFx = Number(value.usdCny) > 0 && Number(value.usdEur) > 0;
  const valid =
    value.amount !== "" &&
    amount > 0 &&
    amount <= 1e8 &&
    value.tip !== "" &&
    tip >= 0 &&
    tip <= 100 &&
    Number.isFinite(total) &&
    validFx;
  const preview = value.photoData
    ? "data:image/jpeg;base64," + value.photoData
    : value.removePhoto
      ? ""
      : existingUrl;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || photoBusy || !valid) return;
    setBusy(true);
    stopped.current = true;
    setError("");
    let committed = false;
    try {
      const form = new FormData();
      form.set(
        "data",
        JSON.stringify({
          clientId: value.clientId,
          date: value.date,
          description: value.description,
          category: value.category,
          currency: value.currency,
          amount,
          tip,
          usdCny: Number(value.usdCny),
          usdEur: Number(value.usdEur),
          rateInfo: value.rateInfo,
        }),
      );
      if (value.photoData)
        form.set(
          "photo",
          new File(
            [Uint8Array.from(atob(value.photoData), (c) => c.charCodeAt(0))],
            "receipt.jpg",
            { type: "image/jpeg" },
          ),
        );
      if (value.removePhoto) form.set("removePhoto", "true");
      const result = await recordExpense(form, saveToGallery, value.id);
      committed = true;
      await expenseDraft.clear().catch(() => {});
      try {
        localStorage.setItem("expense-currency:v1", value.currency);
      } catch {
        /* An expense is already committed; a preference failure must not duplicate it. */
      }
      await onSaved(result);
      onClose();
    } catch (e) {
      if (committed) onClose();
      else {
        stopped.current = false;
        setError(String((e as Error).message));
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay" onClick={requestClose}>
      <section
        className="modal expense-editor"
        role="dialog"
        aria-modal="true"
        aria-label={say(
          value.id ? "编辑账目" : "记录消费",
          value.id ? "Edit expense" : "Record expense",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="section-head editor-header">
          <h2>
            <FilePenLine size={20} />
            {say(
              value.id ? "编辑账目" : "记一笔消费",
              value.id ? "Edit expense" : "Add an expense",
            )}
          </h2>
          <button
            type="button"
            className="iconbutton"
            aria-label={say("关闭", "Close")}
            onClick={requestClose}
            disabled={busy || photoBusy}
          >
            <X />
          </button>
        </header>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">{say("正在读取草稿…", "Opening draft…")}</p>
        ) : draftReadFailed ? (
          <p>
            <button className="secondary" onClick={() => onClose()}>
              {say("关闭后重新打开以重试", "Close and reopen to retry")}
            </button>
          </p>
        ) : pending ? (
          <div className="draft-choice">
            <h3>{say("发现未完成的账目", "You have an unfinished expense")}</h3>
            <p>
              {pending.description || say("尚未填写描述", "No description yet")}
            </p>
            <button
              className="primary full"
              onClick={() =>
                void resume().catch((e) =>
                  setError(String((e as Error).message)),
                )
              }
            >
              {say("继续填写草稿", "Continue draft")}
            </button>
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => void discard(false)}
            >
              {say("放弃草稿，开始新记录", "Discard draft and start here")}
            </button>
          </div>
        ) : (
          <>
            {closing && (
              <div className="notice draft-choice" role="alert">
                <strong>
                  {say("保留这次填写的内容？", "Keep your unfinished changes?")}
                </strong>
                <button
                  type="button"
                  className="primary full"
                  disabled={busy}
                  onClick={() => setClosing(false)}
                >
                  {say("继续填写", "Keep editing")}
                </button>
                <button
                  type="button"
                  className="secondary full"
                  disabled={busy}
                  onClick={async () => {
                    if (await persist()) {
                      stopped.current = true;
                      onClose();
                    }
                  }}
                >
                  {say("暂存并关闭", "Keep draft and close")}
                </button>
                <button
                  type="button"
                  className="text-link danger"
                  disabled={busy}
                  onClick={() => void discard(true)}
                >
                  {say("放弃此次修改", "Discard changes")}
                </button>
              </div>
            )}
            <form onSubmit={(event) => void submit(event)}>
              <fieldset disabled={busy || photoBusy || closing}>
                <div className="form-grid">
                  <label className="label">
                    {t("金额")}
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      max="100000000"
                      required
                      value={value.amount}
                      placeholder="0.00"
                      onChange={(e) => change("amount", e.target.value)}
                    />
                  </label>
                  <label className="label">
                    {t("币种")}
                    <select
                      value={value.currency}
                      onChange={(e) =>
                        change(
                          "currency",
                          e.target.value as Expense["currency"],
                        )
                      }
                    >
                      {["USD", "EUR", "CNY"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    {t("小费 %")}
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={value.tip}
                      onChange={(e) => change("tip", e.target.value)}
                    />
                  </label>
                  <label className="label">
                    {t("消费日期（设备当地）")}
                    <input
                      type="date"
                      required
                      value={value.date}
                      onChange={(e) => change("date", e.target.value)}
                    />
                  </label>
                </div>
                <label className="label">
                  {t("分类")}
                  <select
                    value={value.category}
                    onChange={(e) => change("category", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  {t("描述")}
                  <textarea
                    required
                    maxLength={1000}
                    value={value.description}
                    placeholder={say(
                      "这笔消费是什么？",
                      "What was this expense for?",
                    )}
                    onChange={(e) => change("description", e.target.value)}
                  />
                </label>
                <div className="photo-upload">
                  {preview ? (
                    <>
                      <img
                        src={preview}
                        alt={say("凭证预览", "Receipt preview")}
                      />
                      <button
                        className="secondary"
                        type="button"
                        onClick={() =>
                          setValue((v) => ({
                            ...v,
                            photoData: null,
                            removePhoto: true,
                          }))
                        }
                      >
                        {say("移除凭证", "Remove receipt")}
                      </button>
                    </>
                  ) : (
                    <p className="fineprint">
                      {say(
                        "可添加一张凭证；开启相册保存时，提交账目后再另存。",
                        "Add a receipt. When gallery saving is enabled, a copy is created after the expense is saved.",
                      )}
                    </p>
                  )}
                  <div className="row">
                    <button
                      className="secondary"
                      type="button"
                      onClick={async () => {
                        setPhotoBusy(true);
                        try {
                          await select(await captureReceipt());
                        } catch (e) {
                          setError(String((e as Error).message));
                        } finally {
                          setPhotoBusy(false);
                        }
                      }}
                    >
                      <Camera size={17} />
                      {t("拍照")}
                    </button>
                    <label className="secondary file-picker">
                      <ImagePlus size={17} />
                      {t("相册")}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={busy || photoBusy}
                        onChange={(e) => void select(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
                <div className="calc-total">
                  <span>{t("含小费合计")}</span>
                  <strong>
                    {new Intl.NumberFormat(en ? "en-US" : "zh-CN", {
                      style: "currency",
                      currency: value.currency,
                    }).format(Number.isFinite(total) ? total : 0)}
                  </strong>
                </div>
                <details className="expense-reference" open={!validFx}>
                  <summary>
                    {say(
                      value.id ? "原记录的参考汇率" : "参考汇率",
                      value.id ? "Original exchange rates" : "Exchange rates",
                    )}
                  </summary>
                  <p className="fineprint">{t(value.rateInfo)}</p>
                  {value.id ? (
                    <p className="fineprint">
                      1 USD = {value.usdCny} CNY · {value.usdEur} EUR
                      <br />
                      {say(
                        "修改金额或币种时仍使用原汇率。",
                        "Edits keep the original exchange rates.",
                      )}
                    </p>
                  ) : (
                    <div className="form-grid">
                      <label className="label">
                        USD → CNY
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.000001"
                          max="1000000"
                          step="any"
                          required
                          value={value.usdCny}
                          onChange={(e) =>
                            setValue((v) => ({
                              ...v,
                              usdCny: e.target.value,
                              rateInfo: say(
                                "手动参考价",
                                "Manual reference rate",
                              ),
                            }))
                          }
                        />
                      </label>
                      <label className="label">
                        USD → EUR
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.000001"
                          max="1000000"
                          step="any"
                          required
                          value={value.usdEur}
                          onChange={(e) =>
                            setValue((v) => ({
                              ...v,
                              usdEur: e.target.value,
                              rateInfo: say(
                                "手动参考价",
                                "Manual reference rate",
                              ),
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </details>
                <footer className="editor-footer">
                  <small role="status">
                    {draftState === "saved"
                      ? say("草稿已保存在本机", "Draft saved on this device")
                      : draftState === "saving"
                        ? say("正在暂存…", "Saving draft…")
                        : say(
                            "未提交的内容仅保存在本机",
                            "Unfinished changes stay on this device",
                          )}
                  </small>
                  <button
                    className="primary full"
                    type="submit"
                    disabled={!valid || busy || photoBusy}
                  >
                    <Save size={17} />
                    {busy
                      ? say("正在保存…", "Saving…")
                      : say(
                          value.id ? "保存修改" : "保存账目",
                          value.id ? "Save changes" : "Save expense",
                        )}
                  </button>
                </footer>
              </fieldset>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
