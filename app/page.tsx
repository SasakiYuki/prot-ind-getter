"use client";

import { useMemo, useState } from "react";

type RangeKey = "7d" | "30d" | "90d";

const trend = [
  { date: "6/14", count: 5720 },
  { date: "6/16", count: 5790 },
  { date: "6/18", count: 5880 },
  { date: "6/20", count: 5840 },
  { date: "6/22", count: 5960 },
  { date: "6/24", count: 6010 },
  { date: "6/26", count: 5980 },
  { date: "6/28", count: 6100 },
  { date: "6/30", count: 6150 },
  { date: "7/02", count: 6200 },
  { date: "7/04", count: 6270 },
  { date: "7/06", count: 6320 },
  { date: "7/08", count: 6410 },
  { date: "7/10", count: 6500 },
  { date: "7/12", count: 6590 },
  { date: "7/14", count: 6720 },
  { date: "7/16", count: 6810 },
  { date: "7/18", count: 6920 },
  { date: "7/20", count: 7040 }
];

const jobs = [
  {
    title: "データセンター領域におけるBIMエンジニア",
    company: "三菱重工業株式会社",
    location: "東京都 千代田区 丸の内",
    salary: "年収 650万円 ~ 1,300万円",
    type: "正社員",
    posted: "30+日前",
    tone: "blue"
  },
  {
    title: "鋼構造エンジニア",
    company: "オーピーシー株式会社",
    location: "東京都 中央区 日本橋箱崎町",
    salary: "月給 34.0万円 ~ 59.3万円",
    type: "臨時雇用",
    posted: "1日前",
    tone: "green"
  },
  {
    title: "【生産エンジニア】グローバル企業/日本法人/在宅可",
    company: "LGMG日本株式会社",
    location: "東京都 港区",
    salary: "年俸 800万円 以上",
    type: "正社員",
    posted: "30+日前",
    tone: "amber"
  },
  {
    title: "フロントエンドエンジニア(Vue)中国語必須",
    company: "DAIMUテック株式会社",
    location: "東京都 港区・フルリモート",
    salary: "月給 35万円 以上",
    type: "正社員",
    posted: "30+日前",
    tone: "purple"
  }
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("30d");
  const visibleTrend = useMemo(() => {
    if (range === "7d") return trend.slice(-7);
    if (range === "90d") return trend;
    return trend.slice(-15);
  }, [range]);

  const first = visibleTrend[0].count;
  const last = visibleTrend[visibleTrend.length - 1].count;
  const change = last - first;
  const max = Math.max(...visibleTrend.map((item) => item.count));
  const min = Math.min(...visibleTrend.map((item) => item.count));
  const chartHeight = 180;
  const points = visibleTrend
    .map((item, index) => {
      const x = visibleTrend.length === 1 ? 50 : (index / (visibleTrend.length - 1)) * 100;
      const y = 12 + ((max - item.count) / Math.max(max - min, 1)) * 76;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div>
            <p className="eyebrow">MARKET INTELLIGENCE</p>
            <h1>Engineer Jobs Monitor</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="poc-badge"><span className="status-dot" /> PoC preview</span>
          <button className="icon-button" aria-label="設定">⚙</button>
          <div className="avatar">YS</div>
        </div>
      </header>

      <section className="intro-row">
        <div>
          <p className="section-kicker">JOB MARKET / TOKYO</p>
          <h2>エンジニア求人の動きを見る</h2>
          <p className="muted">Indeedの検索結果を日次で収集し、求人市場の変化をモニタリングします。</p>
        </div>
        <div className="query-chip"><span>⌕</span><strong>エンジニア</strong><span className="chip-divider">in</span><strong>東京都</strong></div>
      </section>

      <section className="metric-grid" aria-label="主要指標">
        <article className="metric-card featured">
          <div className="metric-top"><span>現在の案件数</span><span className="trend-up">↗ {((change / first) * 100).toFixed(1)}%</span></div>
          <div className="metric-value">{formatNumber(last)}</div>
          <p className="metric-sub">前回取得比 <strong>+{formatNumber(change)}件</strong></p>
          <div className="sparkline" aria-hidden="true"><span style={{ height: "38%" }} /><span style={{ height: "49%" }} /><span style={{ height: "44%" }} /><span style={{ height: "62%" }} /><span style={{ height: "58%" }} /><span style={{ height: "77%" }} /><span style={{ height: "92%" }} /></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>30日間の増加</span><span className="soft-label">TREND</span></div>
          <div className="metric-value small-plus">+{formatNumber(change)}<small>件</small></div>
          <p className="metric-sub">市場規模の変化を把握</p>
          <div className="mini-bar"><span style={{ width: "72%" }} /></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>最終取得</span><span className="success-label">SUCCESS</span></div>
          <div className="metric-value time-value">2026.07.20 <small>06:00</small></div>
          <p className="metric-sub">次回取得予定: 明日 06:00</p>
          <div className="success-line"><span className="status-dot" /> 取得完了 / 6,000件以上</div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel trend-panel">
          <div className="panel-heading">
            <div><p className="section-kicker">VOLUME TREND</p><h3>案件数の推移</h3></div>
            <div className="range-tabs" role="tablist" aria-label="期間選択">
              {(["7d", "30d", "90d"] as RangeKey[]).map((item) => <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item === "7d" ? "7日" : item === "30d" ? "30日" : "90日"}</button>)}
            </div>
          </div>
          <div className="chart-wrap">
            <div className="axis-labels"><span>{formatNumber(max)}</span><span>{formatNumber(Math.round((max + min) / 2))}</span><span>{formatNumber(min)}</span></div>
            <div className="chart-area">
              <div className="grid-lines"><i /><i /><i /><i /></div>
              <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" role="img" aria-label="案件数の推移グラフ">
                <polygon points={`0,100 ${points} 100,100`} className="chart-fill" />
                <polyline points={points} className="chart-line" />
              </svg>
              <div className="chart-dates"><span>{visibleTrend[0].date}</span><span>{visibleTrend[Math.floor(visibleTrend.length / 2)].date}</span><span>{visibleTrend[visibleTrend.length - 1].date}</span></div>
            </div>
          </div>
          <div className="chart-footnote"><span className="legend-dot" /> 求人件数 <span className="footnote-divider" /> 1日1回更新 <span className="live-note">● LIVE DATA PREVIEW</span></div>
        </article>

        <article className="panel run-panel">
          <div className="panel-heading"><div><p className="section-kicker">COLLECTION STATUS</p><h3>取得状況</h3></div><span className="health-icon">✓</span></div>
          <div className="run-status"><div><span className="status-dot large" /> <strong>正常に完了</strong></div><span>今日 06:00</span></div>
          <div className="run-stat"><span>取得ページ</span><strong>10 / 10</strong></div>
          <div className="progress"><span style={{ width: "100%" }} /></div>
          <div className="run-stat"><span>取得求人</span><strong>1,248件</strong></div>
          <div className="progress teal"><span style={{ width: "84%" }} /></div>
          <div className="run-meta"><span>処理時間</span><span>04:32</span></div>
          <div className="run-meta"><span>次回スケジュール</span><span>明日 06:00</span></div>
          <button className="outline-button">取得履歴を見る <span>→</span></button>
        </article>
      </section>

      <section className="panel jobs-panel">
        <div className="panel-heading jobs-heading"><div><p className="section-kicker">LATEST CAPTURE</p><h3>最新の求人</h3></div><button className="text-button">すべて見る <span>→</span></button></div>
        <div className="table-wrap">
          <table><thead><tr><th>求人タイトル</th><th>企業</th><th>勤務地</th><th>給与</th><th>雇用形態</th><th>掲載</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.title}><td><div className="job-title-cell"><span className={`job-marker ${job.tone}`} /><strong>{job.title}</strong></div></td><td>{job.company}</td><td>{job.location}</td><td className="salary">{job.salary}</td><td><span className="type-pill">{job.type}</span></td><td className="posted">{job.posted}</td></tr>)}</tbody></table>
        </div>
        <div className="table-footer"><span>サンプル表示: 最新取得分から4件を表示</span><span>Data source: Indeed / エンジニア / 東京都</span></div>
      </section>

      <footer><span>Engineer Jobs Monitor</span><span>Data is collected daily at 06:00 JST · PoC Preview</span></footer>
    </main>
  );
}
