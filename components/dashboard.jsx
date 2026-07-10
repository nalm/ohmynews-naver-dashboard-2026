"use client";

import { useEffect, useMemo, useState } from "react";
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
          style={{ height: `${Math.max(10, ((item.count || 0) / max) * 100)}%` }}
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
      <span className="article-position">{article.position || "-"}</span>
      <span className="article-body">
        <span className="article-title">{article.title}</span>
        <span className="article-meta">
          <span className={`trend-pill ${articleStatusClass(article)}`}>
            {trendIcons[article.trend] || trendIcons.flat}
            {article.trendLabel}
          </span>
          <span>{rankLabel(article)}</span>
          <span>{formatPercent(article.growthRate)}</span>
        </span>
      </span>
    </button>
  );
}

function RecommendationRow({ article, onSelect }) {
  return (
    <button className="recommend-row" type="button" onClick={() => onSelect(article)}>
      <span className="recommend-score">{Math.round(article.score)}</span>
      <span>
        <strong>{article.recommendationLabel}</strong>
        <small>{article.title}</small>
      </span>
      <span className={`trend-pill ${articleStatusClass(article)}`}>
        {formatPercent(article.growthRate)}
      </span>
    </button>
  );
}

function DetailPanel({ article }) {
  if (!article) {
    return (
      <aside className="detail-panel empty-detail">
        <Search size={20} />
        <p>기사를 선택하면 상세 지표가 표시됩니다.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="eyebrow">기사 상세</p>
          <h2>{article.title}</h2>
        </div>
        <span className={`trend-pill ${articleStatusClass(article)}`}>
          {trendIcons[article.trend] || trendIcons.flat}
          {article.trendLabel}
        </span>
      </div>

      <div className="metric-grid">
        <div>
          <span>현재 순위</span>
          <strong>{article.currentRank ? `${article.currentRank}위` : "랭킹 밖"}</strong>
        </div>
        <div>
          <span>최근 조회</span>
          <strong>{formatNumber(article.latestCount)}</strong>
        </div>
        <div>
          <span>3시간 증가율</span>
          <strong>{formatPercent(article.growthRate)}</strong>
        </div>
        <div>
          <span>추천점수</span>
          <strong>{Math.round(article.score || 0)}</strong>
        </div>
      </div>

      <section className="detail-section">
        <h3>최근 3시간</h3>
        <MiniBars series={article.series} />
        <div className="series-list">
          {article.series.map((item) => (
            <div key={item.windowKey}>
              <span>{item.label}</span>
              <strong>{formatNumber(item.count)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <h3>판단 근거</h3>
        <p>{article.reason}</p>
      </section>

      <div className="detail-actions">
        {article.url ? (
          <a href={article.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            오마이뉴스
          </a>
        ) : null}
        {article.naverUrl ? (
          <a href={article.naverUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            네이버
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export default function Dashboard({ authReady, user }) {
  const [payload, setPayload] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
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
      setSelectedId((current) => current || data.mainArticles?.[0]?.id || data.recommendations?.[0]?.id);
    } catch (err) {
      setError(err.message || "대시보드를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(false);
  }, []);

  const allArticles = useMemo(() => {
    if (!payload) return [];
    const byId = new Map();
    [...payload.mainArticles, ...payload.externalCandidates].forEach((article) => {
      byId.set(article.id, article);
    });
    return [...byId.values()];
  }, [payload]);

  const selected = allArticles.find((article) => article.id === selectedId) || allArticles[0];

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">오마이뉴스 내부 편집 도구</p>
          <h1>네이버 조회 추세 대시보드</h1>
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

      {payload ? (
        <section className="status-strip">
          <span>
            <Clock3 size={15} />
            {new Date(payload.collectedAt).toLocaleString("ko-KR")}
          </span>
          <span>{payload.mode === "live" ? "실데이터" : "데모 데이터"}</span>
          <span>{payload.sourceUrl}</span>
          {user?.email ? <span>{user.email}</span> : null}
        </section>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}

      <section className="workspace">
        <div className="phone-panel">
          <div className="phone-frame">
            <div className="phone-header">
              <strong>오마이뉴스</strong>
              <span>모바일 메인</span>
            </div>
            {isLoading && !payload ? (
              <div className="loading-state">
                <Loader2 className="spin" />
                불러오는 중
              </div>
            ) : (
              <div className="article-list">
                {payload?.mainArticles.map((article) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    selected={(selected?.id || selectedId) === article.id}
                    onSelect={(item) => setSelectedId(item.id)}
                  />
                ))}
                <div className="special-boundary">스페셜 콘텐츠 위까지 수집</div>
              </div>
            )}
          </div>
        </div>

        <div className="recommend-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">추천 큐</p>
              <h2>지금 올릴 만한 기사</h2>
            </div>
            <Star size={18} />
          </div>
          <div className="recommend-list">
            {payload?.recommendations.map((article) => (
              <RecommendationRow
                key={article.id}
                article={article}
                onSelect={(item) => setSelectedId(item.id)}
              />
            ))}
          </div>
        </div>

        <DetailPanel article={selected} />
      </section>
    </main>
  );
}
