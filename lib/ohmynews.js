import * as cheerio from "cheerio";
import { OHMYNEWS_MOBILE_URL } from "./config";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s*공유\s*$/g, "")
    .trim();
}

function extractCntnCd(href) {
  try {
    const url = new URL(href, OHMYNEWS_MOBILE_URL);
    return url.searchParams.get("CNTN_CD") || url.searchParams.get("cntn_cd") || "";
  } catch {
    const match = String(href).match(/CNTN_CD=([^&"'<>]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

function blockTypeFor(index, title) {
  if (index === 0) return "top";
  if (/오마이포토/.test(title)) return "photo";
  if (index < 14) return "main-list";
  return "secondary";
}

export async function fetchOhmynewsMobileHtml() {
  const response = await fetch(OHMYNEWS_MOBILE_URL, {
    headers: {
      "user-agent": "OhmyNewsNaverTrendDashboard/0.1"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`OhmyNews mobile fetch failed: ${response.status}`);
  }

  return response.text();
}

export function parseOhmynewsMobile(html) {
  const specialIndex = html.indexOf("스페셜 콘텐츠");
  const scopedHtml = specialIndex >= 0 ? html.slice(0, specialIndex) : html;
  const $ = cheerio.load(scopedHtml);
  const seen = new Set();
  const articles = [];

  $('a[href*="CNTN_CD="]').each((_, element) => {
    const href = $(element).attr("href");
    const cntnCd = extractCntnCd(href);
    const title = normalizeText($(element).text());
    if (!cntnCd || !title || seen.has(cntnCd)) return;

    seen.add(cntnCd);
    const url = new URL(href, OHMYNEWS_MOBILE_URL).toString();
    const index = articles.length;

    articles.push({
      id: `main-${cntnCd}`,
      cntnCd,
      crc32: cntnCd,
      title,
      url,
      naverUrl: "",
      position: index + 1,
      placement: "main",
      blockType: blockTypeFor(index, title)
    });
  });

  return articles;
}

export async function getCurrentMainArticles() {
  const html = await fetchOhmynewsMobileHtml();
  return parseOhmynewsMobile(html);
}
