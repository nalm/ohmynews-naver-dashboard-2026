import { OHMYNEWS_MOBILE_URL, isNaverConfigured } from "./config";
import { getCurrentMainArticles } from "./ohmynews";
import { fetchPublisherRankings, getRecentRankingWindows } from "./naver";
import { mergeDashboardData } from "./recommendations";
import { hasDatabase, saveSnapshot } from "./store";

async function loadMainArticles() {
  try {
    const articles = await getCurrentMainArticles();
    if (articles.length) return { articles, source: "live" };
    return { articles: [], source: "unavailable", warning: "지정한 CMPT_CD 블록에서 기사를 찾지 못했습니다." };
  } catch (error) {
    return { articles: [], source: "unavailable", warning: error.message };
  }
}

async function loadRankings() {
  if (!isNaverConfigured()) {
    return { rankings: [], source: "unavailable", warning: "네이버 API 인증 정보가 설정되지 않았습니다." };
  }

  try {
    const windows = getRecentRankingWindows(new Date(), 8);
    const rankings = await fetchPublisherRankings(windows);
    const latestCount = rankings.at(-1)?.items?.length || 0;

    // A non-empty publisher response is valid even when it contains fewer than 50 items.
    // Only an empty response should prevent a live dashboard update.
    if (!latestCount) {
      return {
        rankings: [],
        source: "unavailable",
        warning: "언론사별 기사 랭킹 조회가 50건보다 적은 " + latestCount + "건을 반환했습니다."
      };
    }

    return { rankings, source: "live" };
  } catch (error) {
    return { rankings: [], source: "unavailable", warning: "네이버 언론사별 기사 랭킹 조회 실패: " + error.message };
  }
}

export async function buildDashboardPayload({ persist = false } = {}) {
  const main = await loadMainArticles();
  const ranking = await loadRankings();
  const merged = mergeDashboardData(main.articles, ranking.rankings);
  const mode = main.source === "live" && ranking.source === "live" ? "live" : "demo";

  const payload = {
    collectedAt: new Date().toISOString(),
    sourceUrl: OHMYNEWS_MOBILE_URL,
    mode,
    capabilities: {
      authConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      naverConfigured: isNaverConfigured(),
      databaseConfigured: hasDatabase()
    },
    warnings: [main.warning, ranking.warning].filter(Boolean),
    rankingArticleCount: ranking.rankings.at(-1)?.items?.length || 0,
    rankingWindows: ranking.rankings.map(({ windowKey, label, date, hour }) => ({
      windowKey,
      label,
      date,
      hour
    })),
    ...merged
  };

  if (persist && mode === "live") {
    await saveSnapshot(payload);
  }

  return payload;
}
