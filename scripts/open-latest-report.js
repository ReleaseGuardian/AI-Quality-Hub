// Each test run writes its HTML report to its own timestamped folder under
// playwright-report/ (see playwright.config.ts) instead of overwriting the previous run's
// report. `npm run report` calls this script to find and open the most recent one.
// Plain Node, no shell-specific syntax, so it works the same on Windows/macOS/Linux.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const reportsDir = path.join(__dirname, '..', 'playwright-report');

if (!fs.existsSync(reportsDir)) {
  console.error('No playwright-report/ directory found - run tests first (e.g. npm test).');
  process.exit(1);
}

const runFolders = fs
  .readdirSync(reportsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const fullPath = path.join(reportsDir, entry.name);
    return { name: entry.name, mtimeMs: fs.statSync(fullPath).mtimeMs };
  })
  .sort((a, b) => b.mtimeMs - a.mtimeMs);

if (runFolders.length === 0) {
  console.error('No report runs found under playwright-report/ - run tests first (e.g. npm test).');
  process.exit(1);
}

const latest = path.join(reportsDir, runFolders[0].name);
console.log(`Opening latest report: ${latest}`);

const result = spawnSync('npx', ['playwright', 'show-report', latest], {
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 0);
