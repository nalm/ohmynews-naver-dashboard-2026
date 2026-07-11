"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  TrendingDown,
  TrendingUp
} from "lucide-react";

const trendIcons = {
  up: <TrendingUp size={14} />,
  down: <TrendingDown size={14} />,
  flat: <ArrowUpRight size={14} />,
  new: <Sparkles size={14} />,
  out: <ArrowDownRight size={14} />
};

function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}



function getPeakPoint(series = []) {
  const observed = series.filter((item) => typeof item.count === "number" && Number.isFinite(item.count));
  if (!observed.length) return null;
  return observed.reduce((peak, item) => (item.count > peak.count ? item : peak));
}


function getNaverLink(article) {
  if (article.naverUrl) return article.naverUrl;
  if (!article.title) return "";
  return "https://search.naver.com/search.naver?where=news&query=" + encodeURIComponent(article.title);
}


function getTotalViews(series = []) {
  return series.reduce(
    (total, item) => total + (typeof item.count === "number" && Number.isFinite(item.count) ? item.count : 0),
    0
  );
}

function Sparkline({ series = [], tone = "flat", compact = false }) {
  const samples = series.map((item, index) => ({
    index,
    value: typeof item.count === "number" && Number.isFinite(item.count) ? item.count : null
  }));
  const observed = samples.filter((sample) => sample.value != null);

  if (!observed.length) {
    return <span className={"sparkline is-empty" + (compact ? " is-compact" : "")}>-</span>;
  }

  const min = Math.min(...observed.map((sample) => sample.value));
  const max = Math.max(...observed.map((sample) => sample.value));
  const spread = Math.max(1, max - min);
  const denominator = Math.max(1, samples.length - 1);
  const points = samples.map((sample) => ({
    ...sample,
    x: (sample.index / denominator) * 100,
    y: sample.value == null ? null : 28 - ((sample.value - min) / spread) * 24
  }));

  const segments = [];
  let activeSegment = [];
  for (const point of points) {
    if (point.y == null) {
      if (activeSegment.length) segments.push(activeSegment);
      activeSegment = [];
      continue;
    }
    activeSegment.push(point);
  }
  if (activeSegment.length) segments.push(activeSegment);

  return (
    <svg
      className={"sparkline is-" + tone + (compact ? " is-compact" : "")}
      viewBox="0 0 100 32"
      role="img"
      aria-label="최근 8시간 조회 추이"
      preserveAspectRatio="none"
    >
      {segments.map((segment, index) => (
        <path
          key={"segment-" + index}
          d={"M " + segment.map((point) => point.x + " " + point.y).join(" L ")}
          fill="none"
        />
      ))}
      {points.filter((point) => point.y != null).map((point) => (
        <circle key={"point-" + point.index} cx={point.x} cy={point.y} r="2.2" />
      ))}
    </svg>
  );
}


function DetailedLineChart({ series = [] }) {
  const width = 720;
  const height = 176;
  const padding = { top: 18, right: 18, bottom: 18, left: 18 };
  const samples = series.map((item, index) => ({
    index,
    value: typeof item.count === "number" && Number.isFinite(item.count) ? item.count : null
  }));
  const observed = samples.filter((sample) => sample.value != null);

  if (!observed.length) {
    return <div className="detailed-line-empty">표시할 조회수 데이터가 없습니다.</div>;
  }

  const min = Math.min(...observed.map((sample) => sample.value));
  const max = Math.max(...observed.map((sample) => sample.value));
  const spread = Math.max(1, max - min);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const denominator = Math.max(1, samples.length - 1);
  const points = samples.map((sample) => ({
    ...sample,
    x: padding.left + (sample.index / denominator) * chartWidth,
    y: sample.value == null ? null : padding.top + chartHeight - ((sample.value - min) / spread) * chartHeight
  }));

  const segments = [];
  let activeSegment = [];
  for (const point of points) {
    if (point.y == null) {
      if (activeSegment.length) segments.push(activeSegment);
      activeSegment = [];
      continue;
    }
    activeSegment.push(point);
  }
  if (activeSegment.length) segments.push(activeSegment);

  return (
    <svg className="detailed-line-chart" viewBox={"0 0 " + width + " " + height} role="img" aria-label="최근 8시간 조회수 라인 차트">
      {[0.2, 0.5, 0.8].map((ratio) => (
        <line
          key={ratio}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + chartHeight * ratio}
          y2={padding.top + chartHeight * ratio}
        />
      ))}
      {segments.map((segment, index) => (
        <path
          key={"segment-" + index}
          d={"M " + segment.map((point) => point.x + " " + point.y).join(" L ")}
          fill="none"
        />
      ))}
      {points.filter((point) => point.y != null).map((point) => (
        <circle key={"point-" + point.index} cx={point.x} cy={point.y} r="4.2" />
      ))}
    </svg>
  );
}

function rankLabel(article) {
  if (!article.currentRank) return "랭킹 밖";
  return `네이버 ${article.currentRank}위`;
}

