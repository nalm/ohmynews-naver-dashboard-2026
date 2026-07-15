import { OHMYNEWS_MOBILE_URL, isNaverConfigured } from "./config";
import { getCurrentMainArticles } from "./ohmynews";
import { fetchPublisherRankings, getRecentRankingWindows } from "./naver";
import { mergeDashboardData } from "./recommendations";
import { hasDatabase, saveSnapshot } from "./store";

const RANKING_HISTORY_WINDOW_COUNT = 8;
const RANKING_LOOKBACK_WINDOW_COUNT = 12;

function findLatestUsableRankingIndex(rankings) {
  for (let index = rankings.length - 1; index >= 0; index -= 1) {
    if (rankings[index]?.items?.length) return index;
  }
  return -1;
}

function getEmptyRankingWarning(rankings) {
  const rawItemCount = rankings.reduce((total, ranking) => total + (ranking.rawItemCount || 0), 0);

  if (rawItemCount) {
    return `네이버 랭킹 원본 ${rawItemCount}건을 받았지만 기사 식별자가 없어 사용할 수 없습니다.`;
  }

  return `최근 ${rankings.length}개 네이버 랭킹 시간대가 아직 비어 있습니다.`;
}

function getFallbackWarning(skippedRankings, selectedRanking) {
  const firstUnusableWithItems = skippedRankings.find(
    (ranking) => (ranking.rawItemCount || 0) > 0 && !ranking.items?.length
  );

  if (firstUnusableWithItems) {
    return `최신 ${firstUnusableWithItems.label} 원본 ${firstUnusableWithItems.rawItemCount}건에 기사 식별자가 없어 ${selectedRanking.label} 데이터를 사용합니다.`;
  }

  return `최신 랭킹 시간대가 아직 비어 있어 ${selectedRanking.label} 데이터를 사용합니다.`;
}

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
    const windows = getRecentRankingWindows(new Date(), RANKING_LOOKBACK_WINDOW_COUNT);
    const fetchedRankings = await fetchPublisherRankings(windows);
    const latestUsableIndex = findLatestUsableRankingIndex(fetchedRankings);

    if (latestUsableIndex < 0) {
      return {
        rankings: [],
        source: "unavailable",
        warning: getEmptyRankingWarning(fetchedRankings)
      };
    }

    const firstHistoryIndex = Math.max(0, latestUsableIndex - RANKING_HISTORY_WINDOW_COUNT + 1);
    const rankings = fetchedRankings.slice(firstHistoryIndex, latestUsableIndex + 1);
    const skippedRankings = fetchedRankings.slice(latestUsableIndex + 1);
    const warning = skippedRankings.length
      ? getFallbackWarning(skippedRankings, fetchedRankings[latestUsableIndex])
      : undefined;

    return { rankings, source: "live", warning };
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
