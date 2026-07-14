import { ShieldCheck } from "lucide-react";
import UserAdmin from "../../../components/user-admin";
import { auth, isAdminEmail, isAuthConfigured } from "../../../lib/auth";
import { hasDatabase } from "../../../lib/store";

export const dynamic = "force-dynamic";

function AccessMessage({ title, description, signOut = false }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-mark">
          <ShieldCheck size={30} strokeWidth={1.8} />
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        <a className="primary-link" href={signOut ? "/api/auth/signout" : "/"}>
          {signOut ? "다른 계정으로 로그인" : "대시보드로 돌아가기"}
        </a>
      </section>
    </main>
  );
}

export default async function UserManagementPage() {
  if (!isAuthConfigured()) {
    return <AccessMessage title="인증 설정 필요" description="Google OAuth를 설정한 뒤 사용자 관리 화면을 사용할 수 있습니다." />;
  }

  const session = await auth();
  const email = session?.user?.email || "";
  if (!session) {
    return <AccessMessage title="로그인이 필요합니다" description="관리자 Google 계정으로 로그인해 주세요." />;
  }
  if (!isAdminEmail(email)) {
    return <AccessMessage title="관리자 권한이 없습니다" description="이 화면은 환경변수에 등록된 관리자만 사용할 수 있습니다." signOut />;
  }
  if (!hasDatabase()) {
    return <AccessMessage title="데이터베이스 연결 필요" description="POSTGRES_URL을 설정하면 사용자 접근 권한을 관리할 수 있습니다." />;
  }

  return <UserAdmin currentUser={{ name: session.user?.name || "", email }} />;
}