function articleStatusClass(article) {
  if (article.trend === "up") return "is-up";
  if (article.trend === "down") return "is-down";
  if (article.trend === "new") return "is-new";
  if (article.trend === "out") return "is-out";
  return "is-flat";
}

function MiniBars({ series }) {
  const max = Math.max(1, ...series.map((item) => item.count || 0));
  return (
    <div className="mini-bars" aria-hidden="true">
      {series.map((item) => (
        <span
          key={item.windowKey}
          className={item.count == null ? "is-empty" : ""}
          style={{ height: item.count == null ? "8%" : Math.max(10, ((item.count || 0) / max) * 100) + "%" }}
        />
      ))}
    </div>
  );
}

function ArticleRow({ article, selected, onSelect }) {
  return (
    <button
      className={`article-row ${selected ? "is-selected" : ""}`}
      type="button"
      onClick={() => onSelect(article)}
    >
      <span className="article-body">
        <span className="article-title">{article.title}</span>
        <span className="article-meta">
          <span className={`trend-pill ${articleStatusClass(article)}`}>
            {trendIcons[article.trend] || trendIcons.flat}
            {article.trendLabel}
          </span>
          <span>{rankLabel(article)}</span>
          <Sparkline series={article.series} tone={article.trend} compact />
        </span>
      </span>
    </button>
  );
}

function groupMainArticles(articles) {
  const groups = [];

  for (const article of articles) {
    const previous = groups.at(-1);
    if (!previous || previous.code !== article.componentCode) {
      groups.push({
        code: article.componentCode || "other",
        label: article.componentLabel || "모바일 메인",
        articles: [article]
      });
    } else {
      previous.articles.push(article);
    }
  }

  return groups;
}

function RankingRow({ article, onSelect, featured = false }) {
  const peak = getPeakPoint(article.series);
  const totalViews = getTotalViews(article.series);

  return (
    <button className={"ranking-row" + (featured ? " is-raise-candidate" : "")} type="button" onClick={() => onSelect(article)}>
      <span className="ranking-number">{article.currentRank || "-"}</span>
      <span className="ranking-copy">
        <strong>{article.title}</strong>
        <small>
          {featured ? <b className="raise-badge">올릴 후보</b> : null}
          {article.placement === "main" ? "오마이뉴스 메인 노출 중" : "언론사별 기사 랭킹"}
        </small>
      </span>
      <span className="ranking-peak">{peak?.label || "-"}</span>
      <span className="ranking-latest">{formatNumber(article.latestCount)}</span>
      <strong className="ranking-highest">{formatNumber(peak?.count)}</strong>
      <span className="ranking-total">{formatNumber(totalViews)}</span>
      <span className={"ranking-status " + articleStatusClass(article)}>
        {trendIcons[article.trend] || trendIcons.flat}
      </span>
      <Sparkline series={article.series} tone={article.trend} compact />
    </button>
  );
}

