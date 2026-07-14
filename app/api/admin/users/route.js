import { auth, isAdminEmail, isAuthConfigured } from "../../../../lib/auth";
import { hasDatabase, listAccessUsers, normalizeEmail, setAccessUserActive, upsertAccessUser } from "../../../../lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdministrator() {
  if (!isAuthConfigured()) return { error: "auth_not_configured", status: 503 };

  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return { error: "unauthorized", status: 401 };
  if (!isAdminEmail(email)) return { error: "forbidden", status: 403 };
  if (!hasDatabase()) return { error: "database_not_configured", status: 503 };
  return { email };
}

function errorResponse(error, status) {
  return Response.json({ error }, { status });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const administrator = await requireAdministrator();
  if (administrator.error) return errorResponse(administrator.error, administrator.status);

  try {
    return Response.json({ users: await listAccessUsers() });
  } catch {
    return errorResponse("database_error", 500);
  }
}

export async function POST(request) {
  const administrator = await requireAdministrator();
  if (administrator.error) return errorResponse(administrator.error, administrator.status);

  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return errorResponse("invalid_email", 400);
  if (isAdminEmail(email)) return errorResponse("administrator_email_managed_by_environment", 400);

  try {
    const user = await upsertAccessUser({ email, name: body?.name, createdBy: administrator.email });
    return Response.json({ user, users: await listAccessUsers() });
  } catch (error) {
    const errorCode = error.message === "invalid_email" ? "invalid_email" : "database_error";
    return errorResponse(errorCode, errorCode === "invalid_email" ? 400 : 500);
  }
}

export async function PATCH(request) {
  const administrator = await requireAdministrator();
  if (administrator.error) return errorResponse(administrator.error, administrator.status);

  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email || typeof body?.isActive !== "boolean") return errorResponse("invalid_request", 400);
  if (isAdminEmail(email)) return errorResponse("administrator_email_managed_by_environment", 400);

  try {
    const user = await setAccessUserActive(email, body.isActive);
    if (!user) return errorResponse("user_not_found", 404);
    return Response.json({ user, users: await listAccessUsers() });
  } catch (error) {
    const errorCode = error.message === "invalid_email" ? "invalid_email" : "database_error";
    return errorResponse(errorCode, errorCode === "invalid_email" ? 400 : 500);
  }
}