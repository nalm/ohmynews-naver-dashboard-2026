# MVP Specification

## Goal

Build an internal editorial dashboard that helps OhmyNews editors decide mobile-front placement using Naver view-ranking movement.

## Target Users

OhmyNews internal editors who decide which articles should be promoted on the mobile web main page.

## Source Range

The source page is `https://m.ohmynews.com/`.

The dashboard extracts articles from the first article on the mobile page through the block immediately before `스페셜 콘텐츠`.

## Authentication

The app uses Google login. Only Gmail addresses listed in `ALLOWED_EMAILS` can enter.

Naver API credentials are never sent to the browser. They are stored as Vercel environment variables and used only inside server routes.

## Data Collection

Collection runs every 30 minutes.

1. Fetch OhmyNews mobile HTML.
2. Parse article title, URL, position, `CNTN_CD`, and visual block type.
3. Use `CNTN_CD` as Naver `CRC32`.
4. Fetch the latest completed Naver hourly ranking windows for `VIEW`.
5. Merge Naver ranking items with current mobile-front articles.
6. Add Naver-ranking articles that are not on the current mobile front as external candidates.
7. Save a JSON dashboard snapshot.

## Trend Logic

The MVP compares the latest available hourly count against the earliest count in the recent 3-hour window.

- `상승`: growth rate is at least `20%`
- `하락`: growth rate is at most `-15%`
- `유지`: values between those thresholds
- `신규`: only the latest window exists
- `랭킹 밖`: not present in Naver ranking data

## Recommendation Score

```text
score = recent 3-hour growth 55%
      + latest hourly volume 25%
      + current Naver rank 15%
      + placement mismatch / external candidate bonus 5%
```

The default recommendation queue shows the top 10 articles.

## Screens

- Mobile-front view: mobile-main-like article list with Naver badges.
- Detail panel: selected article's ranking history, growth, URL, status, and recommendation rationale.
- Recommendation queue: articles to consider promoting now.
- Status bar: last collection time, source URL, live/demo mode, API/DB configuration state.

## Production Deployment

Use Vercel with:

- Next.js app deployment
- Google OAuth credentials
- Vercel environment variables
- Vercel Cron
- Neon or Supabase Postgres

