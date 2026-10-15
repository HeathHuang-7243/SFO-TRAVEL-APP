"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  Wallet,
  LayoutDashboard,
  MapPin,
  CalendarDays,
  CloudSun,
  Plus,
  Camera,
  RefreshCw,
  Bookmark,
  Search,
  X,
  Download,
  Trash2,
  ShieldCheck,
  ChevronRight,
  Sun,
  CloudRain,
  Wind,
  Utensils,
  Plane,
  Building2,
  Ticket,
  Receipt,
  Check,
  Settings,
  ImagePlus,
} from "lucide-react";
import { attractions } from "../lib/attractions";
import { loadWeather } from "../services/public-data";
import { localApi as api } from "../services/local-api";
import BackupPanel from "./BackupPanel";
import ReceiptPhoto from "./ReceiptPhoto";
import { captureReceipt, exportFile } from "../services/device";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { translate } from "../lib/i18n";
import RateHistory from "../components/RateHistory";
import PlacePhoto from "../components/PlacePhoto";
import SettingsPanel from "./SettingsPanel";
import WelcomePanel from "./WelcomePanel";
import { useLanguage } from "./LanguageProvider";
import { shouldShowWelcome } from "../services/welcome";
import {
  readPreferences,
  writePreferences,
  type Preferences,
} from "../services/preferences";
import { saveReceiptToGallery } from "../services/native-device";
import { recordExpense } from "../services/save-expense";
import { savedExpenseValue } from "../lib/expense-rates";
import { heroMessages, homeGreeting, nextHeroIndex } from "../lib/home-copy";
import { availableCities, cityClock } from "../lib/city-clocks";
const deviceDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateLocal = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const stamp = (t: string, zone = "Asia/Shanghai") =>
  t
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: zone,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(t))
    : "—";
const weatherText = (n: number) =>
  n === 0
    ? "晴朗"
    : n < 4
      ? "多云"
      : n < 50
        ? "有雾"
        : n < 70
          ? "降雨"
          : n < 80
            ? "降雪"
            : n < 90
              ? "阵雨"
              : "雷暴";

