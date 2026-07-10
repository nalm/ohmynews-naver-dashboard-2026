import * as cheerio from "cheerio";
import { OHMYNEWS_MOBILE_URL } from "./config";

const COMPONENT_LABELS = {
  MTO99: "오름",
  MTOA99: "오름관련",
  MSA99: "으뜸1",
  MSAS99: "으뜸2",
  MSB99: "버금1",
  MSC99: "버금2"
};

const ALLOWED_COMPONENT_CODES = new Set(Object.keys(COMPONENT_LABELS));


function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s*공유\s*$/g, "")
    .trim();
}

function extractQueryParam(href, parameterName) {
  try {
    const url = new URL(href, OHMYNEWS_MOBILE_URL);
    return url.searchParams.get(parameterName) || url.searchParams.get(parameterName.toLowerCase()) || "";
  } catch {
    const match = String(href || "").match(new RegExp(parameterName + "=([^&\"'<>]+)", "i"));
    return match ? decodeURIComponent(match[1]) : "";
  }
}

function extractCntnCd(href) {
  return extractQueryParam(href, "CNTN_CD");
}

function extractComponentCode($, element, href) {
  const fromHref = extractQueryParam(href, "CMPT_CD");
  if (fromHref) return fromHref.toUpperCase();

  const component = $(element)
    .closest("[CMPT_CD], [cmpt_cd], [data-cmpt-cd], [data-cmpt_cd], [data-component-code]")
    .first();

  const fromComponent = [
    component.attr("CMPT_CD"),
    component.attr("cmpt_cd"),
    component.attr("data-cmpt-cd"),
    component.attr("data-cmpt_cd"),
    component.attr("data-component-code")
  ].find(Boolean);

  return String(fromComponent || "").toUpperCase();
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
    const componentCode = extractComponentCode($, element, href);
    const title = normalizeText($(element).text());
    const identity = componentCode + ":" + cntnCd;
    if (!cntnCd || !componentCode || !title || !ALLOWED_COMPONENT_CODES.has(componentCode) || seen.has(identity)) return;

    seen.add(identity);
    const url = new URL(href, OHMYNEWS_MOBILE_URL).toString();
    const index = articles.length;

    articles.push({
      id: `main-${componentCode}-${cntnCd}`,
      cntnCd,
      crc32: cntnCd,
      title,
      url,
      naverUrl: "",
      position: index + 1,
      placement: "main",
      componentCode,
      componentLabel: COMPONENT_LABELS[componentCode],
      blockType: componentCode
    });
  });

  return articles;
}

export async function getCurrentMainArticles() {
  const html = await fetchOhmynewsMobileHtml();
  return parseOhmynewsMobile(html);
}
