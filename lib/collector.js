import { OHMYNEWS_MOBILE_URL, isNaverConfigured } from "./config";
import { getDemoMainArticles, getDemoRankings } from "./demo-data";
import { getCurrentMainArticles } from "./ohmynews";
import { fetchPublisherRankings, getRecentRankingWindows } from "./naver";
import { mergeDashboardData } from "./recommendations";
import { hasDatabase, saveSnapshot } from "./store";

async function loadMainArticles() {
  try {
    const articles = await getCurrentMainArticles();
    return articles.length ? { articles, source: "live" } : { articles: getDemoMainArticles(), source: "demo" };
  } catch (error) {
    return { articles: getDemoMainArticles(), source: "demo", warning: error.message };
  }
}

async function loadRankings(mainArticles) {
  if (!isNaverConfigured()) {
    return { rankings: getDemoRankings(mainArticles), source: "demo" };
  }

  try {
    const windows = getRecentRankingWindows(new Date(), 3);
    return { rankings: await fetchPublisherRankings(windows), source: "live" };
  } catch (error) {
    return { rankings: getDemoRankings(mainArticles), source: "demo", warning: error.message };
  }
}

export async function buildDashboardPayload({ persist = false } = {}) {
  const main = await loadMainArticles();
  const ranking = await loadRankings(main.articles);
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
    rankingWindows: ranking.rankings.map(({ windowKey, label, date, hour }) => ({
      windowKey,
      label,
      date,
      hour
    })),
    ...merged
  };

  if (persist) {
    await saveSnapshot(payload);
  }

  return payload;
}
