---
"@buildpad/cli": patch
---

CLI: stop CloudFront from caching authenticated pages, and fix every redirect and OAuth `redirect_uri` that was built from the server's internal address.

Two template defects surfaced in production behind AWS Amplify/CloudFront:

- `middleware.ts` never set `Cache-Control`, so CloudFront (and any shared cache) stored authenticated pages for a year with no `Vary: Cookie` — one signed-in user's response could be served to a different visitor. It now sets `Cache-Control: private, no-store, must-revalidate` on every response.
- Redirect targets were built from `request.url` / `request.nextUrl.origin`, which behind a reverse proxy resolves to the compute process's own `localhost:3000` rather than the app's real public address. `NextResponse.redirect()` always emits an absolute `Location` header computed server-side — it is never resolved client-side by the browser — so every affected redirect sent users to `https://localhost:3000/...`.

**New shared module: `lib/origin.ts`** (installed by `supabase-auth`, on which `api-routes` and `external-oauth` both depend). It exports:

- `publicOrigin(request)` — resolves the app's real public origin, preferring `NEXT_PUBLIC_HOST_ORIGIN` / `HOST_ORIGIN`, then the first hop of `x-forwarded-host` / `host` (ignoring loopback addresses), then `request.nextUrl.origin`. The protocol falls back to the request's own rather than assuming `https`, so dev servers bound to a LAN IP or `127.0.0.1` keep working.
- `publicUrl(request, path)` and `safeRelativePath(path)`.

Set `NEXT_PUBLIC_HOST_ORIGIN` to your app's public origin (e.g. `https://app.example.com`) in production. Without it the resolution falls back to request headers, which are client-supplied unless your proxy overwrites them.

All redirect and `redirect_uri` construction now goes through it:

- `api/auth/logout` (`GET` and `POST`) — redirects and the IdP `post_logout_redirect_uri`.
- `api/auth/callback` (both the Supabase-native and `external-oauth` versions) — every error redirect, plus the `redirect_uri` sent during token exchange.
- `api/auth/oauth/[provider]` — the `redirect_uri` sent to the IdP's authorize endpoint. This one must byte-match the value the callback route sends and the URI registered with the provider, so external OAuth sign-in was broken behind a proxy in exactly the same way logout was.
- `lib/supabase/middleware.ts` — the unauthenticated-user redirect to `/login`, which fires on every protected page load.

Also fixes an open redirect in both callback routes: `?next=` (and the OAuth flow's `returnTo`) were resolved against a URL base, so `?next=https://evil.example` produced a redirect off-site. They are now constrained to absolute paths on the app's own origin.
