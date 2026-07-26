import assert from 'node:assert';
import {describe, it, before, after} from 'mocha';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

/**
 * Regression tests for the resume-path defect.
 *
 * `continue` and `update` used to hardcode './site' as their default output
 * directory while a default `capture` writes to ~/.smippo/sites/<hostname>.
 * The result: resume could never find a normally-made capture. These tests pin
 * the shared resolver so the two defaults cannot drift apart again.
 */

let tmpHome;
let realHome;
let captureDir;

async function writeCapture(dir, rootUrl) {
  await fs.ensureDir(path.join(dir, '.smippo'));
  await fs.writeJson(path.join(dir, '.smippo', 'manifest.json'), {
    version: '0.0.1',
    rootUrl,
    options: {depth: 0, scope: 'domain'},
    stats: {},
    pages: [],
    assets: [],
  });
}

describe('capture directory resolution', () => {
  before(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'smippo-home-'));
    realHome = os.homedir();
    // home.js reads os.homedir() at call time, so stubbing it is enough.
    os.homedir = () => tmpHome;
    captureDir = path.join(tmpHome, '.smippo', 'sites', 'example.com');
    await writeCapture(captureDir, 'https://example.com/');
  });

  after(async () => {
    os.homedir = () => realHome;
    await fs.remove(tmpHome);
  });

  it('resolves the same directory capture would use, from a URL', async () => {
    const {siteDirForTarget} = await import('../src/utils/capture-dir.js');
    assert.strictEqual(
      siteDirForTarget('https://example.com/some/page?x=1'),
      captureDir,
    );
  });

  it('resolves a bare hostname to the same directory', async () => {
    const {siteDirForTarget} = await import('../src/utils/capture-dir.js');
    assert.strictEqual(siteDirForTarget('example.com'), captureDir);
    assert.strictEqual(siteDirForTarget('example.com/blog'), captureDir);
  });

  it('does NOT default to ./site when no output is given', async () => {
    const {resolveCaptureDir} = await import('../src/utils/capture-dir.js');
    const {dir} = await resolveCaptureDir({});
    assert.notStrictEqual(dir, './site');
    assert.notStrictEqual(dir, path.resolve('./site'));
  });

  it('finds the most recent capture when given nothing', async () => {
    const {resolveCaptureDir} = await import('../src/utils/capture-dir.js');
    const {dir, source} = await resolveCaptureDir({});
    assert.strictEqual(dir, captureDir);
    assert.strictEqual(source, 'recent');
  });

  it('prefers an explicit --output over everything else', async () => {
    const {resolveCaptureDir} = await import('../src/utils/capture-dir.js');
    const {dir, source} = await resolveCaptureDir({
      output: '/some/where',
      target: 'https://example.com/',
    });
    assert.strictEqual(dir, path.resolve('/some/where'));
    assert.strictEqual(source, 'option');
  });

  it('prefers a target argument over most-recent', async () => {
    const {resolveCaptureDir} = await import('../src/utils/capture-dir.js');
    const {dir, source} = await resolveCaptureDir({target: 'other.test'});
    assert.strictEqual(
      dir,
      path.join(tmpHome, '.smippo', 'sites', 'other.test'),
    );
    assert.strictEqual(source, 'target');
  });

  it('picks the newest of several captures', async () => {
    const {resolveCaptureDir} = await import('../src/utils/capture-dir.js');
    const newer = path.join(tmpHome, '.smippo', 'sites', 'newer.test');
    await writeCapture(newer, 'https://newer.test/');
    const future = new Date(Date.now() + 60_000);
    await fs.utimes(
      path.join(newer, '.smippo', 'manifest.json'),
      future,
      future,
    );

    const {dir} = await resolveCaptureDir({});
    assert.strictEqual(dir, newer);
    await fs.remove(newer);
  });

  it('ignores directories that are not captures', async () => {
    const {listCaptureDirs} = await import('../src/utils/capture-dir.js');
    const junk = path.join(tmpHome, '.smippo', 'sites', 'not-a-capture');
    await fs.ensureDir(junk);

    const dirs = await listCaptureDirs();
    assert.ok(!dirs.some(d => d.path === junk));
    await fs.remove(junk);
  });

  it('error names the directory it actually looked in', async () => {
    const {locateCapture} = await import('../src/cli.js');
    await assert.rejects(
      () => locateCapture({output: '/definitely/not/here'}, 'continue'),
      err => {
        assert.match(err.message, /definitely[/\\]not[/\\]here/);
        return true;
      },
    );
  });

  it('locateCapture finds a real capture with no arguments', async () => {
    const {locateCapture} = await import('../src/cli.js');
    const dir = await locateCapture({quiet: true}, 'continue');
    assert.strictEqual(dir, captureDir);
  });
});
