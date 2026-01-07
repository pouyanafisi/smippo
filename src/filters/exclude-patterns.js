/**
 * Patterns for resources that should be excluded from capture
 * These are typically analytics, tracking, source maps, and other
 * resources that are not needed for offline viewing
 */

/**
 * URL patterns to exclude from asset collection
 * These patterns are matched against the full URL
 */
export const EXCLUDE_URL_PATTERNS = [
  // Source maps (development files, not needed for viewing)
  /\.map$/i,
  /\.js\.map$/i,
  /\.css\.map$/i,

  // Well-known paths (service discovery, not needed offline)
  /\/\.well-known\//i,

  // Cloudflare
  /\/cdn-cgi\/rum/i, // Real User Monitoring
  /\/cdn-cgi\/beacon/i,
  /\/cdn-cgi\/trace/i,
  /\/cdn-cgi\/challenge-platform/i,
  /cloudflareinsights\.com/i,

  // Google Analytics / Tag Manager
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /googletagservices\.com/i,
  /googlesyndication\.com/i,
  /googleadservices\.com/i,
  /doubleclick\.net/i,
  /\/gtag\/js/i,
  /\/ga\.js/i,
  /\/analytics\.js/i,
  /\/gtm\.js/i,

  // Facebook
  /connect\.facebook\.net/i,
  /facebook\.com\/tr/i,
  /fbevents\.js/i,
  /pixel\.facebook\.com/i,

  // Twitter/X
  /platform\.twitter\.com\/widgets/i,
  /analytics\.twitter\.com/i,
  /t\.co\/i\/adsct/i,

  // LinkedIn
  /snap\.licdn\.com/i,
  /linkedin\.com\/px/i,

  // Microsoft/Bing
  /clarity\.ms/i,
  /bat\.bing\.com/i,

  // Hotjar
  /hotjar\.com/i,
  /static\.hotjar\.com/i,

  // Mixpanel
  /mixpanel\.com/i,
  /cdn\.mxpnl\.com/i,

  // Segment
  /cdn\.segment\.com/i,
  /api\.segment\.io/i,

  // Amplitude
  /amplitude\.com/i,
  /cdn\.amplitude\.com/i,

  // Heap
  /heap-analytics\.com/i,
  /heapanalytics\.com/i,

  // Intercom
  /widget\.intercom\.io/i,
  /api-iam\.intercom\.io/i,
  /intercom\.io\/widget/i,

  // Drift
  /js\.driftt\.com/i,
  /drift\.com/i,

  // HubSpot
  /js\.hs-scripts\.com/i,
  /js\.hsforms\.net/i,
  /js\.hs-analytics\.net/i,
  /forms\.hubspot\.com/i,
  /track\.hubspot\.com/i,

  // Zendesk
  /static\.zdassets\.com/i,
  /ekr\.zdassets\.com/i,

  // Crisp
  /client\.crisp\.chat/i,

  // Tawk.to
  /embed\.tawk\.to/i,

  // LiveChat
  /cdn\.livechatinc\.com/i,

  // Sentry (error tracking)
  /browser\.sentry-cdn\.com/i,
  /sentry\.io\/api/i,
  /ingest\.sentry\.io/i,

  // LogRocket
  /cdn\.logrocket\.io/i,
  /r\.logrocket\.io/i,

  // FullStory
  /fullstory\.com/i,
  /rs\.fullstory\.com/i,

  // Crazy Egg
  /script\.crazyegg\.com/i,

  // Optimizely
  /cdn\.optimizely\.com/i,
  /logx\.optimizely\.com/i,

  // VWO
  /dev\.visualwebsiteoptimizer\.com/i,

  // New Relic
  /js-agent\.newrelic\.com/i,
  /bam\.nr-data\.net/i,

  // Datadog
  /datadoghq\.com/i,
  /browser-intake/i,

  // Beacon APIs (generic)
  /\/beacon\//i,
  /\/collect\?/i,
  /\/pixel\?/i,
  /\/track\?/i,
  /\/event\?/i,
  /\/log\?/i,

  // Common API patterns that won't work offline
  /\/api\/v\d+\//i, // versioned APIs
  /graphql/i,
  /\/webhook/i,
  /\/socket\.io/i,
  /\/ws\//i, // WebSocket

  // Social widgets (load external content)
  /platform\.instagram\.com/i,
  /apis\.google\.com\/js\/plusone/i,
  /widgets\.pinterest\.com/i,

  // Ad networks
  /ad\.doubleclick\.net/i,
  /pagead2\.googlesyndication\.com/i,
  /adservice\.google\.com/i,
  /amazon-adsystem\.com/i,
  /advertising\.com/i,

  // Cookie consent / GDPR
  /cookiebot\.com/i,
  /cdn\.cookielaw\.org/i,
  /consent\.cookiebot\.com/i,
  /onetrust\.com/i,
  /quantcast\.com/i,

  // Push notifications
  /onesignal\.com/i,
  /pushwoosh\.com/i,
  /pusher\.com/i,

  // A/B testing
  /cdn\.split\.io/i,
  /launchdarkly\.com/i,

  // Performance monitoring
  /speedcurve\.com/i,
  /rum\.speedcurve\.com/i,

  // Generic patterns
  /\/analytics/i,
  /\/telemetry/i,
  /\/metrics/i,
  /\/stats\//i,
];

