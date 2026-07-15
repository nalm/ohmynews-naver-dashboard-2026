import crypto from "node:crypto";
import { NAVER_API_HOST } from "./config";

let tokenCache = null;
const RANKING_PUBLICATION_DELAY_MINUTES = 15;

function createSignature(clientId, clientSecret, timestamp) {
  return crypto
    .createHmac("sha1", clientSecret)
    .update(`${clientId}_${timestamp}`)
    .digest("base64");
}

export async function getNaverAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Naver credentials are not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    timestamp: String(timestamp),
    client_id: clientId,
    client_secret_sign: createSignature(clientId, clientSecret, timestamp)
  });

  const response = await fetch(`${NAVER_API_HOST}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Naver token request failed: ${response.status}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 10800) - 120) * 1000
  };

  return tokenCache.accessToken;
}

async function naverGet(path) {
  const token = await getNaverAccessToken();
  const response = await fetch(`${NAVER_API_HOST}${path}`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Naver API request failed: ${response.status} ${path}`);
  }

  return response.json();
}

export async function getArticleByCrc32(crc32) {
  return naverGet(`/v1/news/contents/${encodeURIComponent(crc32)}?contentIdType=CRC32`);
}

function getKstParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatDateKey(date) {
  const parts = getKstParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
}

function windowLabel(date, hour) {
  const endHour = hour === 24 ? 24 : hour;
  const startHour = endHour === 24 ? 23 : Math.max(0, endHour - 1);
  return `${formatDateKey(date).slice(4)} ${String(startHour).padStart(2, "0")}-${String(endHour).padStart(2, "0")}시`;
}

export function getRecentRankingWindows(now = new Date(), count = 3) {
  const parts = getKstParts(now);
  const kstHour = Number(parts.hour);
  const kstMinute = Number(parts.minute);
  let endHour = kstMinute >= RANKING_PUBLICATION_DELAY_MINUTES ? kstHour : kstHour - 1;
  let cursor = new Date(now);

  const windows = [];
  while (windows.length < count) {
    if (endHour <= 0) {
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      endHour = 24;
    }

    windows.unshift({
      date: formatDateKey(cursor),
      hour: endHour,
      label: windowLabel(cursor, endHour),
      windowKey: `${formatDateKey(cursor)}-${String(endHour).padStart(2, "0")}`
    });
    endHour -= 1;
  }

  return windows;
}

function normalizeRankingItem(item) {
  return {
    crc32: item.crc32 || item.CRC32 || "",
    articleId: item.articleId || item.aid || "",
    title: item.title || "",
    rank: Number(item.rank || 0),
    count: Number(item.count || 0),
    linkUrl: item.linkUrl || item.url || "",
    thumbnail: item.thumbnail || ""
  };
}

export async function fetchPublisherRankings(windows = getRecentRankingWindows()) {
  const results = [];

  for (const rankingWindow of windows) {
    const query = new URLSearchParams({
      criterion: "VIEW",
      hour: String(rankingWindow.hour)
    });
    const data = await naverGet(`/v1/news/ranking/contents/${rankingWindow.date}?${query}`);
    const rawItems = Array.isArray(data?.result?.elementList) ? data.result.elementList : [];
    const items = rawItems.map(normalizeRankingItem).filter((item) => item.crc32 || item.articleId);
    results.push({
      ...rankingWindow,
      rawItemCount: rawItems.length,
      excludedItemCount: rawItems.length - items.length,
      items
    });
  }

  return results;
}
