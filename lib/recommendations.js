function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function trendFromSeries(series) {
  const observed = series.filter((item) => typeof item.count === "number" && Number.isFinite(item.count));
  if (!observed.length) return { trend: "out", trendLabel: "랭킹 밖", growthRate: null };
  if (observed.length === 1) return { trend: "new", trendLabel: "신규", growthRate: 100 };

  const first = observed[0].count;
  const latest = observed[observed.length - 1].count;
  const growthRate = first > 0 ? ((latest - first) / first) * 100 : latest > 0 ? 100 : 0;

  if (growthRate >= 20) return { trend: "up", trendLabel: "상승", growthRate };
  if (growthRate <= -15) return { trend: "down", trendLabel: "하락", growthRate };
  return { trend: "flat", trendLabel: "유지", growthRate };
}

function scoreArticle(article, maxCount, mainCount) {
  if (!article.series.length) return 0;

  const growth = article.growthRate == null ? 0 : clamp((article.growthRate + 40) / 140, 0, 1) * 55;
  const volume = clamp((article.latestCount || 0) / Math.max(1, maxCount), 0, 1) * 25;
  const rank = article.currentRank ? ((51 - article.currentRank) / 50) * 15 : 0;
  const placement =
    article.placement === "external"
      ? 5
      : clamp(((article.position || mainCount) / Math.max(1, mainCount)) * 5, 0, 5);

  return Math.round((growth + volume + rank + placement) * 10) / 10;
}

function recommendationLabel(article) {
  if (article.placement === "external" && article.trend === "up") return "강력 후보";
  if (article.placement === "external") return "외부 후보";
  if (article.trend === "up" && article.position > 8) return "상단 검토";
  if (article.trend === "down" && article.position <= 5) return "하향 검토";
  if (article.trend === "out") return "랭킹 밖";
  return "유지";
}

function reasonFor(article) {
  if (article.placement === "external") {
    return "현재 모바일 메인 대상 구간에는 없지만 네이버 VIEW 랭킹에서 확인된 기사입니다.";
  }
  if (article.trend === "up") {
    return "최근 8시간 VIEW 흐름이 상승 중입니다. 현재 배치 위치보다 더 높은 노출을 검토할 수 있습니다.";
  }
  if (article.trend === "down") {
    return "최근 8시간 VIEW 흐름이 하락 중입니다. 상단 유지 필요성을 다시 확인하는 편이 좋습니다.";
  }
  if (article.trend === "out") {
    return "네이버 언론사별 기사 랭킹 50위 안에서 확인되지 않았습니다.";
  }
  return "최근 8시간 VIEW 흐름이 급격하게 변하지 않았습니다.";
}

export function mergeDashboardData(mainArticles, rankings) {
  const seriesByCrc = new Map();
  const rankingMeta = new Map();
  const rankingWindows = rankings.map(({ windowKey, label }) => ({ windowKey, label }));

  for (const rankingWindow of [...rankings].reverse()) {
    for (const item of rankingWindow.items || []) {
      const key = item.crc32 || item.articleId;
      if (!key) continue;

      if (!seriesByCrc.has(key)) seriesByCrc.set(key, []);
      seriesByCrc.get(key).push({
        windowKey: rankingWindow.windowKey,
        label: rankingWindow.label,
        count: item.count,
        rank: item.rank
      });

      rankingMeta.set(key, {
        crc32: item.crc32 || key,
        articleId: item.articleId,
        title: item.title,
        naverUrl: item.linkUrl,
        thumbnail: item.thumbnail,
        currentRank: item.rank,
        latestCount: item.count
      });
    }
  }

  const mainCrcSet = new Set(mainArticles.map((article) => article.crc32));
  const maxCount = Math.max(
    1,
    ...[...seriesByCrc.values()].map((series) => Math.max(0, ...series.map((item) => item.count || 0)))
  );

  function enrich(article) {
    const key = article.crc32 || article.articleId;
    const observedSeries = seriesByCrc.get(key) || [];
    const seriesByWindow = new Map(observedSeries.map((item) => [item.windowKey, item]));
    const series = rankingWindows.map((window) => {
      const point = seriesByWindow.get(window.windowKey);
      return point || { ...window, count: null, rank: null };
    });
    const meta = rankingMeta.get(key) || {};
    const trend = trendFromSeries(series);
    const current = series.at(-1);
    const enriched = {
      ...meta,
      ...article,
      series,
      currentRank: current?.rank ?? null,
      latestCount: current?.count ?? null,
      ...trend
    };
    enriched.score = scoreArticle(enriched, maxCount, mainArticles.length);
    enriched.recommendationLabel = recommendationLabel(enriched);
    enriched.reason = reasonFor(enriched);
    return enriched;
  }

  const enrichedMain = mainArticles.map(enrich);

  const mainByCrc = new Map(enrichedMain.map((article) => [article.crc32 || article.articleId, article]));

  const latestRankingKeys = new Set(
    (rankings.at(-1)?.items || []).map((item) => item.crc32 || item.articleId).filter(Boolean)
  );

  const topRankedArticles = [...rankingMeta.entries()]
    .filter(([crc32]) => latestRankingKeys.has(crc32))
    .map(([crc32, meta], index) => {
      const mainArticle = mainByCrc.get(crc32);
      return enrich({
        ...(mainArticle || {}),
        id: mainArticle?.id || "ranking-" + crc32,
        cntnCd: crc32,
        crc32,
        title: meta.title || mainArticle?.title || "네이버 랭킹 기사 " + (index + 1),
        url: mainArticle?.url || "",
        naverUrl: meta.naverUrl || mainArticle?.naverUrl || "",
        position: mainArticle?.position || null,
        placement: mainArticle ? "main" : "external",
        blockType: "naver-ranking"
      });
    })
    .sort((a, b) => (a.currentRank || 999) - (b.currentRank || 999));

  const externalCandidates = topRankedArticles.filter((article) => article.placement === "external");
  const allRankedArticles = [...enrichedMain, ...externalCandidates];
  const byScoreDescending = (a, b) => (b.score || 0) - (a.score || 0);

  const candidateGroups = {
    raise: allRankedArticles.filter((article) => article.trend === "up").sort(byScoreDescending).slice(0, 5),
    keep: enrichedMain
      .filter((article) => article.trend === "flat" || article.trend === "new")
      .sort(byScoreDescending)
      .slice(0, 5),
    lower: enrichedMain
      .filter((article) => article.trend === "down" || article.trend === "out")
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .slice(0, 5)
  };

  const recommendations = allRankedArticles
    .filter((article) => article.trend !== "out")
    .sort(byScoreDescending)
    .slice(0, 10);

  return {
    mainArticles: enrichedMain,
    topRankedArticles,
    externalCandidates,
    candidateGroups,
    recommendations
  };
}