/**
 * Script src patterns to remove from HTML
 * These scripts should be removed entirely from the captured HTML
 */
export const STRIP_SCRIPT_PATTERNS = [
  // Google
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /gtag\/js/i,
  /ga\.js/i,
  /analytics\.js/i,

  // Facebook
  /connect\.facebook\.net/i,
  /fbevents\.js/i,

  // Cloudflare
  /cloudflareinsights\.com/i,
  /cdn-cgi\/scripts/i,

  // Generic analytics
  /hotjar\.com/i,
  /mixpanel\.com/i,
  /segment\.com/i,
  /amplitude\.com/i,
  /heap-analytics/i,
  /intercom\.io/i,
  /drift/i,
  /hs-scripts\.com/i,
  /tawk\.to/i,
  /livechatinc\.com/i,
  /sentry/i,
  /logrocket/i,
  /fullstory/i,
  /crazyegg/i,
  /optimizely/i,
  /newrelic/i,
  /datadoghq/i,
];

/**
 * Inline script content patterns to remove
 * These patterns match content inside <script> tags that should be removed
 */
export const STRIP_INLINE_SCRIPT_PATTERNS = [
  // Google Analytics initialization
  /gtag\s*\(\s*['"]config['"]/i,
  /ga\s*\(\s*['"]create['"]/i,
  /ga\s*\(\s*['"]send['"]/i,
  /_gaq\.push/i,
  /GoogleAnalyticsObject/i,

  // Facebook Pixel
  /fbq\s*\(\s*['"]init['"]/i,
  /fbq\s*\(\s*['"]track['"]/i,

  // Generic tracking
  /window\._analytics/i,
  /window\.analytics\.track/i,
  /window\.dataLayer/i,
  /dataLayer\.push/i,

  // Hotjar
  /hjid/i,
  /hotjar/i,

  // Intercom
  /window\.intercomSettings/i,
  /Intercom\s*\(/i,

  // Drift
  /drift\.load/i,

  // HubSpot
  /_hsq\.push/i,
];

/**
 * Image/pixel patterns to remove (tracking pixels)
 */
export const STRIP_PIXEL_PATTERNS = [
  /facebook\.com\/tr/i,
  /pixel\.facebook\.com/i,
  /google-analytics\.com\/__utm/i,
  /bat\.bing\.com/i,
  /analytics\.twitter\.com/i,
  /linkedin\.com\/px/i,
  /t\.co\/i\/adsct/i,
];

/**
 * Check if a URL should be excluded from capture
 */
export function shouldExcludeUrl(url) {
  if (!url) return false;

  return EXCLUDE_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if a script src should be stripped from HTML
 */
export function shouldStripScript(src) {
  if (!src) return false;

  return STRIP_SCRIPT_PATTERNS.some(pattern => pattern.test(src));
}

/**
 * Check if inline script content should be removed
 */
export function shouldStripInlineScript(content) {
  if (!content) return false;

  return STRIP_INLINE_SCRIPT_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if an image is a tracking pixel
 */
export function isTrackingPixel(src) {
  if (!src) return false;

  return STRIP_PIXEL_PATTERNS.some(pattern => pattern.test(src));
}

/**
 * Get a human-readable reason for why a URL was excluded
 */
export function getExcludeReason(url) {
  if (!url) return null;

  if (/\.map$/i.test(url)) return 'source-map';
  if (/\/\.well-known\//i.test(url)) return 'well-known';
  if (/cdn-cgi/i.test(url)) return 'cloudflare-service';
  if (/google.*analytics|gtag|ga\.js/i.test(url)) return 'google-analytics';
  if (/facebook|fbevents/i.test(url)) return 'facebook-tracking';
  if (/twitter|t\.co/i.test(url)) return 'twitter-tracking';
  if (/hotjar|mixpanel|segment|amplitude|heap/i.test(url)) return 'analytics';
  if (/intercom|drift|hubspot|zendesk|crisp|tawk|livechat/i.test(url)) {
    return 'chat-widget';
  }
  if (/sentry|logrocket|fullstory|newrelic|datadog/i.test(url)) {
    return 'error-monitoring';
  }
  if (/beacon|collect\?|pixel\?|track\?/i.test(url)) return 'tracking-beacon';
  if (/\/api\/|graphql|webhook/i.test(url)) return 'api-endpoint';
  if (/ad\.|adsystem|advertising/i.test(url)) return 'advertising';
  if (/cookiebot|cookielaw|onetrust|quantcast/i.test(url))
    return 'cookie-consent';

  return 'excluded-pattern';
}
