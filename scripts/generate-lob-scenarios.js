// Expands scenario-templates/*.template.feature into real, LOB-scoped .feature files under
// features/ui/generated/ (gitignored - derived output, not hand-authored, same treatment as
// .features-gen/). Nested under features/ui/ specifically so bddgen's compiled output lands
// under .features-gen/ui/generated/ - matching the "ui" Playwright project's testMatch regex
// (/ui[\\/].../) in playwright.config.ts, same as every other UI scenario. Adding a LOB, or
// changing which LOBs a feature applies to, is a JSON edit under testdata/ - never a .feature
// or step-definition change. See:
//   testdata/<environment>/lobCredentials.json  - the full list of LOBs that exist (the one
//                                                  file that's per-environment - credentials
//                                                  differ dev vs. qa)
//   testdata/lobPlans.json                       - which Plan(s) each LOB belongs to (shared -
//                                                  same business fact regardless of environment)
//   testdata/lobGroups.json                      - named LOB subsets, explicit or plan-derived
//                                                  (shared, same reasoning)
//   scripts/lobScenarioManifest.json             - which template uses which group
//
// Plain Node, no shell-specific syntax - works the same on Windows/macOS/Linux, same style
// as scripts/open-latest-report.js.
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const environment = (process.env.TEST_ENVIRONMENT || 'dev').trim();

function readJson(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Expected file not found: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

const lobCredentials = readJson(`testdata/${environment}/lobCredentials.json`);
const lobPlans = readJson('testdata/lobPlans.json');
const lobGroups = readJson('testdata/lobGroups.json');
const manifest = readJson('scripts/lobScenarioManifest.json');

const allLobs = Object.keys(lobCredentials);

// ---- Resolve a named group to a concrete, validated list of LOB codes ----
function resolveGroup(groupName) {
  if (groupName === 'all') {
    return allLobs;
  }

  const group = lobGroups[groupName];
  if (group === undefined) {
    throw new Error(`Unknown LOB group "${groupName}" - not found in testdata/lobGroups.json`);
  }

  let resolved;
  if (Array.isArray(group)) {
    resolved = group;
  } else if (group && typeof group === 'object' && typeof group.plan === 'string') {
    resolved = Object.entries(lobPlans)
      .filter(([, plans]) => plans.includes(group.plan))
      .map(([lob]) => lob);
    if (resolved.length === 0) {
      throw new Error(
        `Plan-derived group "${groupName}" references plan "${group.plan}" - no LOB in testdata/lobPlans.json lists that plan`,
      );
    }
  } else {
    throw new Error(
      `LOB group "${groupName}" in testdata/lobGroups.json must be an array or an object like { "plan": "..." }`,
    );
  }

  const seen = new Set();
  for (const lob of resolved) {
    if (seen.has(lob)) {
      throw new Error(`LOB group "${groupName}" lists "${lob}" more than once`);
    }
    seen.add(lob);
    if (!allLobs.includes(lob)) {
      throw new Error(
        `LOB group "${groupName}" references "${lob}" - not found in testdata/${environment}/lobCredentials.json`,
      );
    }
  }

  return resolved;
}

// Gherkin only merges tags per-Examples-block, not per-row within one shared block (verified
// against the actual playwright-bdd source), so each LOB gets its own tagged Examples block
// rather than one shared table with many rows - that's what makes `--grep @LOB-LAEX` able to
// isolate exactly one LOB out of many.
function renderExamplesBlocks(lobs) {
  return lobs
    .map((lob) => `    @LOB-${lob}\n    Examples:\n      | lob |\n      | ${lob} |`)
    .join('\n\n');
}

const templatesDir = path.join(projectRoot, 'scenario-templates');
const generatedDir = path.join(projectRoot, 'features', 'ui', 'generated');
fs.rmSync(generatedDir, { recursive: true, force: true });
fs.mkdirSync(generatedDir, { recursive: true });

const placeholder = /[ \t]*Examples:\s*\n\s*\|\s*lob\s*\|\s*\n?/;
let totalScenarios = 0;

for (const [templateFile, groupName] of Object.entries(manifest)) {
  const templatePath = path.join(templatesDir, templateFile);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Manifest references "${templateFile}" - not found in scenario-templates/`);
  }

  const lobs = resolveGroup(groupName);
  const template = fs.readFileSync(templatePath, 'utf8');

  if (!placeholder.test(template)) {
    throw new Error(`Template "${templateFile}" doesn't have the expected placeholder Examples block`);
  }
  const rendered = template.replace(placeholder, renderExamplesBlocks(lobs) + '\n');

  const outputName = templateFile.replace(/\.template\.feature$/, '.feature');
  fs.writeFileSync(path.join(generatedDir, outputName), rendered);

  console.log(`Generated ${outputName}: ${lobs.length} LOB(s) from group "${groupName}" (${lobs.join(', ')})`);
  totalScenarios += lobs.length;
}

console.log(
  `\nDone - ${totalScenarios} LOB-scoped scenario(s) generated across ${Object.keys(manifest).length} template(s) for TEST_ENVIRONMENT=${environment}.`,
);
