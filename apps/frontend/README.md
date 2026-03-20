# Frontend (Next.js)

Next.js App Router dashboard frontend. The UI lives in the app routes and the live Sales Revenue dashboard data is loaded through an internal Salesforce-backed API route.

## Routes

- `/` - primary dashboard UI
- `/dashboard-2` - alternative dashboard view
- `/dashboard-3` - alternative dashboard view

## Frontend API

- `GET /api/sf/revenue`
- `GET|POST /api/auth/[...nextauth]`

This route validates the requested window, queries Salesforce on the server, normalizes the aggregates, and returns a browser-safe chart payload.

## Environment

```bash
cp .env.example .env.local
```

For local development, either:

- authenticate the local `sf` CLI and set `SF_TARGET_ORG`, or
- set `SF_ACCESS_TOKEN` and `SF_INSTANCE_URL` in `.env.local`

For Slack sign-in with Auth.js, also set:

- `AUTH_SECRET`
- `AUTH_SLACK_ID`
- `AUTH_SLACK_SECRET`
- `AUTH_SLACK_TEAM_ID`

Optional:

- `SF_API_VERSION` defaults to `v66.0`
- `SF_REVENUE_CACHE_TTL_MS` defaults to `300000`

## Slack OAuth Setup

Register one of these redirect URLs in the Slack app configuration, depending on how the app is exposed:

- `https://<your-domain>/api/auth/callback/slack`
- `https://<your-domain>/api/auth/slack/callback`

If the app is mounted below a path prefix, include the prefix before `/api/auth`. Example:

- `https://www.highcharts.com/chat/gpt/api/auth/callback/slack`

The app uses `AUTH_SLACK_TEAM_ID` to do two things:

- hint Slack to open that workspace during sign-in
- reject any callback that returns from a different Slack workspace

## Query Salesforce With SOQL (`sf` CLI)

Run ad hoc SOQL from the frontend workspace:

```bash
npm run sf:query -- --query "SELECT Id, Name FROM Account LIMIT 10"
```

## Run

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run test
npm run build
```
