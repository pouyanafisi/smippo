import assert from 'node:assert';
import {describe, it} from 'mocha';
import {detectChallenge} from '../src/challenge.js';
import {createManifest, addPageToManifest} from '../src/manifest.js';
import {
  CLOUDFLARE_MANAGED_CHALLENGE,
  CLOUDFLARE_IUAM_CHALLENGE,
  CLOUDFLARE_BLOCK_403,
  NORMAL_PAGE,
  LEGIT_PAGE_EMBEDDING_TURNSTILE,
  PAGE_DISCUSSING_CHALLENGES,
} from './fixtures/challenge-pages.js';

/**
 * Regression tests for the "silently saved a Cloudflare challenge page and
 * reported success" defect. All fixtures are static - nothing here touches the
 * network.
 */
describe('challenge detection', () => {
  it('flags the managed challenge page smippo actually saved', () => {
    const result = detectChallenge({
      html: CLOUDFLARE_MANAGED_CHALLENGE,
      status: 200,
      contentType: 'text/html; charset=UTF-8',
    });
    assert.strictEqual(result.challenged, true);
    assert.ok(result.markers.includes('/cdn-cgi/challenge-platform/'));
    assert.ok(result.markers.includes('title:Just a moment'));
  });

  it('flags the IUAM interstitial via cf_chl_opt', () => {
    const result = detectChallenge({html: CLOUDFLARE_IUAM_CHALLENGE});
    assert.strictEqual(result.challenged, true);
    assert.ok(result.markers.includes('cf_chl_opt'));
  });

  it('flags an HTTP 403 with an HTML body', () => {
    const result = detectChallenge({
      html: CLOUDFLARE_BLOCK_403,
      status: 403,
      contentType: 'text/html',
    });
    assert.strictEqual(result.challenged, true);
    assert.ok(result.markers.includes('http:403+html'));
  });

  it('flags a 403 HTML body even without a content-type header', () => {
    const result = detectChallenge({
      html: '<html><body>blocked</body></html>',
      status: 403,
    });
    assert.strictEqual(result.challenged, true);
  });

  it('does not flag a 403 on a non-HTML route', () => {
    const result = detectChallenge({
      html: '{"error":"forbidden"}',
      status: 403,
      contentType: 'application/json',
    });
    assert.strictEqual(result.challenged, false);
  });

  it('leaves a normal page alone', () => {
    const result = detectChallenge({
      html: NORMAL_PAGE,
      status: 200,
      contentType: 'text/html',
    });
    assert.strictEqual(result.challenged, false);
    assert.deepStrictEqual(result.markers, []);
  });

  it('does NOT flag a real page that embeds a Turnstile widget', () => {
    // The www.tttc.ca capture is genuine content; condemning it would be worse
    // than the bug being fixed.
    const result = detectChallenge({
      html: LEGIT_PAGE_EMBEDDING_TURNSTILE,
      status: 200,
      contentType: 'text/html',
    });
    assert.strictEqual(result.challenged, false);
  });

  it('does NOT flag a page that merely writes about challenges', () => {
    const result = detectChallenge({
      html: PAGE_DISCUSSING_CHALLENGES,
      status: 200,
      contentType: 'text/html',
    });
    assert.strictEqual(result.challenged, false);
  });

  it('handles an empty or missing body without throwing', () => {
    assert.strictEqual(detectChallenge({}).challenged, false);
    assert.strictEqual(detectChallenge().challenged, false);
  });
});

describe('challenge reporting in the manifest', () => {
  it('records a challenge page without counting it as captured', () => {
    const manifest = createManifest('https://example.com/', {});
    const challenge = detectChallenge({html: CLOUDFLARE_MANAGED_CHALLENGE});

    addPageToManifest(manifest, {
      url: 'https://example.com/',
      localPath: 'example.com/index.html',
      size: 1234,
      title: 'Just a moment...',
      challenge,
    });

    assert.strictEqual(manifest.stats.pagesCapt, 0);
    assert.strictEqual(manifest.stats.challenged, 1);
    assert.strictEqual(manifest.pages[0].challenge.detected, true);
    assert.ok(manifest.pages[0].challenge.markers.length > 0);
  });

  it('still counts a clean page as captured', () => {
    const manifest = createManifest('https://example.com/', {});
    addPageToManifest(manifest, {
      url: 'https://example.com/',
      localPath: 'example.com/index.html',
      size: 1234,
      title: 'Welcome',
      challenge: detectChallenge({html: NORMAL_PAGE}),
    });

    assert.strictEqual(manifest.stats.pagesCapt, 1);
    assert.strictEqual(manifest.stats.challenged, 0);
    assert.strictEqual(manifest.pages[0].challenge, undefined);
  });

  it('initialises the challenged counter', () => {
    const manifest = createManifest('https://example.com/', {});
    assert.strictEqual(manifest.stats.challenged, 0);
  });
});
