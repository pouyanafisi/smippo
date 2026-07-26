/**
 * HTML fixtures for challenge detection. No network access - these are static
 * strings modelled on real captures found in ~/.smippo/sites.
 */

/**
 * Cloudflare managed challenge, as smippo actually saved it.
 * Reduced from a real capture (support.grammarly.com/hc/en-us.html) that smippo
 * had recorded as a successfully captured page with status 200 and zero errors.
 * Note it has no `cf_chl_opt` - that variant marker is absent here, which is why
 * detection cannot rely on any single string.
 */
export const CLOUDFLARE_MANAGED_CHALLENGE = `<!DOCTYPE html><html lang="en-US"><head>
<title style="transition: none !important;">Just a moment...</title>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="robots" content="noindex,nofollow">
<script src="/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9ec456b7ddcf2b54"></script>
</head><body class="no-js">
<div class="main-wrapper" role="main"><div class="main-content">
<h1 class="zone-name-title h1">example.com</h1>
<h2 id="challenge-running" class="h2">Verifying you are human. This may take a few seconds.</h2>
<div id="challenge-stage"><script src="https://challenges.cloudflare.com/turnstile/v0/g/b0a7532ac8ec/api-222e42a8.js"></script></div>
<noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript>
</div></div></body></html>`;

/**
 * The older "I'm Under Attack Mode" interstitial, which carries cf_chl_opt.
 */
export const CLOUDFLARE_IUAM_CHALLENGE = `<!DOCTYPE html><html><head>
<title>Just a moment...</title></head><body>
<h1>Checking your browser before accessing example.com</h1>
<script>window._cf_chl_opt={cvId:'2',cType:'managed',cRay:'8b1c'};</script>
</body></html>`;

/**
 * A Cloudflare 1020 / firewall block page, served with HTTP 403.
 */
export const CLOUDFLARE_BLOCK_403 = `<!DOCTYPE html><html><head>
<title>Attention Required! | Cloudflare</title></head><body>
<h1>Sorry, you have been blocked</h1>
<p>You are unable to access example.com</p></body></html>`;

/**
 * A page with NO challenge markers at all - the control.
 */
export const NORMAL_PAGE = `<!DOCTYPE html><html><head>
<title>3d Animation Schools | Game Art Courses - Think Tank</title></head><body>
<h1>Welcome</h1><p>Real content lives here.</p>
<script src="/_nuxt/entry.4964cec9.js"></script></body></html>`;

/**
 * The important false positive: a genuine page that embeds a Turnstile widget in
 * its contact form. Modelled on the real www.tttc.ca capture, whose main HTML
 * does NOT mention challenges.cloudflare.com even though the widget script shows
 * up among its sub-resources. This is why the host is corroborating evidence
 * only, and why detection reads the main document rather than the asset list.
 */
export const LEGIT_PAGE_EMBEDDING_TURNSTILE = `<!DOCTYPE html><html><head>
<title>Contact Us | Think Tank Training Centre</title></head><body>
<h1>Contact</h1>
<form><input name="email"><div class="cf-turnstile" data-sitekey="0x4AA"></div></form>
<script src="https://challenges.cloudflare.com/turnstile/v0/b/88d68f5d5ea3/api.js"></script>
</body></html>`;

/**
 * A documentation page that merely writes about challenge pages. One weak marker
 * on its own must not condemn it.
 */
export const PAGE_DISCUSSING_CHALLENGES = `<!DOCTYPE html><html><head>
<title>How our bot protection works</title></head><body>
<h1>Bot protection</h1>
<p>Visitors may briefly see a page asking them to verify. Our widget is served
from challenges.cloudflare.com and is safe to allow through your firewall.</p>
</body></html>`;
