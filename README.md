# OhmyNews Naver Trend Dashboard

Internal editorial dashboard for comparing the OhmyNews mobile front layout with Naver view-ranking signals.

## What It Does

- Reads the mobile front page from `https://m.ohmynews.com/`.
- Extracts articles from the first article through the block before `스페셜 콘텐츠`.
- Treats OhmyNews `CNTN_CD` as the Naver API `CRC32` identifier.
- Pulls Naver publisher article rankings with `criterion=VIEW`.
- Calculates recent 3-hour view trend and recommendation scores.
- Shows a mobile-front-like layout, article detail panel, and top recommendation queue.
- Uses Google login with an explicit Gmail allowlist.

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Without Naver credentials or a database, the app runs in demo mode with realistic sample data. The UI, trend calculation, and recommendation logic still work.

## Required Production Environment Variables

- `AUTH_URL`
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_EMAILS`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `CRON_SECRET`
- `POSTGRES_URL`

## Vercel Notes

- Deploy this project to Vercel.
- Add the environment variables in Project Settings.
- Connect Neon or another Postgres database from the Vercel Marketplace.
- The collection endpoint supports 30-minute scheduling. Vercel Hobby needs an external scheduler; Vercel Pro can use `vercel.json` cron. See `docs/scheduler.md`.
- Scheduler times should be treated as UTC; the app converts ranking windows using Korea time.
- Set the Google OAuth redirect URI to `https://YOUR_DOMAIN/api/auth/callback/google`.

## Database

The MVP stores each collection run as one JSON snapshot. See `docs/database.sql`.

## Important API Assumptions

- OhmyNews `CNTN_CD` is passed to the Naver article API as `contentIdType=CRC32`.
- Ranking uses `VIEW` only.
- Articles outside the Naver top-50 ranking are shown as `랭킹 밖`.
- Mobile-front-external candidates are limited to the recommendation top 10 by default.

