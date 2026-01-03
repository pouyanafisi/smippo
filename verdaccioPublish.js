const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const run = cmd => execSync(cmd, {encoding: 'utf8', cwd: __dirname});
const bin = cmd => path.join(__dirname, 'node_modules/.bin', cmd);

const sha = run('git rev-parse --short HEAD').trim();
const version = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
).version;

try {
  run(`npm version ${version}-${sha} --no-git-tag-version`);

  run(`git add .`);
  run(`git commit -m 'Temp' --no-verify`);

  run(`npm publish --registry http://localhost:4873`);
} finally {
  execSync(`git reset --hard ${sha}`);
}
