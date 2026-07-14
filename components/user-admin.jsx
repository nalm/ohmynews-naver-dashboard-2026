"use client";

import { Loader2, Power, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

function messageForError(error) {
  if (error === "invalid_email") return "올바른 이메일 주소를 입력해 주세요.";
  if (error === "administrator_email_managed_by_environment") return "관리자 이메일은 환경변수에서만 관리합니다.";
  if (error === "database_not_configured") return "Postgres 연결이 설정되지 않았습니다.";
  if (error === "forbidden") return "관리자 권한이 없습니다.";
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function UserAdmin({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changingEmail, setChangingEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestUsers() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "request_failed");
      setUsers(data.users || []);
    } catch (requestError) {
      setError(messageForError(requestError.message));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    requestUsers();
  }, []);

  async function addUser(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "request_failed");
      setUsers(data.users || []);
      setEmail("");
      setName("");
      setNotice("사용자 접근 권한을 저장했습니다.");
    } catch (requestError) {
      setError(messageForError(requestError.message));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(user) {
    setChangingEmail(user.email);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email, isActive: !user.isActive })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "request_failed");
      setUsers(data.users || []);
      setNotice(user.isActive ? "사용자 접근 권한을 비활성화했습니다." : "사용자 접근 권한을 다시 활성화했습니다.");
    } catch (requestError) {
      setError(messageForError(requestError.message));
    } finally {
      setChangingEmail("");
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">접근 제어</p>
          <h1>대시보드 사용자 관리</h1>
          <p>관리자 {currentUser.email}</p>
        </div>
        <a className="admin-back-link" href="/">대시보드로 돌아가기</a>
      </header>

      <section className="admin-note" aria-label="관리자 계정 안내">
        <ShieldCheck size={20} />
        <div>
          <strong>관리자 계정은 환경변수에서만 관리됩니다.</strong>
          <p>ALLOWED_EMAILS에는 관리자 이메일만 남기고, 아래 목록에서 편집자 계정을 추가하거나 비활성화하세요.</p>
        </div>
      </section>

      <div className="admin-grid">
        <section className="admin-card add-user-card">
          <div className="admin-card-head">
            <div>
              <p className="eyebrow">새 접근 권한</p>
              <h2>사용자 추가</h2>
            </div>
            <UserPlus size={20} />
          </div>
          <form className="user-form" onSubmit={addUser}>
            <label>
              이메일
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="editor@example.com" autoComplete="email" required />
            </label>
            <label>
              이름 <span>(선택)</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="편집자 이름" autoComplete="name" />
            </label>
            <button className="admin-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />}
              사용자 추가
            </button>
          </form>
          <p className="admin-helper">이미 비활성화된 이메일을 다시 추가하면 해당 계정이 활성화됩니다.</p>
        </section>

        <section className="admin-card users-card">
          <div className="admin-card-head">
            <div>
              <p className="eyebrow">Postgres 접근 목록</p>
              <h2>사용자 {users.length}명</h2>
            </div>
            <button className="icon-button" type="button" onClick={requestUsers} disabled={isLoading} aria-label="사용자 목록 새로고침">
              {isLoading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
          </div>

          {error ? <div className="admin-message is-error">{error}</div> : null}
          {notice ? <div className="admin-message is-success">{notice}</div> : null}

          {isLoading ? (
            <div className="admin-loading"><Loader2 className="spin" size={20} /> 목록을 불러오는 중</div>
          ) : users.length ? (
            <div className="user-list">
              {users.map((user) => {
                const isChanging = changingEmail === user.email;
                return (
                  <article className="managed-user" key={user.email}>
                    <div className="managed-user-copy">
                      <div className="managed-user-name-row">
                        <strong>{user.name || user.email}</strong>
                        <span className={user.isActive ? "access-status is-active" : "access-status is-inactive"}>
                          {user.isActive ? "활성" : "비활성"}
                        </span>
                      </div>
                      {user.name ? <span className="managed-user-email">{user.email}</span> : null}
                      <span className="managed-user-meta">
                        {user.isActive ? `등록 ${formatDate(user.createdAt)}` : `비활성화 ${formatDate(user.deactivatedAt)}`}
                      </span>
                    </div>
                    <button className={user.isActive ? "user-status-button is-disable" : "user-status-button is-enable"} type="button" onClick={() => changeStatus(user)} disabled={isChanging}>
                      {isChanging ? <Loader2 className="spin" size={15} /> : <Power size={15} />}
                      {user.isActive ? "비활성화" : "활성화"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty"><Users size={22} /> 아직 등록된 사용자가 없습니다.</div>
          )}
        </section>
      </div>
    </main>
  );
}
