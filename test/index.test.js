import assert from 'node:assert';
import { describe, it } from 'mocha';
import { normalizeUrl, isLikelyPage, isAsset } from '../src/utils/url.js';

describe('URL Utils', () => {
	describe('normalizeUrl', () => {
		it('should normalize URLs with trailing slashes', () => {
			const result = normalizeUrl('https://example.com/');
			assert.strictEqual(result, 'https://example.com/');
		});

		it('should handle URLs without trailing slashes', () => {
			const result = normalizeUrl('https://example.com');
			assert.ok(result.startsWith('https://example.com'));
		});

		it('should preserve query parameters', () => {
			const result = normalizeUrl('https://example.com/page?foo=bar');
			assert.ok(result.includes('foo=bar'));
		});
	});

	describe('isLikelyPage', () => {
		it('should identify HTML pages', () => {
			assert.strictEqual(isLikelyPage('https://example.com/page.html'), true);
			assert.strictEqual(isLikelyPage('https://example.com/page.htm'), true);
		});

		it('should identify URLs without extension as pages', () => {
			assert.strictEqual(isLikelyPage('https://example.com/about'), true);
			assert.strictEqual(isLikelyPage('https://example.com/'), true);
		});

		it('should not identify assets as pages', () => {
			assert.strictEqual(isLikelyPage('https://example.com/style.css'), false);
			assert.strictEqual(isLikelyPage('https://example.com/script.js'), false);
			assert.strictEqual(isLikelyPage('https://example.com/image.png'), false);
		});
	});

	describe('isAsset', () => {
		it('should identify CSS files as assets', () => {
			assert.strictEqual(isAsset('https://example.com/style.css'), true);
		});

		it('should identify JavaScript files as assets', () => {
			assert.strictEqual(isAsset('https://example.com/app.js'), true);
		});

		it('should identify image files as assets', () => {
			assert.strictEqual(isAsset('https://example.com/logo.png'), true);
			assert.strictEqual(isAsset('https://example.com/photo.jpg'), true);
			assert.strictEqual(isAsset('https://example.com/icon.svg'), true);
		});

		it('should not identify HTML as assets', () => {
			assert.strictEqual(isAsset('https://example.com/page.html'), false);
		});
	});
});

