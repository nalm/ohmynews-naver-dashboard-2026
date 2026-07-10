import { isVercelDeployment } from "../../../../lib/auth";
import { buildDashboardPayload } from "../../../../lib/collector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return !isVercelDeployment();

  const header = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  return header === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await buildDashboardPayload({ persist: true });
  return Response.json({
    ok: true,
    collectedAt: payload.collectedAt,
    mode: payload.mode,
    mainArticleCount: payload.mainArticles.length,
    recommendationCount: payload.recommendations.length
  });
}
