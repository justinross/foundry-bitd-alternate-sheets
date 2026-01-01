#!/usr/bin/env node
/**
 * Compare two metrics snapshots and print deltas.
 * Usage: node scripts/metrics/diff.js --baseline reports/metrics/snapshots/before.json --current reports/metrics/snapshots/after.json
 */
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--baseline") {
      params.baseline = args[i + 1];
      i += 1;
    } else if (args[i] === "--current") {
      params.current = args[i + 1];
      i += 1;
    }
  }
  if (!params.baseline || !params.current) {
    throw new Error("Usage: node scripts/metrics/diff.js --baseline <file> --current <file>");
  }
  return params;
}

function readSnapshot(p) {
  const full = path.resolve(process.cwd(), p);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function delta(a, b) {
  if (typeof a === "number" && typeof b === "number") return b - a;
  return null;
}

function summarizeLoc(base, cur) {
  const summary = [];
  const baseLoc = base.cloc?.languages || {};
  const curLoc = cur.cloc?.languages || {};
  const langs = new Set([...Object.keys(baseLoc), ...Object.keys(curLoc)]);
  summary.push("\nLOC (code lines by language):");
  langs.forEach((lang) => {
    const a = baseLoc[lang]?.code || 0;
    const b = curLoc[lang]?.code || 0;
    const d = delta(a, b);
    summary.push(
      `  ${lang.padEnd(12)} ${a.toString().padStart(6)} -> ${b
        .toString()
        .padStart(6)} (Δ ${d >= 0 ? "+" : ""}${d})`
    );
  });
  return summary;
}

function summarizeDuplication(base, cur) {
  const aDup = base.jscpd?.percentage || 0;
  const bDup = cur.jscpd?.percentage || 0;
  const dDup = delta(aDup, bDup);
  return [
    `\nDuplication (% lines): ${aDup.toFixed(2)} -> ${bDup.toFixed(
      2
    )} (Δ ${dDup >= 0 ? "+" : ""}${dDup.toFixed(2)})`,
  ];
}

function summarizeComplexity(base, cur) {
  const baseCx = base.complexity || {};
  const curCx = cur.complexity || {};
  if (baseCx.status === "ok" && curCx.status === "ok") {
    const aCx = baseCx.maxCyclomatic || 0;
    const bCx = curCx.maxCyclomatic || 0;
    const dCx = delta(aCx, bCx);
    return [`Max cyclomatic: ${aCx} -> ${bCx} (Δ ${dCx >= 0 ? "+" : ""}${dCx})`];
  }

  const lines = [`Complexity status: ${baseCx.status || "n/a"} -> ${curCx.status || "n/a"}`];
  if (curCx.error) lines.push(`Current complexity error: ${curCx.error}`);
  return lines;
}

function summarizeStyles(base, cur) {
  const aScss = base.styleMetrics?.scssLines || 0;
  const bScss = cur.styleMetrics?.scssLines || 0;
  const dScss = delta(aScss, bScss);
  const aCss = base.styleMetrics?.cssBytes || 0;
  const bCss = cur.styleMetrics?.cssBytes || 0;
  const dCss = delta(aCss, bCss);
  return [
    `SCSS lines: ${aScss} -> ${bScss} (Δ ${dScss >= 0 ? "+" : ""}${dScss})`,
    `CSS bytes:  ${aCss} -> ${bCss} (Δ ${dCss >= 0 ? "+" : ""}${dCss})`,
  ];
}

function summarizeDryCounters(base, cur) {
  const aHbsCalls = base.dryCounters?.hbsPartialCalls || 0;
  const bHbsCalls = cur.dryCounters?.hbsPartialCalls || 0;
  const dHbsCalls = delta(aHbsCalls, bHbsCalls);
  return [
    `Partial call sites: ${aHbsCalls} -> ${bHbsCalls} (Δ ${dHbsCalls >= 0 ? "+" : ""}${dHbsCalls})`,
  ];
}

function buildSummary({ baseline, current, base, cur }) {
  const summary = [];
  summary.push(`Baseline: ${baseline}`);
  summary.push(`Current:  ${current}`);
  summary.push(...summarizeLoc(base, cur));
  summary.push(...summarizeDuplication(base, cur));
  summary.push(...summarizeComplexity(base, cur));
  summary.push(...summarizeStyles(base, cur));
  summary.push(...summarizeDryCounters(base, cur));
  return summary;
}

function main() {
  const { baseline, current } = parseArgs();
  const base = readSnapshot(baseline);
  const cur = readSnapshot(current);

  const summary = buildSummary({ baseline, current, base, cur });
  console.log(summary.join("\n"));
}

if (require.main === module) {
  main();
}
