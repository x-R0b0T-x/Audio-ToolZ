const { execFileSync } = require('node:child_process');
const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error('GITHUB_REPOSITORY requis.');
const releases = JSON.parse(gh(['api', 'repos/' + repo + '/releases?per_page=100']));
const assets = ['release-output/Audio-ToolZ-1.4-Windows-Portable-x64.zip', 'release-output/SHA256SUMS.txt'];
const title = 'Audio ToolZ 1.4 - Windows portable x64';
if (releases.some((release) => release.tag_name === 'v1.4')) {
  gh(['release', 'upload', 'v1.4', ...assets, '--clobber']);
  gh(['release', 'edit', 'v1.4', '--title', title, '--notes-file', 'RELEASE_NOTES_1.4.md']);
} else {
  const target = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  gh(['release', 'create', 'v1.4', ...assets, '--target', target, '--title', title, '--notes-file', 'RELEASE_NOTES_1.4.md']);
}
console.log('Release v1.4 publiee.');
