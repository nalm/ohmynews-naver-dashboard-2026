# Scheduler Setup

The app exposes a protected collection endpoint:

```text
GET /api/cron/collect
Authorization: Bearer <CRON_SECRET>
```

## Vercel Hobby

Vercel Hobby accounts cannot run a cron job every 30 minutes. Keep `vercel.json` without a `crons` block and trigger `/api/cron/collect` from an external scheduler such as GitHub Actions, cron-job.org, or another internal scheduler.

## Vercel Pro

On Vercel Pro or higher, add this to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/collect",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Set `CRON_SECRET` in Vercel. Vercel Cron sends the bearer token when the environment variable exists.
