// @flow

/**
 * Detection of bot-check / interstitial pages.
 *
 * The failure this exists to prevent: smippo captures a Cloudflare Turnstile
 * challenge page, saves it as index.html, and reports "Capture complete!  Pages
 * captured: 1". The user finds out weeks later, after building on garbage.
 *
 * This module ONLY identifies such pages so they can be reported honestly. It
 * does not — and must not — try to defeat the check. No navigator.webdriver
 * patching, no TLS/JA3 spoofing, no stealth plugins. The supported way past a
 * challenge is to drive a real browser (see --cdp / --channel / --user-data-dir),
 * which means a person passes the check in their own browser. Faking a browser
 * is out of scope and unwanted.
 */

/**
 * Markers that only ever appear in the challenge document itself.
 * One of these is enough to call it.
 */
const STRONG_MARKERS = [
  // Cloudflare's inline challenge config object (window._cf_chl_opt = {...})
  {id: 'cf_chl_opt', test: html => html.includes('cf_chl_opt')},
  // The script the interstitial loads to run the check
  {
    id: '/cdn-cgi/challenge-platform/',
    test: html => html.includes('/cdn-cgi/challenge-platform/'),
  },
  // Cloudflare's cv params blob, present on the "Attention Required" variant
  {id: '__CF$cv$params', test: html => html.includes('__CF$cv$params')},
  // The interstitial's title. Scoped to <title> so a page merely discussing it
  // is not flagged.
  {
    id: 'title:Just a moment',
    test: html => /<title[^>]*>\s*Just a moment/i.test(html),
  },
  {
    id: 'title:Attention Required',
    test: html => /<title[^>]*>\s*Attention Required/i.test(html),
  },
  // Legacy "I'm Under Attack Mode" interstitial
  {
    id: 'Checking your browser before accessing',
    test: html => /Checking your browser before accessing/i.test(html),
  },
];

/**
 * Markers that also occur on legitimate pages, so they only count in pairs.
 *
 * `challenges.cloudflare.com` is the important one here. A real capture in this
 * project's own store (www.tttc.ca) is a perfectly good page that embeds a
 * Turnstile widget in its contact form — the host appears among its sub-resources
 * but not in its HTML. Treating that host as proof on its own would condemn a
 * good capture, so it corroborates rather than decides.
 */
const WEAK_MARKERS = [
  {
    id: 'challenges.cloudflare.com',
    test: html => html.includes('challenges.cloudflare.com'),
  },
  {
    id: 'Enable JavaScript and cookies to continue',
    test: html => /Enable JavaScript and cookies to continue/i.test(html),
  },
  {
    id: 'Verifying you are human',
    test: html => /Verifying you are human/i.test(html),
  },
  {
    id: 'captcha-delivery.com',
    test: html => html.includes('captcha-delivery.com'),
  },
  {id: 'px-captcha', test: html => html.includes('px-captcha')},
];

function isHtmlContentType(contentType) {
  return /text\/html|application\/xhtml/i.test(contentType || '');
}

/**
 * Decide whether a captured page is a challenge/interstitial rather than content.
 *
 * @param {Object} page
 * @param {string} [page.html] - the rendered HTML that would be saved
 * @param {number} [page.status] - HTTP status of the main navigation
 * @param {string} [page.contentType] - content-type of the main navigation
 * @returns {{challenged: boolean, markers: string[], reason: string|null}}
 */
export function detectChallenge({html = '', status, contentType} = {}) {
  const markers = [];

  // An HTTP 403 that still returns an HTML body is a block page, not content.
  // A 403 on a JSON/API route is a different animal and is left alone.
  const forbiddenHtml =
    status === 403 && (isHtmlContentType(contentType) || /<html/i.test(html));
  if (forbiddenHtml) {
    markers.push('http:403+html');
  }

  for (const marker of STRONG_MARKERS) {
    if (marker.test(html)) markers.push(marker.id);
  }

  const weakHits = [];
  for (const marker of WEAK_MARKERS) {
    if (marker.test(html)) weakHits.push(marker.id);
  }

  const strongHit = markers.length > 0;
  const challenged = strongHit || weakHits.length >= 2;

  return {
    challenged,
    markers: challenged ? [...markers, ...weakHits] : [],
    reason: challenged
      ? strongHit
        ? `matched ${markers[0]}`
        : `matched ${weakHits.length} corroborating markers`
      : null,
  };
}

/**
 * The advice printed when a challenge is hit. Kept here so the warning during
 * the crawl and the end-of-run summary cannot disagree.
 */
export const CHALLENGE_ADVICE = [
  'The saved HTML is a bot check, not the site.',
  'Bundled Chromium is refused by edge bot detection. Use a real browser:',
  '',
  '  1. Start your own Chrome with a debugging port:',
  '       google-chrome --remote-debugging-port=9222 \\',
  '         --user-data-dir="$HOME/.chrome-devport-profile"',
  '     (macOS users with the freshdogfood repo: bash scripts/real-chrome.sh)',
  '  2. Visit the site once in that window and clear any check yourself.',
  '  3. Re-run smippo attached to it:',
  '       smippo <url> --cdp http://localhost:9222',
  '',
  'Alternatives: --channel chrome (drive installed Chrome) or',
  '--user-data-dir <path> (launch with a real profile and its cookies).',
];