const categories = ["餐饮", "交通", "住宿", "门票", "购物", "其他"];
export default function TravelApp() {
  const { lang, setLang } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(shouldShowWelcome);
  const [preferences, setPreferences] = useState(readPreferences);
  const [galleryFailure, setGalleryFailure] = useState<{
    path: string;
    message: string;
  } | null>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const selectedCities = preferences.cities.map(
    (name) => availableCities.find((city) => city.en === name)!,
  );
  const referenceCity = selectedCities[1];
  function changePreferences(next: Preferences) {
    writePreferences(next);
    setPreferences(next);
  }
  async function copyReceiptToGallery(path: string) {
    setGalleryBusy(true);
    try {
      await saveReceiptToGallery(path);
      setGalleryFailure(null);
      setToast(
        lang === "en"
          ? "Expense and gallery photo saved"
          : "账目及相册照片已保存",
      );
    } catch (error) {
      setGalleryFailure({
        path,
        message: String(error instanceof Error ? error.message : error),
      });
    } finally {
      setGalleryBusy(false);
    }
  }
  const [backupOpen, setBackupOpen] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [expenseBase, setExpenseBase] = useState<"CNY" | "EUR">("CNY");
  useEffect(() => {
    try {
      if (localStorage.getItem("expense-base") === "EUR") setExpenseBase("EUR");
    } catch {}
  }, []);
  function changeExpenseBase(base: "CNY" | "EUR") {
    setExpenseBase(base);
    try {
      localStorage.setItem("expense-base", base);
    } catch {}
  }
  const t = (text: string) => translate(text, lang);
  const money = (n: number, c = "CNY") =>
    new Intl.NumberFormat(lang === "en" ? "en-US" : "zh-CN", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 2,
    }).format(n);
  const clock = (zone: string) =>
    now
      ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "zh-CN", {
          timeZone: zone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(now)
      : "—";
  const external = (url: string, text: string) => (
    <a href={url} target="_blank" rel="noreferrer" className="text-link">
      {t(text)}
      <ArrowUpRight size={14} />
    </a>
  );
  const [history, setHistory] = useState<any>(null);
  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setToast("地址已复制");
    } catch {
      setToast("无法自动复制，请长按选择地址。");
    }
  }

  const [tab, setTab] = useState("home"),
    [now, setNow] = useState<Date | null>(null),
    [rates, setRates] = useState<any>(null),
    [weather, setWeather] = useState<any>(null),
    [catalogue, setCatalogue] = useState<any>(null),
    [expenses, setExpenses] = useState<any[]>([]),
    [favorites, setFavorites] = useState<string[]>([]),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState<Record<string, boolean>>({}),
    [toast, setToast] = useState("");
  const [amount, setAmount] = useState("100"),
    [currency, setCurrency] = useState("USD"),
    [tip, setTip] = useState("18"),
    [basis, setBasis] = useState("sell"),
    [manual, setManual] = useState({ USD: "", EUR: "" });
  const [modal, setModal] = useState(false),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState("餐饮"),
    [expenseDate, setExpenseDate] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [photoUrl, setPhotoUrl] = useState(""),
    [saving, setSaving] = useState(false);
  const [forecastDays, setForecastDays] = useState(3);
  const [visitDate, setVisitDate] = useState(""),
    [placeFilter, setPlaceFilter] = useState("all"),
    [place, setPlace] = useState<any>(null),
    [session, setSession] = useState<any>(null),
    [query, setQuery] = useState(""),
    [topic, setTopic] = useState("全部主题"),
    [type, setType] = useState("全部形式"),
    [onlyFav, setOnlyFav] = useState(false),
    [page, setPage] = useState(1),
    [expenseQuery, setExpenseQuery] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const heroMessage = heroMessages[heroIndex][lang];
  useEffect(() => {
    if (tab !== "home") return;
    setHeroIndex((index) => nextHeroIndex(index));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!document.hidden) setHeroIndex((index) => nextHeroIndex(index));
    }, 45000);
    return () => clearInterval(timer);
  }, [tab]);
  function navigate(next: string) {
    setTab(next);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [tab]);
  function changeForecastDays(days: number) {
    setForecastDays(days);
    const dates = weather?.daily?.time?.slice(0, days) || [];
    if (dates.length && !dates.includes(visitDate)) setVisitDate(dates[0]);
  }
  async function refresh(k: string, force = false) {
    setBusy((b) => ({ ...b, [k]: true }));
    try {
      const d =
        k === "weather"
          ? await loadWeather(force)
          : await api("/api/" + k + (force ? "?refresh=1" : ""), {
              cache: "no-store",
            });
      if (k === "rates") setRates(d);
      if (k === "rate-history") setHistory(d);
      if (k === "weather") {
        setWeather(d);
        setVisitDate((previous) =>
          d.daily?.time?.includes(previous)
            ? previous
            : d.daily?.time?.[0] || previous,
        );
      }
      if (k === "sessions") setCatalogue(d);
      if (k === "expenses") setExpenses(d);
      if (k === "favorites") setFavorites(d);
      setErrors((e) => ({ ...e, [k]: "" }));
    } catch (e) {
      setErrors((x) => ({ ...x, [k]: (e as Error).message }));
    } finally {
      setBusy((b) => ({ ...b, [k]: false }));
    }
  }
  useEffect(() => {
    setNow(new Date());
    setExpenseDate(deviceDate());
    setVisitDate(dateLocal());
    ["rates", "weather", "sessions", "rate-history"].forEach((k) => refresh(k));
    refresh("expenses");
    refresh("favorites");
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!photo) {
      setPhotoUrl("");
      return;
    }
    const u = URL.createObjectURL(photo);
    setPhotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);
  useEffect(() => setPage(1), [query, topic, type, onlyFav]);
  const rate = (c: string) =>
    c === "CNY"
      ? 1
      : basis === "manual"
        ? Number(manual[c as "USD" | "EUR"]) || 0
        : rates?.rates?.[c]?.[basis] || 0;
  const usdCny = rate("USD"),
    usdEur = rate("EUR") > 0 ? rate("USD") / rate("EUR") : 0;
  const snapshotValid =
    Number.isFinite(usdCny) &&
    usdCny > 0 &&
    Number.isFinite(usdEur) &&
    usdEur > 0;
  const expenseSum = expenses.reduce(
      (sum, e) => sum + (savedExpenseValue(e, expenseBase) ?? 0),
      0,
    ),
    missingBase = expenses.filter(
      (e) => savedExpenseValue(e, expenseBase) === null,
    ).length;
  const base = Number(amount),
    pct = Number(tip),
    valid =
      amount !== "" &&
      tip !== "" &&
      Number.isFinite(base) &&
      base > 0 &&
      base <= 1e8 &&
      Number.isFinite(pct) &&
      pct >= 0 &&
      pct <= 100;
  const tipAmount = valid ? Math.round(base * pct) / 100 : 0,
    total = valid
      ? Math.round((base * (1 + pct / 100) + Number.EPSILON) * 100) / 100
      : 0;
  const expenseReferenceTotal =
    currency === expenseBase
      ? total
      : rate(currency) > 0 && rate(expenseBase) > 0
        ? (total * rate(currency)) / rate(expenseBase)
        : null;
  const rateNote =
    basis === "manual"
      ? "手动参考价"
      : `招商银行现汇${basis === "sell" ? "卖出" : "买入"}价 · ${rates?.rates?.USD?.time || ""}${rates?.stale ? " · 历史快照" : ""}`;
  const allSessions = catalogue?.sessions || [];
  const topics = [
    "全部主题",
    ...Array.from(
      new Set<string>(allSessions.flatMap((s: any) => s.topics)),
    ).sort(),
  ];
  const types = [
    "全部形式",
    ...Array.from(new Set<string>(allSessions.map((s: any) => s.type))).sort(),
  ];
  const filtered = allSessions.filter(
    (s: any) =>
      (!onlyFav || favorites.includes(s.id)) &&
      (topic === "全部主题" || s.topics.includes(topic)) &&
      (type === "全部形式" || s.type === type) &&
      `${s.title} ${s.description} ${s.speakers} ${s.code}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const wi = weather?.daily?.time?.indexOf(visitDate) ?? -1;
  const day =
    wi >= 0
      ? {
          rain: weather.daily.precipitation_probability_max[wi],
          wind: weather.daily.wind_speed_10m_max[wi],
          code: weather.daily.weather_code[wi],
          max: weather.daily.temperature_2m_max[wi],
          min: weather.daily.temperature_2m_min[wi],
        }
      : null;
  const advice = (a: any) =>
    !day
      ? "暂无该日预报"
      : !a.outdoor
        ? "室内行程可考虑"
        : day.code >= 95
          ? "雷暴预报，建议改期"
          : day.wind >= 35
            ? "风较大，建议室内"
            : day.rain >= 50
              ? "降雨概率高，建议室内"
              : "天气较适合户外";
  const displayExpenses = expenses.filter((e) =>
    `${e.description} ${t(e.category)} ${e.date}`
      .toLowerCase()
      .includes(expenseQuery.toLowerCase()),
  );
  function openExpense() {
    setDescription("");
    setCategory("餐饮");
    setPhoto(null);
    setExpenseDate(deviceDate());
    setModal(true);
  }
  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !snapshotValid) return;
    setSaving(true);
    try {
      const f = new FormData();
      f.set(
        "data",
        JSON.stringify({
          date: expenseDate,
          description,
          category,
          currency,
          amount: base,
          tip: pct,
          usdCny,
          usdEur,
          rateInfo: rateNote,
        }),
      );
      if (photo) f.set("photo", photo);
      const result = await recordExpense(f, preferences.saveToGallery);
      setModal(false);
      setPhoto(null);
      await refresh("expenses");
      setToast(
        result.gallerySaved
          ? lang === "en"
            ? "Expense and gallery photo saved"
            : "账目及相册照片已保存"
          : "账目已保存",
      );
      if (result.galleryError && result.expense.photo_key) {
        setGalleryFailure({
          path: result.expense.photo_key,
          message: result.galleryError,
        });
      }
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function selectPhoto(file?: File) {
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) throw Error("请选择照片");
      if (file.size > 25 * 1024 * 1024) throw Error("原始照片请小于 25 MB");
      const img = new Image();
      const url = URL.createObjectURL(file);
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(Error("无法读取此照片，请选择 JPG 或 PNG"));
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        const ratio = Math.min(1, 1800 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas
          .getContext("2d")!
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85),
        );
        if (!blob) throw Error("照片处理失败");
        setPhoto(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function removeExpense(id: string) {
    if (!confirm(t("删除这笔账目及其照片？"))) return;
    try {
      await api("/api/expenses?id=" + encodeURIComponent(id), {
        method: "DELETE",
      });
      await refresh("expenses");
      setToast("账目已删除");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function favorite(id: string) {
    try {
      const selected = !favorites.includes(id);
      await api("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, selected }),
      });
      setFavorites((x) => (selected ? [...x, id] : x.filter((s) => s !== id)));
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function exportCsv() {
    const cell = (v: any) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const lines = [
      [
        "日期",
        "分类",
        "描述",
        "币种",
        "原金额",
        "小费百分比",
        "含小费总额",
        "人民币参考金额",
        "汇率来源",
        "欧元参考金额",
        "USD→CNY",
        "USD→EUR",
        "汇率保存时间",
      ],
      ...displayExpenses.map((e) => [
        e.date,
        e.category,
        e.description,
        e.currency,
        e.amount,
        e.tip,
        e.total,
        e.cny,
        e.rate_info,
        savedExpenseValue(e, "EUR"),
        e.usd_cny,
        e.usd_eur,
        e.rate_snapshot_at,
      ]),
    ];
    try {
      await exportFile(
        "san-francisco-expenses.csv",
        "\ufeff" +
          lines
            .map((r, index) =>
              r
                .map((v) =>
                  cell(index === 0 && typeof v === "string" ? t(v) : v),
                )
                .join(","),
            )
            .join("\r\n"),
        "text/csv;charset=utf-8",
      );
    } catch (e) {
      setToast(String(e));
    }
  }
  useEffect(() => {
    function closeOverlay() {
      if (welcomeOpen) {
        setWelcomeOpen(false);
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (document.querySelector(".receipt-view")) {
        window.dispatchEvent(new Event("sfo-close-overlay"));
        return;
      }
      if (backupOpen) {
        window.dispatchEvent(new Event("sfo-backup-back"));
        return;
      }
      if (modal) {
        if (!saving) setModal(false);
        return;
      }
      if (place) {
        setPlace(null);
        return;
      }
      if (session) {
        setSession(null);
        return;
      }
      if (tab !== "home") navigate("home");
      else if (Capacitor.isNativePlatform()) void NativeApp.exitApp();
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeOverlay();
      }
    };
    window.addEventListener("keydown", escape);
    const listener = Capacitor.isNativePlatform()
      ? NativeApp.addListener("backButton", closeOverlay)
      : null;
    return () => {
      window.removeEventListener("keydown", escape);
      void listener?.then((h) => h.remove());
    };
  }, [
    welcomeOpen,
    settingsOpen,
    backupOpen,
    modal,
    saving,
    place,
    session,
    tab,
  ]);
  const nav = [
    { id: "home", name: "出差概览", en: "Overview", icon: LayoutDashboard },
    {
      id: "money",
      name: "汇率与小费",
      en: "Currency & tips",
      icon: ArrowLeftRight,
    },
    { id: "expenses", name: "旅行账本", en: "Travel expenses", icon: Wallet },
    { id: "explore", name: "天气与探索", en: "Explore the city", icon: MapPin },
    {
      id: "ignite",
      name: "Ignite 会议",
      en: "Session planner",
      icon: CalendarDays,
    },
  ];
  const refreshButton = (k: string) => (
    <button
      className="iconbutton"
      aria-label={t("刷新")}
      disabled={busy[k]}
      onClick={() => refresh(k, true)}
    >
      <RefreshCw size={16} className={busy[k] ? "spin" : ""} />
    </button>
  );
  function calc(compact = false) {
    return (
      <section className={"card converter " + (compact ? "compact" : "")}>
        <div className="section-head">
          <div>
            <span className="eyebrow">CURRENCY & TIPS</span>
            <h2>{t("每一笔，心中有数")}</h2>
          </div>
          <div className="iconbox">
            <ArrowLeftRight size={20} />
          </div>
        </div>
        <div className="row between">
          <span className="source-pill">
            <span />
            {t("招商银行牌价")}
          </span>
          {refreshButton("rates")}
        </div>
        {errors.rates && <p className="notice">{t(errors.rates)}</p>}
        {rates?.stale && (
          <p className="notice">
            {t(rates.warning || t("当前为历史快照，请刷新后核对。"))}
          </p>
        )}
        <label className="label">
          {t("消费金额（小费前）")}
          <div className="amount-input">
            <input
              aria-label={t("消费金额")}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              aria-label={t("币种")}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {["USD", "EUR", "CNY"].map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </div>
        </label>
        <div className="row between">
          <label htmlFor="tip">{t("小费比例")}</label>
          <div className="tip-custom">
            <input
              id="tip"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            />
            <span>%</span>
          </div>
        </div>
        <div className="tip-options">
          {[0, 15, 18, 20, 25].map((n) => (
            <button
              key={n}
              className={pct === n ? "selected" : ""}
              onClick={() => setTip(String(n))}
            >
              {n}%
            </button>
          ))}
        </div>
        <div className="calc-total">
          <span>
            {t("含小费合计")}
            <small>
              {t("小费 ")}
              {money(tipAmount, currency)}
            </small>
          </span>
          <strong>{money(total, currency)}</strong>
        </div>
        <div className="converted">
          {["CNY", "USD", "EUR"]
            .filter((c) => c !== currency)
            .map((c) => (
              <div key={c}>
                <span>
                  {c === "CNY"
                    ? t("人民币")
                    : c === "EUR"
                      ? t("欧元")
                      : t("美元")}
                </span>
                <b>
                  {rate(currency) && rate(c)
                    ? money((total * rate(currency)) / rate(c), c)
                    : t("等待汇率")}
                </b>
              </div>
            ))}
        </div>
        <label className="label small-label">
          {t("参考牌价")}
          <select value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="sell">{t("现汇卖出价 · 购汇预算参考")}</option>
            <option value="buy">{t("现汇买入价 · 结汇估值参考")}</option>
            <option value="manual">{t("手动输入参考汇率")}</option>
          </select>
        </label>
        {basis === "manual" && (
          <div className="form-grid">
            {(["USD", "EUR"] as const).map((c) => (
              <label key={c} className="label">
                1 {c} = CNY
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={manual[c]}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, [c]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        )}
        <p className="fineprint">
          {basis === "manual"
            ? t("使用你输入的汇率。")
            : t(rates?.rates?.USD?.time) || t("正在读取招行牌价…")}
          <br />
          {t(
            "同一牌价经人民币交叉换算，仅作估值；实际换汇有买卖价差，银行卡结算价可能不同。小费按输入金额计算。",
          )}
        </p>
        {!valid && (
          <p className="notice">
            {t("请输入有效金额，小费需在 0–100% 之间。")}
          </p>
        )}
        <button
          className="primary full"
          disabled={!valid}
          onClick={openExpense}
        >
          <Plus size={17} />
          {t("将这笔消费记入账本")}
          <ArrowRight size={16} />
        </button>
      </section>
    );
  }
  function sessionCard(s: any) {
    return (
      <article key={s.id} className="session-card">
        <div className="row between">
          <span className="badge">
            {s.type} <span className="muted">/ {s.code}</span>
          </span>
          <button
            className={
              "iconbutton " + (favorites.includes(s.id) ? "saved" : "")
            }
            onClick={() => favorite(s.id)}
            aria-label={
              favorites.includes(s.id) ? t("取消收藏") : t("收藏会议")
            }
          >
            <Bookmark
              size={18}
              fill={favorites.includes(s.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <button
          type="button"
          className="session-title"
          aria-haspopup="dialog"
          aria-label={`${t("查看详情")} · ${s.title}`}
          onClick={() => setSession(s)}
        >
          {s.title}
        </button>
        <p className="session-desc">{s.description}</p>
        <div className="tags">
          {s.topics.slice(0, 3).map((t: string) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="session-foot">
          <div className="session-schedule">
            <span className="schedule-status">
              <CalendarDays size={14} />
              {s.instances.some((i: any) => i.start)
                ? t("已有部分时间")
                : s.instances.some((i: any) => i.timeSlot)
                  ? t("已有时间段 · 日期待定")
                  : t("日期时间待公布")}
            </span>
            {s.instances.length === 1 && s.instances[0].room && (
              <span className="session-venue">
                <MapPin size={14} />
                {s.instances[0].room}
              </span>
            )}
            {s.instances.length > 1 && (
              <span className="session-instance-count">
                {s.instances.length} {lang === "en" ? "instances" : "个场次"}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            className="text-link"
            onClick={() => setSession(s)}
          >
            {t("查看详情")}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </article>
    );
  }
  return (
    <div className="app">
      <nav
        className="app-tabs"
        aria-label={lang === "en" ? "Main tabs" : "主要功能"}
      >
        {nav.map((n) => (
          <button
            key={n.id}
            className={tab === n.id ? "active" : ""}
            aria-current={tab === n.id ? "page" : undefined}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={20} />
            <span>{t(n.name)}</span>
          </button>
        ))}
      </nav>
      <div className="main">
        {!online && (
          <div className="offline-banner" role="status">
            {lang === "en"
              ? "Offline · Local records remain available"
              : "离线模式 · 本地账本仍可使用"}
          </div>
        )}
        <header className="topbar">
          <button
            className="settings-trigger"
            aria-label={lang === "en" ? "Settings" : "设置中心"}
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={22} />
            <span>{lang === "en" ? "Settings" : "设置"}</span>
          </button>
          <div className="app-heading">
            <strong>{t("湾区随行")}</strong>
          </div>
          <div className="clocks">
            {selectedCities.map((city, index) => {
              const state = now
                ? cityClock(now, city, referenceCity.zone)
                : null;
              const delta = state?.difference || 0;
              const label = city[lang];
              const solarTime = (d: Date) =>
                new Intl.DateTimeFormat("en-GB", {
                  timeZone: city.zone,
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                }).format(d);
              const detail = state
                ? `${lang === "en" ? "Sunrise" : "日出"} ${solarTime(state.sunrise)} · ${lang === "en" ? "Sunset" : "日落"} ${solarTime(state.sunset)}`
                : "";
              return (
                <span
                  key={index}
                  className={
                    "city-clock " +
                    (state
                      ? state.daytime
                        ? "clock-day"
                        : "clock-night"
                      : "clock-loading")
                  }
                  title={detail}
                >
                  <small>{label}</small>
                  <b>
                    {clock(city.zone)}
                    {delta !== 0 && (
                      <sup
                        className="date-offset"
                        title={
                          lang === "en"
                            ? `Date relative to ${referenceCity.en}`
                            : `相对${referenceCity.zh}日期`
                        }
                        aria-label={
                          lang === "en"
                            ? `${Math.abs(delta)} day ${delta > 0 ? "ahead of" : "behind"} ${referenceCity.en}`
                            : `比${referenceCity.zh}${delta > 0 ? "快" : "慢"}${Math.abs(delta)}天`
                        }
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </sup>
                    )}
                  </b>
                </span>
              );
            })}
          </div>
        </header>
        <main className={tab === "home" ? "home-page" : undefined}>
          {galleryFailure && (
            <div className="notice gallery-notice" role="alert">
              <strong>
                {lang === "en"
                  ? "Expense saved; gallery copy failed"
                  : "账目已保存，相册副本未保存"}
              </strong>
              <p>{galleryFailure.message}</p>
              <button
                className="secondary"
                disabled={galleryBusy}
                onClick={() => copyReceiptToGallery(galleryFailure.path)}
              >
                {lang === "en" ? "Retry gallery copy" : "重试保存到相册"}
              </button>
              <button
                className="iconbutton"
                aria-label={
                  lang === "en" ? "Dismiss gallery notice" : "关闭相册提示"
                }
                onClick={() => setGalleryFailure(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="page-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">SAN FRANCISCO · 2026</div>
                <h1>
                  {tab === "home"
                    ? homeGreeting(now, lang, heroIndex)
                    : tab === "money"
                      ? t("汇率与小费")
                      : tab === "expenses"
                        ? t("让每一笔，都有记录。")
                        : tab === "explore"
                          ? t("工作之外，探索海湾。")
                          : t("把下一次灵感，排进行程。")}
                </h1>
                <p>
                  {tab === "home"
                    ? lang === "en"
                      ? "Your plans, expenses and places, all in one place."
                      : "行程、开销与城市探索，在这里轻松安排。"
                    : tab === "money"
                      ? t("三种货币，自由换算；从小费计算到一键记账。")
                      : tab === "expenses"
                        ? t("保存消费、照片与备注，随时回看出差开销。")
                        : tab === "explore"
                          ? t("先看天气，再挑选适合当天的目的地。")
                          : t("来自 Microsoft Ignite 官方目录的真实会议内容。")}
                </p>
              </div>
              {tab !== "ignite" && (
                <button className="primary" onClick={openExpense}>
                  <Plus size={17} />
                  {t("记一笔")}
                </button>
              )}
            </div>
            {tab === "home" && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <span className="hero-tag">
                      <MapPin size={14} /> CALIFORNIA, USA
                    </span>
                    <h2 className="rotating-message">
                      <span>{heroMessage[0]}</span>
                      <span>{heroMessage[1]}</span>
                    </h2>
                    <p>{t("你的旧金山出差随行手册")}</p>
                    <button onClick={() => navigate("explore")}>
                      {t("探索这座城市")}
                      <ArrowUpRight size={17} />
                    </button>
                  </div>
                  <img src="/bridge.svg" alt={t("金门大桥插画")} />
                  <div className="hero-caption">
                    37.7749° N &nbsp; 122.4194° W
                  </div>
                </section>
                <div className="stat-grid">
                  <button className="stat" onClick={() => navigate("expenses")}>
                    <span className="iconbox">
                      <Wallet size={21} />
                    </span>
                    <div>
                      <small>
                        {t(
                          expenseBase === "EUR"
                            ? "累计开销 · 欧元参考"
                            : "累计开销 · 人民币参考",
                        )}
                      </small>
                      <strong>{money(expenseSum, expenseBase)}</strong>
                      <p>
                        {expenses.length}
                        {t(" 笔记录")}
                        {missingBase
                          ? lang === "en"
                            ? ` · ${missingBase} excluded: no historical rate`
                            : ` · ${missingBase} 笔缺少历史汇率，未计入`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                  <button className="stat" onClick={() => navigate("explore")}>
                    <span className="iconbox amber">
                      <CloudSun size={23} />
                    </span>
                    <div>
                      <small>
                        {weather?.stale
                          ? t("旧金山最近天气（缓存）")
                          : t("旧金山当前天气")}
                      </small>
                      <strong>
                        {weather?.current
                          ? `${Math.round(weather.current.temperature_2m)}°`
                          : "—"}{" "}
                        <em>
                          {weather?.current
                            ? t(weatherText(weather.current.weather_code))
                            : t("等待更新")}
                        </em>
                      </strong>
                      <p>
                        {t("当地 ")}
                        {weather?.current?.time?.replace("T", " ") ||
                          t("实时天气加载中")}
                      </p>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                  <button
                    className="stat"
                    onClick={() => {
                      setOnlyFav(true);
                      navigate("ignite");
                    }}
                  >
                    <span className="iconbox purple">
                      <Bookmark size={21} />
                    </span>
                    <div>
                      <small>{t("我的 Ignite 收藏")}</small>
                      <strong>
                        {favorites.length}
                        <em>{t("场会议")}</em>
                      </strong>
                      <p>{t("为感兴趣的内容留个位置")}</p>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                </div>
                <div className="dashboard-grid">
                  {calc(true)}
                  <div className="right-stack">
                    <section className="card ignite-promo">
                      <div className="row between">
                        <span className="eyebrow">MICROSOFT IGNITE</span>
                        <span className="badge">{t("官方会议目录")}</span>
                      </div>
                      <h2>{t("面向下一次突破。")}</h2>
                      <p>
                        {t("探索 Cloud & AI、Copilot 与 Security，")}
                        <br />
                        {t("收藏你感兴趣的 session。")}
                      </p>
                      <div className="ignite-mark">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate("ignite")}
                      >
                        {t("浏览 ")}
                        {allSessions.length || t("全部")}
                        {t(" 场会议")}
                        <ArrowUpRight size={17} />
                      </button>
                    </section>
                    <section className="card">
                      <div className="section-head">
                        <h2>{t("最近的开销")}</h2>
                        <button
                          className="text-link"
                          onClick={() => navigate("expenses")}
                        >
                          {t("全部")}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                      {errors.expenses ? (
                        <p className="notice">{t(errors.expenses)}</p>
                      ) : expenses.length ? (
                        expenses.slice(0, 3).map((e) => (
                          <div key={e.id} className="recent-row">
                            <span className="iconbox">
                              <Receipt size={17} />
                            </span>
                            <div>
                              <b>{e.description}</b>
                              <small>
                                {e.date} · {t(e.category)}
                              </small>
                            </div>
                            <div className="recent-value">
                              <strong>
                                {savedExpenseValue(e, expenseBase) !== null
                                  ? money(
                                      savedExpenseValue(e, expenseBase)!,
                                      expenseBase,
                                    )
                                  : "—"}
                              </strong>
                              {e.currency !== expenseBase && (
                                <small>{money(e.total, e.currency)}</small>
                              )}
                              {savedExpenseValue(e, expenseBase) === null && (
                                <small>{t("缺少历史汇率")}</small>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty compact-empty">
                          <Receipt size={30} />
                          <h3>{t("旅程从第一笔开始")}</h3>
                          <p>{t("一张照片、一句备注，轻松留下消费记录。")}</p>
                          <button className="text-link" onClick={openExpense}>
                            {t("添加第一笔")}
                            <Plus size={15} />
                          </button>
                        </div>
                      )}
                    </section>
                    <div className="soft-note">
                      <ShieldCheck size={21} />
                      <p>
                        {t("为你保留每个细节")}
                        <small>
                          {t("账目与照片仅保存在本机，请定期导出加密备份。")}
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {tab === "money" && (
              <>
                <div className="money-layout">
                  {calc()}
                  <div className="card rate-guide">
                    <div className="row between">
                      <span className="eyebrow">EXCHANGE REFERENCE</span>
                      <button
                        className="secondary"
                        disabled={busy.rates}
                        onClick={() => refresh("rates", true)}
                      >
                        <RefreshCw
                          size={15}
                          className={busy.rates ? "spin" : ""}
                        />
                        {t("刷新参考汇率")}
                      </button>
                    </div>
                    <h2>{t("看清汇率，再算预算。")}</h2>
                    <p>
                      {t(
                        "招行原牌价以每 100 单位外币列示。这里已换算为每 1 单位外币，方便估算。",
                      )}
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>{t("币种")}</th>
                          <th>{t("现汇买入")}</th>
                          <th>{t("现汇卖出")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {["USD", "EUR"].map((c) => (
                          <tr key={c}>
                            <td>{c}</td>
                            <td>
                              ¥ {rates?.rates?.[c]?.buy?.toFixed(4) || "—"}
                            </td>
                            <td>
                              ¥ {rates?.rates?.[c]?.sell?.toFixed(4) || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="info-item">
                      <span>01</span>
                      <div>
                        <h3>{t("购汇预算")}</h3>
                        <p>{t("用人民币购买外币，参考银行卖出价。")}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <span>02</span>
                      <div>
                        <h3>{t("结汇估值")}</h3>
                        <p>{t("把外币卖给银行，参考银行买入价。")}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <span>03</span>
                      <div>
                        <h3>{t("记账时保留快照")}</h3>
                        <p>
                          {t(
                            "保存当时的牌价说明与人民币参考金额。之后汇率变化不会改写旧账。",
                          )}
                        </p>
                      </div>
                    </div>
                    {external(
                      "https://fx.cmbchina.com/hq",
                      t("查看招商银行官方牌价"),
                    )}
                    <p className="fineprint">
                      {t(
                        "数据刷新间隔至少 5 分钟。此处不是交易报价或报销结算凭证。",
                      )}
                    </p>
                    <p className="fineprint">
                      {t("最近更新 ")}
                      {stamp(rates?.retrievedAt)}
                    </p>
                    {rates?.stale && (
                      <p className="notice">{t(rates.warning)}</p>
                    )}
                  </div>
                </div>
                <RateHistory
                  lang={lang}
                  data={history}
                  busy={!!busy["rate-history"]}
                  error={errors["rate-history"]}
                  onRefresh={() => refresh("rate-history", true)}
                />
              </>
            )}
            {tab === "expenses" && (
              <>
                <div className="expense-summary">
                  <div>
                    <div className="expense-base-control">
                      <label htmlFor="expense-base">{t("汇总币种")}</label>
                      <select
                        id="expense-base"
                        value={expenseBase}
                        onChange={(e) =>
                          changeExpenseBase(e.target.value as "CNY" | "EUR")
                        }
                      >
                        <option value="CNY">CNY · {t("人民币")}</option>
                        <option value="EUR">EUR · {t("欧元")}</option>
                      </select>
                    </div>
                    <span>
                      {expenseBase === "EUR"
                        ? t("累计欧元参考金额")
                        : t("累计人民币参考金额")}
                    </span>
                    <strong>{money(expenseSum, expenseBase)}</strong>
                    <small>
                      {expenses.length} {t("笔开销")} ·{" "}
                      {t("按每笔保存的汇率汇总")}
                    </small>
                    {missingBase > 0 && (
                      <p className="notice">
                        {missingBase}{" "}
                        {t("笔旧记录缺少历史汇率，未计入当前币种汇总。")}
                      </p>
                    )}
                  </div>
                  <div className="currency-sums">
                    {["USD", "EUR", "CNY"].map((c) => (
                      <div key={c}>
                        <small>
                          {c}
                          {t(" 原币合计")}
                        </small>
                        <b>
                          {money(
                            expenses
                              .filter((e) => e.currency === c)
                              .reduce((s, e) => s + e.total, 0),
                            c,
                          )}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
                <section className="card">
                  <div className="toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        placeholder={t("搜索描述、分类或日期")}
                        value={expenseQuery}
                        onChange={(e) => setExpenseQuery(e.target.value)}
                      />
                    </label>
                    <div className="row">
                      {refreshButton("expenses")}
                      <button
                        className="secondary"
                        disabled={!displayExpenses.length}
                        onClick={exportCsv}
                      >
                        <Download size={16} />
                        {t("导出 CSV")}
                      </button>
                    </div>
                  </div>
                  {errors.expenses && (
                    <p className="notice">{t(errors.expenses)}</p>
                  )}
                  {!displayExpenses.length ? (
                    <div className="empty">
                      <Wallet size={40} />
                      <h3>
                        {expenseQuery
                          ? t("没有匹配的记录")
                          : t("账本还是空白的")}
                      </h3>
                      <p>{t("记录消费金额、小费、照片和描述。")}</p>
                      <button className="primary" onClick={openExpense}>
                        <Plus size={16} />
                        {t("新增消费")}
                      </button>
                    </div>
                  ) : (
                    <div className="expense-list">
                      {displayExpenses.map((e) => (
                        <article key={e.id} className="expense-row">
                          {e.photo_key ? (
                            <ReceiptPhoto
                              path={e.photo_key}
                              description={e.description}
                            />
                          ) : (
                            <div className="receipt-thumb no-photo">
                              <Receipt size={23} />
                            </div>
                          )}
                          <div className="expense-detail">
                            <strong>{e.description}</strong>
                            <span>
                              {e.date} · {t(e.category)}
                              {t(" · 小费 ")}
                              {e.tip}%
                            </span>
                            <small>{t(e.rate_info || "")}</small>
                            <small className="saved-fx">
                              {e.usd_cny && e.usd_eur
                                ? `1 USD = ${e.usd_cny.toFixed(4)} CNY · ${e.usd_eur.toFixed(6)} EUR`
                                : t("旧记录未保存完整汇率快照")}
                            </small>
                          </div>
                          <div className="expense-value">
                            <strong>{money(e.total, e.currency)}</strong>
                            <small>
                              {savedExpenseValue(e, expenseBase) !== null
                                ? "≈ " +
                                  money(
                                    savedExpenseValue(e, expenseBase)!,
                                    expenseBase,
                                  )
                                : t("缺少历史汇率")}
                            </small>
                          </div>
                          <button
                            className="iconbutton danger"
                            aria-label={t("删除账目")}
                            onClick={() => removeExpense(e.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
            {tab === "explore" && (
              <>
                <section className="weather-panel">
                  <div>
                    <span className="eyebrow">
                      SAN FRANCISCO WEATHER · {forecastDays}
                      {t(" 天预报")}
                    </span>
                    <div className="row">
                      <CloudSun size={40} />
                      <h2>
                        {day
                          ? `${Math.round(day.max)}° / ${Math.round(day.min)}°`
                          : t("等待天气")}
                        <small>
                          {day
                            ? t(weatherText(day.code))
                            : busy.weather
                              ? t("正在获取")
                              : errors.weather
                                ? t("获取失败")
                                : t("请选择日期")}
                        </small>
                      </h2>
                    </div>
                    <p>
                      {day
                        ? lang === "en"
                          ? `Rain probability ${day.rain}% · Max wind ${day.wind} km/h`
                          : `降雨概率 ${day.rain}% · 最大风速 ${day.wind} km/h`
                        : !weather
                          ? busy.weather
                            ? t("正在获取最新天气数据…")
                            : t("天气数据暂未取得，请点击刷新重试。")
                          : t("该日期不在可用预报范围内，请选择预报中的日期。")}
                    </p>
                  </div>
                  <div className="weather-date">
                    <label className="label">
                      {t("计划出行日期 · 旧金山时间")}
                      <input
                        type="date"
                        value={visitDate}
                        min={weather?.daily?.time?.[0]}
                        max={weather?.daily?.time?.[forecastDays - 1]}
                        disabled={!weather?.daily?.time?.length}
                        onChange={(e) => setVisitDate(e.target.value)}
                      />
                    </label>
                    <div className="row weather-actions">
                      {external(
                        "https://forecast.weather.gov/MapClick.php?lat=37.7749&lon=-122.4194",
                        lang === "en"
                          ? "San Francisco forecast"
                          : "旧金山天气预报",
                      )}
                      {refreshButton("weather")}
                    </div>
                  </div>
                </section>
                {errors.weather && (
                  <p className="notice">{t(errors.weather)}</p>
                )}
                {weather?.stale && (
                  <p className="notice">{t(weather.warning)}</p>
                )}
                <div className="row between forecast-controls">
                  <span className="muted">
                    {weather?.stale
                      ? lang === "en"
                        ? "Saved forecast dates · San Francisco"
                        : "已保存的预报日期 · 旧金山当地时间"
                      : t("旧金山当地日期 · 从今天起")}
                  </span>
                  <div
                    className="pills"
                    role="group"
                    aria-label={t("预报天数")}
                  >
                    {[3, 15].map((days) => (
                      <button
                        key={days}
                        aria-pressed={forecastDays === days}
                        className={forecastDays === days ? "selected" : ""}
                        onClick={() => changeForecastDays(days)}
                      >
                        {days}
                        {t(" 天预报")}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={
                    "forecast-strip " +
                    (forecastDays === 15
                      ? "forecast-extended"
                      : "forecast-three")
                  }
                >
                  {weather?.daily?.time
                    ?.slice(0, forecastDays)
                    .map((d: string, i: number) => (
                      <button
                        key={d}
                        className={d === visitDate ? "selected" : ""}
                        onClick={() => setVisitDate(d)}
                      >
                        <span>
                          {!weather?.stale && i === 0
                            ? t("今天")
                            : !weather?.stale && i === 1
                              ? t("明天")
                              : !weather?.stale && i === 2
                                ? t("后天")
                                : d.slice(5)}
                        </span>
                        {i < 3 && <small>{d.slice(5)}</small>}
                        {weather.daily.weather_code[i] < 4 ? (
                          <Sun size={22} />
                        ) : (
                          <CloudRain size={22} />
                        )}
                        <b>
                          {Math.round(weather.daily.temperature_2m_max[i])}°
                        </b>
                        <small>
                          {weather.daily.precipitation_probability_max[i]}
                          {t("% 降雨")}
                        </small>
                      </button>
                    ))}
                </div>
                <p className="fineprint">
                  {t(
                    "可切换今天起的 3 天或 15 天预报。较远日期的不确定性更高，出行前请再次核对。天气成功获取后缓存 15 分钟。更新：",
                  )}
                  {stamp(weather?.retrievedAt)}
                  {t(
                    "（北京时间）。建议基于全市天气：降雨概率 ≥50%、风速 ≥35 km/h 或雷暴时优先室内；不代表景点营业或航船状态。",
                  )}
                </p>
                <details className="weather-credit">
                  <summary>
                    {lang === "en" ? "Weather credits" : "天气数据署名"}
                  </summary>
                  <p>
                    {external("https://open-meteo.com/", "Open-Meteo")} ·{" "}
                    {external(
                      "https://creativecommons.org/licenses/by/4.0/",
                      "CC BY 4.0",
                    )}
                  </p>
                </details>
                <div className="section-head explore-heading">
                  <div>
                    <span className="eyebrow">A LITTLE TIME FOR THE CITY</span>
                    <h2>{t("选一个目的地，出发吧。")}</h2>
                  </div>
                  <div className="pills">
                    {[
                      ["all", t("全部")],
                      ["outdoor", t("户外")],
                      ["indoor", t("室内")],
                      ["important", t("重要")],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        className={placeFilter === v ? "selected" : ""}
                        onClick={() => setPlaceFilter(v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="places-grid">
                  {attractions
                    .filter(
                      (a) =>
                        placeFilter === "all" ||
                        (placeFilter === "important"
                          ? a.important
                          : placeFilter === "outdoor"
                            ? a.outdoor
                            : !a.outdoor),
                    )
                    .map((a) => (
                      <article className="place-card" key={a.id}>
                        <button
                          type="button"
                          className={"place-art " + a.id}
                          style={{ backgroundColor: a.color }}
                          onClick={() => setPlace(a)}
                          aria-haspopup="dialog"
                          aria-label={
                            lang === "en" ? `View ${a.en}` : `查看${a.name}详情`
                          }
                        >
                          <PlacePhoto
                            id={a.id}
                            name={lang === "en" ? a.en : a.name}
                          />
                          <span className="place-tag">
                            {lang === "en" ? a.kindEn : a.kind}
                          </span>
                        </button>
                        <div className="place-body">
                          <small>{a.en}</small>
                          <h3>{lang === "en" ? a.en : a.name}</h3>
                          <div className="row between">
                            {!a.important && (
                              <span className="price">
                                {a.price === null
                                  ? t("按官网报价")
                                  : a.price === 0
                                    ? t("免费")
                                    : `$${a.price.toFixed(2)}`}
                                <small>
                                  {a.price === null
                                    ? t("按所选服务计费")
                                    : a.price > 0
                                      ? t("成人参考价")
                                      : t("公共参观")}
                                </small>
                              </span>
                            )}
                            <span className="muted">
                              {lang === "en" ? a.durationEn : a.duration}
                            </span>
                          </div>
                          <p
                            className={"weather-advice " + (day ? "" : "muted")}
                          >
                            <CloudSun size={15} />
                            {t(advice(a))}
                          </p>
                          <button
                            className="secondary full"
                            onClick={() => setPlace(a)}
                          >
                            {a.important
                              ? lang === "en"
                                ? "Address & directions"
                                : "地址与出行指南"
                              : t("门票与游览导览")}
                            <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
                {placeFilter !== "important" && (
                  <p className="fineprint">
                    {t(
                      "票价核实于 2026-10-11。建议停留时长与路线为本站建议；票价、开放时间与临时关闭以景点官网为准。",
                    )}
                  </p>
                )}
              </>
            )}
            {tab === "ignite" && (
              <>
                <div className="ignite-banner">
                  <div>
                    <span className="eyebrow">
                      MICROSOFT IGNITE · OFFICIAL CATALOG
                    </span>
                    <h2>
                      {allSessions.length || "…"}
                      {t(" 场内容，找到你的方向。")}
                    </h2>
                    <p>
                      {catalogue?.rawCount
                        ? `${allSessions.length} ${lang === "en" ? "sessions" : "个会议主题"} · ${catalogue.rawCount} ${lang === "en" ? "catalogue records" : "条场次记录"}`
                        : ""}
                      {" · "}
                      {t("同一会议的多个场次可在详情中查看。")}
                    </p>
                  </div>
                  <div className="row">
                    {external(
                      "https://ignite.microsoft.com/en-US/sessions",
                      t("官方目录"),
                    )}
                    {refreshButton("sessions")}
                  </div>
                </div>
                <div className="notice neutral">
                  {t(
                    "已公布的时间段和会场会显示在详情中；日期或时区待定时，不换算为当地时间。测试房间不显示，收藏不代表官方预订。",
                  )}
                </div>
                {catalogue?.stale && (
                  <p className="notice">
                    {lang === "en"
                      ? "Showing a saved official catalogue. Refresh to check for updates."
                      : catalogue.warning || t("当前为保存的官方目录快照。")}
                  </p>
                )}
                {errors.sessions && (
                  <p className="notice">{t(errors.sessions)}</p>
                )}
                {errors.favorites && (
                  <p className="notice">
                    {t("收藏读取失败：")}
                    {t(errors.favorites)}
                  </p>
                )}
                <div className="session-toolbar">
                  <label className="search">
                    <Search size={18} />
                    <input
                      placeholder={t("搜索英文标题、讲者、关键词或编号")}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label={t("会议主题")}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    {topics.map((value) => (
                      <option key={value} value={value}>
                        {t(value)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t("会议形式")}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {types.map((value) => (
                      <option key={value} value={value}>
                        {t(value)}
                      </option>
                    ))}
                  </select>
                  <button
                    className={"secondary " + (onlyFav ? "selected" : "")}
                    onClick={() => setOnlyFav(!onlyFav)}
                  >
                    <Bookmark size={16} />
                    {onlyFav ? t("我的收藏") : t("只看收藏")}
                  </button>
                </div>
                <div className="row between result-label">
                  <span>
                    {filtered.length}
                    {t(" 场结果")}
                  </span>
                  <small>
                    {t("更新 ")}
                    {stamp(catalogue?.retrievedAt)}
                    {t("（北京时间） · 自动缓存 30 分钟，点击刷新获取最新数据")}
                  </small>
                </div>
                <div className="sessions-grid">
                  {filtered.slice((page - 1) * 24, page * 24).map(sessionCard)}
                </div>
                {!filtered.length && (
                  <div className="empty">
                    <Search size={32} />
                    <h3>
                      {busy.sessions
                        ? t("正在获取会议内容")
                        : t("没有匹配的会议")}
                    </h3>
                    <p>{t("试试 Azure、Security、Copilot 或清除筛选。")}</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setQuery("");
                        setTopic("全部主题");
                        setType("全部形式");
                        setOnlyFav(false);
                      }}
                    >
                      {t("清除筛选")}
                    </button>
                  </div>
                )}
                {filtered.length > 24 && (
                  <div className="pagination">
                    <button
                      className="secondary"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t("上一页")}
                    </button>
                    <span>
                      {page} / {Math.ceil(filtered.length / 24)}
                    </span>
                    <button
                      className="secondary"
                      disabled={page * 24 >= filtered.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("下一页")}
                    </button>
                  </div>
                )}
              </>
            )}
            <footer className="app-footer">
              <span>
                © {now?.getFullYear() || 2026} Heath.{" "}
                <a
                  href="https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  MIT
                </a>
              </span>
              <span>
                <ShieldCheck size={13} />
                {lang === "en" ? " Stored on this device" : " 仅保存在本机"}
              </span>
            </footer>
          </div>
        </main>
      </div>
      {modal && (
        <div className="overlay" onClick={() => !saving && setModal(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("记录消费")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-head">
              <div>
                <span className="eyebrow">KEEP THE MOMENT</span>
                <h2>{t("记一笔消费")}</h2>
              </div>
              <button
                className="iconbutton"
                disabled={saving}
                aria-label={t("关闭")}
                onClick={() => setModal(false)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={saveExpense}>
              <div className="form-grid">
                <label className="label">
                  {t("金额")}
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100000000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="label">
                  {t("币种")}
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {["USD", "EUR", "CNY"].map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  {t("小费 %")}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={tip}
                    onChange={(e) => setTip(e.target.value)}
                  />
                </label>
                <label className="label">
                  {t("消费日期（设备当地）")}
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </label>
              </div>
              <label className="label">
                {t("分类")}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  placeholder={t("例如：Fisherman’s Wharf 晚餐，与同事用餐")}
                  maxLength={1000}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="photo-upload">
                {photoUrl ? (
                  <>
                    <img src={photoUrl} alt={t("待保存的消费照片")} />
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setPhoto(null)}
                    >
                      <X size={15} />
                      {t("移除照片")}
                    </button>
                  </>
                ) : (
                  <>
                    <Camera size={28} />
                    <b>{t("留下一张消费凭证")}</b>
                    <p>{t("照片可选，支持拍照或从相册选择。")}</p>
                  </>
                )}
                <div className="row">
                  {Capacitor.isNativePlatform() ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        try {
                          const file = await captureReceipt();
                          if (file) await selectPhoto(file);
                        } catch (e) {
                          setToast(String(e));
                        }
                      }}
                    >
                      <Camera size={16} />
                      {t("拍照")}
                    </button>
                  ) : (
                    <label className="secondary file-button">
                      <Camera size={16} />
                      {t("拍照")}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => selectPhoto(e.target.files?.[0])}
                      />
                    </label>
                  )}
                  <label className="secondary file-button">
                    <ImagePlus size={16} />
                    {t("相册")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => selectPhoto(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
              <div className="calc-total">
                <span>
                  {t("含小费合计")}
                  <small>
                    {expenseReferenceTotal !== null
                      ? "≈ " + money(expenseReferenceTotal, expenseBase)
                      : t("等待汇率")}
                  </small>
                </span>
                <strong>{money(total, currency)}</strong>
              </div>
              <div className="expense-reference">
                <div className="row between">
                  <span className="eyebrow">EXCHANGE REFERENCE</span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy.rates}
                    onClick={() => refresh("rates", true)}
                  >
                    <RefreshCw size={15} className={busy.rates ? "spin" : ""} />
                    {t("刷新参考汇率")}
                  </button>
                </div>
                <p className="fineprint">{t(rateNote)}</p>
                <p className="saved-fx">
                  {snapshotValid
                    ? `1 USD = ${usdCny.toFixed(4)} CNY · ${usdEur.toFixed(6)} EUR`
                    : t("请先获取或手动填写 USD→CNY 和 USD→EUR 汇率")}
                </p>
                <p className="fineprint">
                  {t("保存后汇率与换算金额固定，不随刷新变化。")}
                </p>
                {!snapshotValid && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setModal(false);
                      setBasis("manual");
                      navigate("money");
                    }}
                  >
                    {t("手动输入参考汇率")}
                  </button>
                )}
                {rates?.stale && <p className="notice">{t(rates.warning)}</p>}
              </div>
              <button
                className="primary full"
                disabled={saving || !valid || !snapshotValid}
                type="submit"
              >
                {saving ? (
                  <RefreshCw size={17} className="spin" />
                ) : (
                  <Check size={17} />
                )}{" "}
                {saving ? t("正在保存…") : t("保存账目")}
              </button>
            </form>
          </section>
        </div>
      )}
      {place && (
        <div className="overlay" onClick={() => setPlace(null)}>
          <section
            className="modal wide"
            role="dialog"
            aria-modal="true"
            aria-label={lang === "en" ? place.en : place.name}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-head">
              <div>
                <span className="eyebrow">{place.en}</span>
                <h2>{lang === "en" ? place.en : place.name}</h2>
              </div>
              <button
                className="iconbutton"
                aria-label={t("关闭")}
                onClick={() => setPlace(null)}
              >
                <X />
              </button>
            </div>
            <div className="detail-photo">
              <PlacePhoto
                id={place.id}
                name={lang === "en" ? place.en : place.name}
              />
            </div>
            <div className="address-copy">
              <div>
                <small>{t("地址")}</small>
                <p>{place.address}</p>
              </div>
              <button
                className="secondary"
                onClick={() => copyAddress(place.address)}
              >
                {t("复制地址")}
              </button>
            </div>
            <div className="detail-banner">
              {!place.important && (
                <div>
                  <small>{t("门票参考")}</small>
                  <strong>
                    {place.price === null
                      ? t("按官网报价")
                      : place.price
                        ? money(place.price, "USD")
                        : t("免费")}
                  </strong>
                </div>
              )}
              <div>
                <small>
                  {place.important
                    ? lang === "en"
                      ? "Schedule"
                      : "行程安排"
                    : t("建议游览")}
                </small>
                <strong>
                  {lang === "en" ? place.durationEn : place.duration}
                </strong>
              </div>
            </div>
            {!place.important && (
              <p>{lang === "en" ? place.priceNoteEn : place.priceNote}</p>
            )}
            <p className="weather-advice">
              <CloudSun size={17} />
              {visitDate} · {t(advice(place))}
            </p>
            <h3>
              {place.important
                ? lang === "en"
                  ? "Getting there"
                  : "出行指南"
                : t("建议游览路线")}
            </h3>
            <ol className="guide-list">
              {(lang === "en" ? place.guideEn : place.guide).map(
                (g: string) => (
                  <li key={g}>{g}</li>
                ),
              )}
            </ol>
            <div className="notice neutral">
              {lang === "en" ? place.tipEn : place.tip}
            </div>
            <div className="detail-links">
              {external(
                place.ticket,
                place.important
                  ? lang === "en"
                    ? "Official website"
                    : "官方网站"
                  : t("官方门票 / 开放信息"),
              )}
              {external(
                "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(place.address),
                t("地图导航"),
              )}
              {external(place.source, t("核对信息来源"))}
            </div>
            {!place.important && (
              <p className="fineprint">
                {t(
                  "核实日期：2026-10-11。先核对所选日期的营业与票务，再购票。",
                )}
              </p>
            )}
            {place.image && (
              <p className="fineprint">
                {t("图片来源 ")}
                {external(place.imageSource, place.imageCredit)}
              </p>
            )}
          </section>
        </div>
      )}
      {session && (
        <div className="overlay" onClick={() => setSession(null)}>
          <section
            className="modal wide"
            role="dialog"
            aria-modal="true"
            aria-label={t("会议详情")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-head">
              <span className="badge">
                {session.code} · {session.type}
              </span>
              <button
                className="iconbutton"
                aria-label={t("关闭")}
                onClick={() => setSession(null)}
              >
                <X />
              </button>
            </div>
            <h2 className="detail-title">{session.title}</h2>
            <div className="tags">
              {session.topics.map((t: string) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <h3>{t("会议内容 · 官方英文简介")}</h3>
            <p className="description-full">
              {session.description || t("官方暂未提供简介。")}
            </p>
            <div className="meta-lines">
              <p>
                <b>{t("讲者")}</b>
                {session.speakers || t("待公布")}
              </p>
              <p>
                <b>{t("技术深度")}</b>
                {session.level || t("未标注")}
              </p>
              <p>
                <b>{t("参与方式")}</b>
                {session.delivery.join(" / ") || t("待公布")}
              </p>
            </div>
            <h3>{t("场次安排")}</h3>
            {session.instances.map((s: any, i: number) => (
              <div key={s.id || i} className="schedule-row">
                <span>
                  {t("场次 ")}
                  {i + 1}
                </span>
                <div>
                  <b>
                    {s.start
                      ? stamp(s.start, "America/Los_Angeles") + t("（旧金山）")
                      : s.timeSlot || t("日期 / 时间待公布")}
                  </b>
                  {!s.start && s.timeSlot && (
                    <small className="schedule-pending">
                      {t("日期及所属时区待定")}
                    </small>
                  )}
                  {s.start && (
                    <small>
                      {stamp(s.start)}
                      {t("（北京时间）")}
                    </small>
                  )}
                  <small>{s.room || t("正式房间待公布")}</small>
                </div>
              </div>
            ))}
            <div className="detail-links">
              <button className="primary" onClick={() => favorite(session.id)}>
                <Bookmark size={17} />
                {favorites.includes(session.id)
                  ? t("已收藏 · 点击取消")
                  : t("收藏这场会议")}
              </button>
              {external(session.url, t("打开官方详情"))}
            </div>
            <p className="fineprint">
              {t(
                "本站收藏不代表官方预约。无完整日期的原始时间段不用于日程计算。",
              )}
            </p>
          </section>
        </div>
      )}
      {settingsOpen && (
        <SettingsPanel
          lang={lang}
          preferences={preferences}
          onChange={changePreferences}
          onLanguage={setLang}
          onClose={() => setSettingsOpen(false)}
          onAbout={() => {
            setSettingsOpen(false);
            setWelcomeOpen(true);
          }}
          onBackup={() => {
            setSettingsOpen(false);
            setBackupOpen(true);
          }}
        />
      )}
      {welcomeOpen && <WelcomePanel onClose={() => setWelcomeOpen(false)} />}
      {backupOpen && (
        <BackupPanel
          lang={lang}
          onClose={() => setBackupOpen(false)}
          onRestore={() => {
            refresh("expenses");
            refresh("favorites");
          }}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          {t(toast)}
          <button onClick={() => setToast("")} aria-label={t("关闭提示")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