function CandidateGroup({ tone, title, caption, articles, onSelect }) {
  return (
    <section className={"candidate-group " + tone}>
      <div className="candidate-group-head">
        <div>
          <span>{title}</span>
          <small>{caption}</small>
        </div>
      </div>
      {articles.length ? (
        <div className="candidate-list">
          {articles.map((article) => (
            <button key={article.id} className="candidate-card" type="button" onClick={() => onSelect(article)}>
              <span className="candidate-rank">{article.currentRank ? article.currentRank + "위" : "밖"}</span>
              <span>
                <strong>{article.title}</strong>
                <small>{article.recommendationLabel} · {formatNumber(article.latestCount)} 조회</small>
              </span>
              <Sparkline series={article.series} tone={article.trend} compact />
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-candidates">해당 기준의 기사가 없습니다.</p>
      )}
    </section>
  );
}

function ArticleDetailLayer({ article, onClose }) {
  useEffect(() => {
    if (!article) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [article, onClose]);

  if (!article) return null;

  const naverLink = getNaverLink(article);
  const hasDirectNaverLink = Boolean(article.naverUrl);

  return (
    <div
      className="detail-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="detail-layer" role="dialog" aria-modal="true" aria-label="기사 상세">
        <button className="detail-close" type="button" onClick={onClose} aria-label="상세 닫기">
          <X size={20} />
        </button>
        <div className="detail-layer-head">
          <div>
            <p className="eyebrow">기사 상세</p>
            <h2>{article.title}</h2>
          </div>
          <span className={"trend-pill " + articleStatusClass(article)}>
            {trendIcons[article.trend] || trendIcons.flat}
            {article.trendLabel}
          </span>
        </div>

        <div className="layer-metric-grid">
          <div>
            <span>현재 순위</span>
            <strong>{article.currentRank ? article.currentRank + "위" : "랭킹 밖"}</strong>
          </div>
          <div>
            <span>최근 조회</span>
            <strong>{formatNumber(article.latestCount)}</strong>
          </div>
          <div className="cumulative-metric">
            <span>8시간 누적 조회수</span>
            <strong>{formatNumber(getTotalViews(article.series))}</strong>
          </div>
          <div className="decision-metric">
            <span>편집 제안</span>
            <strong>{article.recommendationLabel}</strong>
          </div>
        </div>

        <section className="layer-series">
          <div className="layer-section-head">
            <h3>최근 8시간 조회 추이</h3>
            <span>네이버 VIEW 랭킹 기준</span>
          </div>
          <DetailedLineChart series={article.series || []} />
          <div className="layer-series-list">
            {(article.series || []).map((item) => (
              <div key={item.windowKey}>
                <span>{item.label}</span>
                <strong>{formatNumber(item.count)}</strong>
                <small>{item.rank ? item.rank + "위" : "-"}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="layer-reason">
          <h3>판단 근거</h3>
          <p>{article.reason}</p>
        </section>

        <div className="layer-actions">
          {article.url ? (
            <a href={article.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              오마이뉴스 원문
            </a>
          ) : null}
          {naverLink ? (
            <a href={naverLink} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              {hasDirectNaverLink ? "네이버 원문" : "네이버 뉴스 검색"}
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function Dashboard({ authReady, user }) {
  const [payload, setPayload] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(refresh = false) {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard${refresh ? "?refresh=1" : ""}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`dashboard request failed: ${response.status}`);
      const data = await response.json();
      setPayload(data);
    } catch (err) {
      setError(err.message || "대시보드를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(false);
  }, []);

  const raiseCandidateIds = new Set((payload?.candidateGroups?.raise || []).map((article) => article.id));

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="dashboard-title-line">
          <h1>네이버 조회 추세 대시보드</h1>
          {payload ? (
            <span className="collection-time">
              <Clock3 size={14} />
              수집 시각 {new Date(payload.collectedAt).toLocaleString("ko-KR")}
            </span>
          ) : null}
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => loadDashboard(true)} disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
            새로고침
          </button>
          {authReady ? (
            <a href="/api/auth/signout">
              <LogOut size={17} />
              로그아웃
            </a>
          ) : (
            <span className="demo-chip">
              <ShieldCheck size={15} />
              로컬 데모
            </span>
          )}
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {payload?.warnings?.length ? (
        <div className="source-warning">
          {payload.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <section className="three-column-workspace">
        <section className="column-panel main-column">
          <div className="column-head">
            <div>
              <p className="eyebrow">현재 편집면</p>
              <h2>오마이뉴스 모바일 메인</h2>
            </div>
          </div>
          <div className="phone-frame refreshed-phone">
            {isLoading && !payload ? (
              <div className="loading-state">
                <Loader2 className="spin" />
                불러오는 중
              </div>
            ) : (
              <div className="article-list">
                {groupMainArticles(payload?.mainArticles || []).map((group, groupIndex) => (
                  <section className="main-section-group" key={group.code + groupIndex}>
                    <div className="main-section-label">
                      <span>{group.label}</span>
                      <small>{group.articles.length}건</small>
                    </div>
                    {group.articles.map((article) => (
                      <ArticleRow
                        key={article.id}
                        article={article}
                        selected={selectedArticle?.id === article.id}
                        onSelect={setSelectedArticle}
                      />
                    ))}
                  </section>
                ))}
                <div className="special-boundary">스페셜 콘텐츠 위까지 수집</div>
              </div>
            )}
          </div>
        </section>

        <section className="column-panel ranking-column">
          <div className="column-head">
            <div>
              <p className="eyebrow">새로고침 기준</p>
              <h2>네이버 VIEW Top 50</h2>
            </div>
          </div>
          <div className="ranking-column-labels">
            <span>순위</span>
            <span>기사 제목</span>
            <span>피크 시간</span>
            <span>최신</span>
            <span>최고</span>
            <span>8시간 누적</span>
            <span>상태</span>
            <span>추이</span>
          </div>
          <div className="ranking-list">
            {payload?.topRankedArticles?.slice(0, 50).map((article) => (
              <RankingRow key={article.id} article={article} featured={raiseCandidateIds.has(article.id)} onSelect={setSelectedArticle} />
            ))}
          </div>
        </section>

        <aside className="candidate-column">
          <div className="column-head">
            <div>
              <p className="eyebrow">편집 판단</p>
              <h2>노출 조정 후보</h2>
            </div>
          </div>
          <CandidateGroup
            tone="raise"
            title="올릴 후보"
            caption="8시간 추세 상승"
            articles={payload?.candidateGroups?.raise || []}
            onSelect={setSelectedArticle}
          />
          <CandidateGroup
            tone="keep"
            title="유지 후보"
            caption="추세 안정 또는 신규"
            articles={payload?.candidateGroups?.keep || []}
            onSelect={setSelectedArticle}
          />
          <CandidateGroup
            tone="lower"
            title="내릴 후보"
            caption="8시간 추세 하락"
            articles={payload?.candidateGroups?.lower || []}
            onSelect={setSelectedArticle}
          />
        </aside>
      </section>
      <ArticleDetailLayer article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </main>
  );
}
