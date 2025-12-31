#!/usr/bin/env node
/**
 * Generate codebase metrics (cloc, jscpd, complexity) and emit a normalized snapshot.
 * Usage:
 *   node scripts/metrics/run.js --label before
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const fg = require("fast-glob");
const { Linter } = require("eslint");

const ROOT = path.resolve(__dirname, "../..");
const REPORT_DIR = path.join(ROOT, "reports", "metrics");
const SNAPSHOT_DIR = path.join(REPORT_DIR, "snapshots");
const STYLE_DIR = path.join(ROOT, "styles");
const SCSS_SRC = path.join(STYLE_DIR, "scss");
const CSS_OUT = path.join(STYLE_DIR, "css", "bitd-alt.css");
const VENDOR_PATTERNS = ["**/scripts/lib/**", "**/*.min.js"];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === "--label") {
      params.label = args[i + 1];
      i += 1;
    }
  }
  return {
    label: params.label || "snapshot",
  };
}

function runCloc() {
  const outFile = path.join(REPORT_DIR, "cloc.json");
  const ignoreRegex = "(node_modules|styles/css|dist|build|coverage|packs|reports|\\.git)";
  const cmd = [
    "npx",
    "cloc",
    "templates",
    "scripts",
    "styles",
    "--json",
    "--quiet",
    "--hide-rate",
    "--fullpath",
    `--not-match-d='${ignoreRegex}'`,
  ].join(" ");
  const output = runCmd(cmd);
  fs.writeFileSync(outFile, output, "utf8");
  return JSON.parse(output);
}

function runJscpd() {
  ensureDir(REPORT_DIR);
  const outFile = path.join(REPORT_DIR, "jscpd-report.json");
  const excludePatterns = [
    "**/styles/css/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/reports/**",
    "**/packs/**",
    ...VENDOR_PATTERNS,
  ];
  const cmd = [
    "npx",
    "jscpd",
    '--reporters "json,html"',
    `--output "${REPORT_DIR}"`,
    "templates",
    "styles",
    "scripts",
    '--format "javascript,handlebars,scss"',
    ...excludePatterns.map((p) => `--ignore "${p}"`),
    "--min-lines 5",
    "--min-tokens 50",
    "--silent",
  ].join(" ");
  runCmd(cmd);
  const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
  return data;
}

function runComplexity() {
  const pattern = [
    "scripts/**/*.js",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/build/**",
    "!**/coverage/**",
    "!**/styles/css/**",
    "!**/reports/**",
    "!**/packs/**",
    ...VENDOR_PATTERNS.map((p) => `!${p}`),
  ];
  const files = fg.sync(pattern, { cwd: ROOT, absolute: true });
  if (!files.length) return { status: "ok", maxCyclomatic: 0, offenders: [] };

  try {
    const linter = new Linter();
    const config = {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      rules: {
        complexity: ["warn", { max: 1 }], // force messages to capture actual complexity
      },
    };
    const lintResults = files.map((file) => {
      const code = fs.readFileSync(file, "utf8");
      const messages = linter.verify(code, config, { filename: file, configType: "flat" });
      return { filePath: file, messages };
    });
    const offenders = [];
    for (const res of lintResults) {
      const msgs = res.messages || [];
      msgs.forEach((m) => {
        if (m.ruleId === "complexity") {
          const match = m.message.match(/complexity of (\d+)/);
          const complexity = match ? Number(match[1]) : null;
          offenders.push({
            file: path.relative(ROOT, res.filePath),
            function: m.nodeType || m.message.split(" ")[1] || "unknown",
            complexity,
            line: m.line,
          });
        }
      });
    }
    offenders.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
    const top = offenders.slice(0, 10);
    const maxCyclomatic = offenders[0]?.complexity || 0;
    const scope = {
      include: ["scripts/**/*.js"],
      exclude: VENDOR_PATTERNS,
    };
    return {
      status: "ok",
      maxCyclomatic,
      offenders: top,
      scope,
    };
  } catch (err) {
    return { status: "error", error: err.message || String(err), scope: { include: ["scripts/**/*.js"], exclude: VENDOR_PATTERNS } };
  }
}

