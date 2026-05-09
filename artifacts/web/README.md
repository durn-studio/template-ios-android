# Bubble Masters — marketing site

Static site for **bubblemastersultimate.com**. Plain HTML + CSS, no build step, deploys to Vercel.

## Structure

```
artifacts/web/
├── index.html        # landing page
├── privacy.html      # /privacy
├── terms.html        # /terms
├── support.html      # /support
├── app-ads.txt       # /app-ads.txt (IAB ad-authorization)
├── robots.txt
├── sitemap.xml
├── vercel.json       # clean URLs, security headers, text/plain on app-ads.txt
└── assets/
    ├── icon.png
    ├── styles.css
    └── screenshots/
```

## Local dev

```bash
cd artifacts/web
pnpm dev              # serves on http://localhost:4321
```

## Deploy on Vercel (one-time setup)

The repo is already connected to Vercel via GitHub. To point Vercel at this
subdirectory:

1. Vercel dashboard → **Add New Project** → pick `durn-studio/fruitclash`.
2. **Root Directory** → `artifacts/web` (click Edit next to the input).
3. **Framework Preset** → `Other` (static site).
4. **Build Command** → leave blank.
5. **Output Directory** → leave blank (uses the root directory itself).
6. Deploy.

### Custom domain

Once the first deploy succeeds:

1. Project → **Settings** → **Domains** → add `bubblemastersultimate.com`.
2. Also add `www.bubblemastersultimate.com` (Vercel will redirect to apex).
3. Vercel shows the DNS records to set at your registrar:
   - **A** record `@` → `76.76.21.21`
   - **CNAME** `www` → `cname.vercel-dns.com`
4. Wait for DNS (usually < 5 min). Vercel auto-issues a Let's Encrypt cert.

## Updating the site

Any push to the repo's default branch triggers a Vercel deploy automatically.
Previews are created for every PR.

## app-ads.txt

Bubble Masters runs **AdMob direct** — no mediation layer. The only
line `app-ads.txt` needs is the AdMob publisher entry:

```
google.com, pub-3083118242430480, DIRECT, f08c47fec0942fa0
```

That's enough for Google's `Apps → Bubble Masters → Verify` crawler
to confirm we own the publisher ID. Don't add RESELLER lines for
other networks unless you actually buy ads through them — stale
reseller entries (e.g. left over from a prior mediation setup) can
fail Google's verification because the downstream network hasn't
authorized our publisher ID.

If you ever switch to a mediation layer (Appodeal, MAX, etc.), the
mediator's dashboard generates a complete file — paste that in to
overwrite `artifacts/web/app-ads.txt` whole, then commit + push.

Verify the live file with:

```bash
curl -I https://bubblemastersultimate.com/app-ads.txt
# Content-Type must be text/plain
```

## Contact email

All templated contact addresses point at `hi@bubblemastersultimate.com`.
Set up the mailbox (e.g. Google Workspace, Fastmail, or a catch-all forward)
before going live.
