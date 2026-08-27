---
"@buildpad/cli": patch
---

CLI: stop CloudFront from caching authenticated pages, and fix the logout redirect behind AWS Amplify.

Two template defects surfaced in production behind AWS Amplify/CloudFront:

- `middleware.ts` never set `Cache-Control`, so CloudFront (and any shared cache) stored authenticated pages for a year with no `Vary: Cookie` — one signed-in user's response could be served to a different visitor. It now sets `Cache-Control: private, no-store, must-revalidate` on every response.
- `auth-logout-route.ts` built absolute redirects from `request.nextUrl.origin`, which resolves to the compute process's own `localhost:3000` behind Amplify instead of the app's real public address, breaking logout entirely.

The logout fix needed two passes to get right. The first added a `publicOrigin()` helper (preferring `NEXT_PUBLIC_HOST_ORIGIN`, then `x-forwarded-host`/`host`, falling back to `request.nextUrl.origin`) — correct in isolation, confirmed via a diagnostic endpoint deployed to a live Amplify app. But the redirects still built their target with `new URL('/login', request.url)`, which silently discarded that fix: `NextResponse.redirect()` always emits an absolute `Location` header computed server-side, never resolved client-side by the browser, and `request.url` is derived from the same broken internal address `publicOrigin()` exists to work around. Every redirect now builds its target from the resolved `origin` value instead.
