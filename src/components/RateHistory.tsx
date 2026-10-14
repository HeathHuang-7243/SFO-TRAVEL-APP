"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RefreshCw } from "lucide-react";
import type { Language } from "../lib/i18n";
export default function RateHistory({
  lang,
  data,
  busy,
  error,
  onRefresh,
}: {
  lang: Language;
  data: any;
  busy: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const [direction, setDirection] = useState<"usdEur" | "eurUsd">("usdEur");
  const en = lang === "en",
    say = (zh: string, english: string) => (en ? english : zh);
  const lines = [
    { key: "usdCny", name: "1 USD → CNY", color: "var(--chart-green)" },
    { key: "eurCny", name: "1 EUR → CNY", color: "var(--chart-orange)" },
  ];
  const draw = (series: typeof lines) => (
    <div className="fx-chart">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 480, height: 270 }}
      >
        <LineChart
          data={data?.points || []}
          margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
          accessibilityLayer
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--line)"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => v.slice(5)}
            minTickGap={26}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={{ stroke: "var(--line)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => Number(v).toFixed(3)}
            width={62}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={{ stroke: "var(--line)" }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              Number(value).toFixed(4),
              name,
            ]}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <section className="history-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">20-DAY EXCHANGE HISTORY</span>
          <h2>
            {say(
              "过去 20 天的汇率变化",
              "Exchange rates over the past 20 days",
            )}
          </h2>
        </div>
        <button className="secondary" disabled={busy} onClick={onRefresh}>
          <RefreshCw size={16} className={busy ? "spin" : ""} />
          {say("刷新图表", "Refresh charts")}
        </button>
      </div>
      {error && (
        <p className="notice">
          {say(
            "历史汇率暂时无法加载，请刷新重试。",
            "History is unavailable. Please refresh to try again.",
          )}
        </p>
      )}
      {data?.stale && (
        <p className="notice">
          {say(
            "刷新失败，以下为已保存的数据。",
            "Refresh failed. Showing saved data.",
          )}
        </p>
      )}
      {!data ? (
        <div className="card empty">
          <p>
            {busy
              ? say("正在读取欧洲央行数据…", "Loading ECB data…")
              : say("暂无历史数据", "No history available")}
          </p>
        </div>
      ) : (
        <>
          <p className="fineprint">
            {data.from} — {data.to} ·{" "}
            {say("20 个自然日；", "20 calendar days; ")}
            {data.observations} {say("个已公布日期", "published dates")}
          </p>
          <div className="history-grid">
            <section className="card">
              <h3>
                {say("美元、欧元兑人民币", "US dollar & euro to Chinese yuan")}
              </h3>
              {draw(lines)}
            </section>
            <section className="card">
              <div className="section-head">
                <h3>{say("美元与欧元", "US dollar & euro")}</h3>
                <select
                  aria-label={say("汇率方向", "Rate direction")}
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as typeof direction)
                  }
                >
                  <option value="usdEur">USD → EUR</option>
                  <option value="eurUsd">EUR → USD</option>
                </select>
              </div>
              {draw([
                {
                  key: direction,
                  name: direction === "usdEur" ? "1 USD → EUR" : "1 EUR → USD",
                  color: "var(--chart-blue)",
                },
              ])}
            </section>
          </div>
          <details className="history-table card">
            <summary>{say("查看每日数值", "View daily values")}</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{say("日期", "Date")}</th>
                    <th>USD → CNY</th>
                    <th>EUR → CNY</th>
                    <th>
                      {direction === "usdEur" ? "USD → EUR" : "EUR → USD"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((p: any) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td>{p.usdCny?.toFixed(4) ?? "—"}</td>
                      <td>{p.eurCny?.toFixed(4) ?? "—"}</td>
                      <td>{p[direction]?.toFixed(4) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="fineprint">
            {say(
              "来源：欧洲央行（ECB）。周末、休市日或尚未公布的日期不补造数据；折线连接已公布的观测值。参考价用于观察趋势，非招商银行牌价或实际成交价。",
              "Source: European Central Bank (ECB). No rates are invented for weekends, holidays or dates not yet published. Lines connect published observations. These reference rates show trends; they are not CMB quotes or transaction rates.",
            )}{" "}
            <a
              className="text-link"
              href={data.source}
              target="_blank"
              rel="noreferrer"
            >
              ECB ↗
            </a>
            <br />
            {say("最近获取：", "Last fetched: ")}
            {new Date(data.retrievedAt).toLocaleString(en ? "en-GB" : "zh-CN")}
          </p>
        </>
      )}
    </section>
  );
}