function runStyleMetrics() {
  const scssFiles = fg.sync(["**/*.scss", "!**/flexbox/**"], { cwd: SCSS_SRC, absolute: true });
  let scssLines = 0;
  scssFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    scssLines += content.split(/\r?\n/).length;
  });
  let cssBytes = 0;
  if (fs.existsSync(CSS_OUT)) {
    cssBytes = fs.readFileSync(CSS_OUT).length;
  }
  return { scssLines, cssBytes };
}

function runDryCounters() {
  const templateGlobs = ["templates/**/*.hbs", "templates/**/*.html"];
  const partialFiles = fg.sync(templateGlobs.map((g) => g.replace("**/*", "parts/**/*")), { cwd: ROOT, absolute: true }).length;
  const templateFiles = fg.sync(templateGlobs, { cwd: ROOT, absolute: true });
  let partialCallSites = 0;
  templateFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/{{\s*>/g);
    if (matches) partialCallSites += matches.length;
  });
  const scssPartialFiles = fg.sync(["styles/scss/**/_*.scss", "!**/flexbox/**"], { cwd: ROOT, absolute: true }).length;
  const scssUseImport = fg.sync(["styles/scss/**/*.scss", "!**/flexbox/**"], { cwd: ROOT, absolute: true })
    .reduce((count, file) => {
      const content = fs.readFileSync(file, "utf8");
      const matches = content.match(/@(use|import)\s+/g);
      return count + (matches ? matches.length : 0);
    }, 0);
  return {
    hbsPartials: partialFiles,
    hbsPartialCalls: partialCallSites,
    scssPartials: scssPartialFiles,
    scssUsesImports: scssUseImport,
  };
}

function buildSnapshot(label, cloc, jscpd, complexity) {
  const languages = cloc
    ? Object.keys(cloc).filter((k) => k !== "header")
    : [];
  const clocSummary = {
    languages: {},
    files: cloc?.header?.n_files || 0,
  };
  for (const lang of languages) {
    if (lang === "SUM") continue;
    const { nFiles, code, comment, blank } = cloc[lang];
    clocSummary.languages[lang] = { files: nFiles, code, comment, blank };
  }

  const duplication = jscpd?.statistics?.total;
  const jscpdScope = {
    include: ["templates", "styles", "scripts"],
    exclude: ["**/styles/css/**", "**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/reports/**", "**/packs/**", ...VENDOR_PATTERNS],
  };
  const complexitySummary = complexity || null;
  const pkg = require(path.join(ROOT, "package.json"));
  const toolVersions = {
    cloc: pkg.devDependencies?.cloc || null,
    jscpd: pkg.devDependencies?.jscpd || null,
    eslint: pkg.devDependencies?.eslint || null,
  };
  const snapshot = {
    label,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: `${process.platform}-${process.arch}`,
    toolVersions,
    cloc: clocSummary,
    jscpd: duplication
      ? {
        lines: duplication.lines,
        sources: duplication.sources,
        clones: duplication.clones,
        percentage: duplication.percentage,
        scope: jscpdScope,
      }
      : null,
    complexity: complexitySummary,
    styleMetrics: runStyleMetrics(),
    dryCounters: runDryCounters(),
    reports: {
      jscpdHtml: path.join("reports", "metrics", "html", "index.html"),
    },
  };
  return snapshot;
}

function main() {
  const { label } = parseArgs();
  ensureDir(REPORT_DIR);
  ensureDir(SNAPSHOT_DIR);

  console.log("Running cloc...");
  const cloc = runCloc();

  console.log("Running jscpd...");
  const jscpd = runJscpd();

  console.log("Running complexity...");
  const complexity = runComplexity();

  const snapshot = buildSnapshot(label, cloc, jscpd, complexity);
  const snapshotPath = path.join(REPORT_DIR, "snapshot.json");
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");

  const labeledPath = path.join(SNAPSHOT_DIR, `${label}.json`);
  fs.writeFileSync(labeledPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(`Metrics written to ${snapshotPath}`);
  console.log(`Labeled snapshot: ${labeledPath}`);
}

if (require.main === module) {
  main();
}
