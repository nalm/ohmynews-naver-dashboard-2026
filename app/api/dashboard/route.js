import { auth, hasDashboardAccess, isAuthConfigured, isAuthRequired } from "../../../lib/auth";
import { buildDashboardPayload } from "../../../lib/collector";
import { loadLatestSnapshot } from "../../../lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const authReady = isAuthConfigured();

  if (isAuthRequired() && !authReady) {
    return Response.json({ error: "auth_not_configured" }, { status: 503 });
  }

  if (authReady) {
    const session = await auth();
    if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!(await hasDashboardAccess(session.user?.email))) {
      return Response.json({ error: "access_revoked" }, { status: 403 });
    }
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  if (!refresh) {
    const latest = await loadLatestSnapshot();
    if (latest) return Response.json(latest);
  }

  const payload = await buildDashboardPayload({ persist: refresh });
  return Response.json(payload);
}
