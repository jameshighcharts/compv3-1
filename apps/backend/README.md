# Backend Workspace

Server-side data layer for the project.

This workspace owns:

- Salesforce auth and query execution
- revenue window parsing and normalization
- server-side payload shaping for frontend API routes

It is consumed by the Next.js app in `apps/frontend` and is not deployed as a standalone HTTP service yet.
