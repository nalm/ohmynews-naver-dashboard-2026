import { ShieldCheck } from "lucide-react";
import Dashboard from "../components/dashboard";
import { auth, hasDashboardAccess, isAdminEmail, isAuthConfigured, isAuthRequired } from "../lib/auth";

export const dynamic = "force-dynamic";

function SetupRequired() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-mark">
          <ShieldCheck size={30} strokeWidth={1.8} />
        </div>
        <h1>인증 설정 필요</h1>
        <p>Vercel 환경변수에 Google OAuth를 설정하면 내부 편집자만 접속할 수 있습니다.</p>
      </section>
    </main>
  );
}

export default async function Page() {
  const authReady = isAuthConfigured();
  const authRequired = isAuthRequired();

  if (authRequired && !authReady) return <SetupRequired />;

  const session = authReady ? await auth() : null;

  if (authReady && !session) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-mark">
            <ShieldCheck size={30} strokeWidth={1.8} />
          </div>
          <h1>오마이뉴스 편집 대시보드</h1>
          <p>허용된 Google 계정으로 로그인해야 들어갈 수 있습니다.</p>
          <a className="primary-link" href="/api/auth/signin">
            Google 계정으로 로그인
          </a>
        </section>
      </main>
    );
  }

  const email = session?.user?.email || "";
  if (authReady && !(await hasDashboardAccess(email))) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-mark">
            <ShieldCheck size={30} strokeWidth={1.8} />
          </div>
          <h1>접근 권한이 없습니다</h1>
          <p>관리자에게 대시보드 접근 권한을 요청해 주세요.</p>
          <a className="primary-link" href="/api/auth/signout">
            다른 계정으로 로그인
          </a>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      authReady={authReady}
      isAdmin={isAdminEmail(email)}
      user={
        session?.user
          ? { name: session.user.name, email: session.user.email, image: session.user.image }
          : null
      }
    />
  );
}
