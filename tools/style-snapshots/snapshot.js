#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-chromium");

const projectRoot = path.resolve(__dirname, "..", "..");
const fixturePath = path.resolve(projectRoot, "tools/style-snapshots/fixture.html");
const baselinePath = path.resolve(projectRoot, "tools/style-snapshots/baseline.json");

const fixtures = {
  character: {
    root: "#char-fixture",
    selectors: {
      wrapper: ".sheet-wrapper",
      toggleAllow: ".sheet-toggles .toggle-allow-edit",
      toggleAlias: ".sheet-toggles .toggle-alias-display",
      minimized: ".minimized-view",
      portrait: ".minimized-view .character-portrait .portrait",
      portraitImg: ".minimized-view .character-portrait .portrait > img",
      statusBox: ".minimized-view .character-portrait .status-buttons",
      coinsBox: ".minimized-view .character-portrait .status-buttons .coins-box",
      stashGrid: ".minimized-view .character-portrait .status-buttons .coins-box .full-view .stash-grid",
      stashTag: ".minimized-view .character-portrait .status-buttons .coins-box .full-view .stash-grid .stash-tag",
      nameAlias: ".minimized-view .character-info .name-alias",
      bio: ".minimized-view .character-info .bio",
      tabItem: "nav.tabs .tab-item",
      abilityBlock: ".ability-list .ability-block",
      abilityCheckboxes: ".ability-list .ability-block .ability-checkboxes",
      abilityName: ".ability-list .ability-block .ability-name",
      abilityDesc: ".ability-list .ability-block .ability-description",
      teethStripe: ".stripe.tooth .teeth",
      attrAction: ".attributes-actions .action",
      attrLabel: ".attributes-actions .action .attribute-skill-label",
      harmList: ".harm-list",
      harmLight: ".harm-list .harm-block.light",
      harmMedium: ".harm-list .harm-block.medium",
      harmHeavy: ".harm-list .harm-block.heavy",
      overMax: ".over-max",
    },
  },
  crew: {
    root: "#crew-fixture",
    selectors: {
      wrapper: ".sheet-wrapper",
      toggleAllow: ".crew-identity-block .sheet-toggles .toggle-allow-edit",
      minimized: ".minimized-view",
      portrait: ".minimized-view .character-portrait .portrait",
      statusBox: ".minimized-view .character-portrait .status-buttons",
      coinsBox: ".minimized-view .character-portrait .status-buttons .coins-box",
      heatTeeth: ".heat-wanted-row .big-teeth",
      turfGrid: ".turf-grid",
      turfCheckbox: ".turf-grid .turf-select",
      abilityBlock: ".ability-list .ability-block",
    },
  },
};

const pickProps = [
  "display",
  "position",
  "width",
  "height",
  "padding",
  "margin",
  "border",
  "backgroundColor",
  "color",
  "borderRadius",
  "boxShadow",
  "top",
  "left",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "alignItems",
  "justifyContent",
  "flexDirection",
  "gap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "textTransform",
];

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return { record: args.has("--record") || args.has("-r") };
}

async function takeSnapshot(page) {
  const url = `file://${fixturePath}`;
  await page.goto(url);
  await page.waitForLoadState("networkidle");

  const payload = { fixtures, pickProps };
  return await page.evaluate(({ fixtures, pickProps }) => {
    const out = {};
    for (const [fixtureKey, { root, selectors }] of Object.entries(fixtures)) {
      const rootEl = document.querySelector(root);
      const fixtureResult = {};
      for (const [key, sel] of Object.entries(selectors)) {
        const el = rootEl ? rootEl.querySelector(sel) : null;
        if (!el) {
          fixtureResult[key] = null;
          continue;
        }
        const cs = getComputedStyle(el);
        const entry = {};
        pickProps.forEach((p) => (entry[p] = cs[p]));
        fixtureResult[key] = entry;
      }
      out[fixtureKey] = fixtureResult;
    }
    return out;
  }, payload);
}

function diffSnapshot(current, baseline) {
  const diff = {};
  const fixtureKeys = new Set([...Object.keys(current), ...(baseline ? Object.keys(baseline) : [])]);
  for (const fixtureKey of fixtureKeys) {
    const currFixture = current[fixtureKey] || {};
    const baseFixture = baseline ? baseline[fixtureKey] || {} : {};
    const keys = new Set([...Object.keys(currFixture), ...Object.keys(baseFixture)]);
    for (const key of keys) {
      const currVal = currFixture[key];
      const baseVal = baseFixture[key];
      if (JSON.stringify(currVal) !== JSON.stringify(baseVal)) {
        if (!diff[fixtureKey]) diff[fixtureKey] = {};
        diff[fixtureKey][key] = { baseline: baseVal, current: currVal };
      }
    }
  }
  return diff;
}

async function main() {
  const { record } = parseArgs();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  const snapshot = await takeSnapshot(page);
  await browser.close();

  if (record) {
    fs.writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2));
    console.log(`Recorded baseline to ${path.relative(projectRoot, baselinePath)}`);
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    console.error("Baseline missing. Run with --record first.");
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const diff = diffSnapshot(snapshot, baseline);
  if (Object.keys(diff).length === 0) {
    console.log("Computed styles match baseline.");
    return;
  }
  console.error("Computed style differences detected:");
  console.error(JSON.stringify(diff, null, 2));
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
