# Deployment Notes

## Production URL

https://ohmynews-naver-dashboard-2026.vercel.app

The current production deployment is intentionally locked until Google OAuth variables are configured. The page should show `인증 설정 필요`, and `/api/dashboard` should return `503` with `auth_not_configured`.

## Vercel Project

- Scope: `nalms-projects`
- Project: `ohmynews-naver-dashboard-2026`
- Framework override: `vercel.json` uses `@vercel/next` because the project was initially detected as Express.

## Required Environment Variables

Set these in Vercel Project Settings.

```text
AUTH_URL=https://ohmynews-naver-dashboard-2026.vercel.app
AUTH_SECRET=<long random secret>
GOOGLE_CLIENT_ID=<google oauth client id>
GOOGLE_CLIENT_SECRET=<google oauth client secret>
ALLOWED_EMAILS=editor1@gmail.com,editor2@gmail.com
NAVER_CLIENT_ID=<naver mediahub client id>
NAVER_CLIENT_SECRET=<naver mediahub client secret>
NAVER_API_HOST=https://api-gw.media.naver.com
OHMYNEWS_MOBILE_URL=https://m.ohmynews.com/
CRON_SECRET=<long random secret>
POSTGRES_URL=<neon or postgres connection string>
```

## Google OAuth Redirect URI

Add this redirect URI in Google Cloud Console:

```text
https://ohmynews-naver-dashboard-2026.vercel.app/api/auth/callback/google
```

## Thirty-Minute Collection

Vercel Hobby cannot run `*/30 * * * *` Cron. Use one of these paths:

- Upgrade the Vercel project to Pro and restore the `crons` block documented in `docs/scheduler.md`.
- Keep Hobby and call `/api/cron/collect` every 30 minutes from an external scheduler with `Authorization: Bearer <CRON_SECRET>`.

## Deploy Command

```bash
vercel deploy --prod --yes --scope nalms-projects --no-color
```
