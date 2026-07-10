export const OHMYNEWS_MOBILE_URL =
  process.env.OHMYNEWS_MOBILE_URL || "https://m.ohmynews.com/";

export const NAVER_API_HOST =
  process.env.NAVER_API_HOST || "https://api-gw.media.naver.com";

export function isNaverConfigured() {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}
