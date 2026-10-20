import { escapeHTML as esc, openFormDialog } from "./lib/dialog-compat.js";
import { queueUpdate } from "./lib/update-queue.js";

export const COHORT_NEW = "virtual-upgrade-cohort-new";
export const COHORT_ADD_TYPE = "virtual-upgrade-cohort-add-type";
export const GANG_TYPES = ["Adepts", "Rooks", "Rovers", "Skulks", "Thugs"];
const ICONS = { Gang: "combat", Expert: "mystery-man", Adepts: "book", Rooks: "coins", Rovers: "anchor", Skulks: "eye", Thugs: "sword" };
const icon = (key) => `icons/svg/${ICONS[key] ?? "mystery-man"}.svg`;

// The system's template default is ["Gang"]; its item sheet saves a string.
const kindOf = (cohort) => [cohort?.system?.cohort].flat()[0];

/** Core p96: gangs have quality and scale equal to Tier; experts quality Tier + 1, scale 0. */
export function cohortStats(kind, tier) {
  const t = parseInt(tier) || 0;
  return kind === "Expert" ? { quality: t + 1, scale: 0 } : { quality: t, scale: t };
}

/** A cohort's types: gang types, or an expert's comma-separated types. */
export function cohortTypes(cohort) {
  if (kindOf(cohort) === "Expert") {
    return String(cohort.system.expert_type ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [cohort?.system?.gang_type ?? []].flat().filter(Boolean);
}

/** Two types per cohort; Bravos Blood Brothers lets a gang reach three (core p106). */
export const maxCohortTypes = (cohort, bloodBrothers) => (kindOf(cohort) === "Gang" && bloodBrothers ? 3 : 2);

export const addableGangTypes = (cohort) => GANG_TYPES.filter((t) => !cohortTypes(cohort).includes(t));

export const hasBloodBrothers = (actor) =>
  actor.items.some((i) => i.type === "crew_ability" && /blood brothers/i.test(i.name ?? ""));

const L = (key, data) => (data ? game.i18n.format(`bitd-alt.${key}`, data) : game.i18n.localize(`bitd-alt.${key}`));
const gangLabel = (t) => game.i18n.localize(`BITD.GangType${t}`);

function card(name, value, label, img, { sub = [], reason = "", checked = false } = {}) {
  return `<label class="cohort-card${reason ? " choice-disabled" : ""}"${reason ? ` title="${esc(reason)}"` : ""}>
  <input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}${reason ? " disabled" : ""}>
  <div class="card-content"><img src="${esc(img)}" alt=""><div class="card-label">${esc(label)}</div>${
    sub.length ? `<div class="card-sub">${sub.map(esc).join("<br>")}</div>` : ""
  }<div class="card-reason">${esc(reason)}</div></div>
</label>`;
}
const cards = (cols, html) => `<div class="cohort-cards" style="--cols: ${cols}">${html.join("")}</div>`;
const step = (text) => `<h4 class="dialog-step">${esc(text)}</h4>`;
const textField = (label, name, placeholder = "") =>
  `<div class="cohort-text"><label>${esc(label)}</label><input type="text" name="${name}" placeholder="${esc(placeholder)}"></div>`;
const showFor = (root, kind) => root.querySelectorAll("[data-show]").forEach((el) => (el.hidden = el.dataset.show !== kind));

/** "New Cohort": pick Gang or Expert, its type and name. Creates the cohort and opens its sheet. */
export async function newCohortDialog(actor) {
  const stats = (kind) => {
    const s = cohortStats(kind, actor.system.tier);
    return [`${game.i18n.localize("BITD.Quality")} ${s.quality}`, `${game.i18n.localize("BITD.Scale")} ${s.scale}`];
  };
  const defaultName = (kind, gangType, expertType) =>
    kind === "Expert" ? expertType || game.i18n.localize("BITD.Expert") : L("GangOf", { type: gangLabel(gangType || GANG_TYPES[0]) });
  const content = `<div class="bitd-alt selection-dialog cohort-dialog">
    <p class="dialog-instructions">${esc(L("NewCohortInstructions"))}</p>
    ${step(L("GangOrExpert"))}
    ${cards(2, ["Gang", "Expert"].map((k) => card("cohort", k, game.i18n.localize(`BITD.${k}`), icon(k), { sub: stats(k), checked: k === "Gang" })))}
    <div data-show="Gang">${step(game.i18n.localize("BITD.GangType"))}
      ${cards(5, GANG_TYPES.map((t, i) => card("gangType", t, gangLabel(t), icon(t), { checked: i === 0 })))}</div>
    <div data-show="Expert" hidden>${textField(L("ExpertType"), "expertType", L("ExpertTypePlaceholder"))}</div>
    ${textField(L("CohortName"), "name")}
  </div>`;
  const read = (root) => ({
    kind: root.querySelector('[name="cohort"]:checked')?.value ?? "Gang",
    gangType: root.querySelector('[name="gangType"]:checked')?.value,
    expertType: root.querySelector('[name="expertType"]')?.value.trim(),
  });
  const result = await openFormDialog({
    title: L("NewCohort"),
    content,
    okLabel: L("CreateCohort"),
    cancelLabel: L("Cancel"),
    render: (root) => {
      const sync = () => {
        const { kind, gangType, expertType } = read(root);
        showFor(root, kind);
        root.querySelector('[name="name"]').placeholder = defaultName(kind, gangType, expertType);
      };
      root.addEventListener("change", sync);
      root.addEventListener("input", sync);
      sync();
    },
  });
  if (!result) return null;

  const kind = result.cohort === "Expert" ? "Expert" : "Gang";
  const gangType = GANG_TYPES.includes(result.gangType) ? result.gangType : GANG_TYPES[0];
  const expertType = String(result.expertType ?? "").trim();
  const data = {
    type: "cohort",
    name: String(result.name ?? "").trim() || defaultName(kind, gangType, expertType),
    img: icon(kind === "Gang" ? gangType : "Expert"),
    system: kind === "Gang" ? { cohort: "Gang", gang_type: [gangType] } : { cohort: "Expert", expert_type: expertType },
  };
  const [item] = (await queueUpdate(() => actor.createEmbeddedDocuments("Item", [data]))) ?? [];
  item?.sheet?.render(true);
  return item ?? null;
}

/** "Add Cohort Type": pick a cohort below its max, then a type it lacks. */
export async function addCohortTypeDialog(actor) {
  const cohorts = actor.items.filter((i) => i.type === "cohort");
  if (!cohorts.length) {
    ui.notifications.warn(L("NoCohorts"));
    return null;
  }
  const bloodBrothers = hasBloodBrothers(actor);
  const info = new Map(
    cohorts.map((c) => {
      const types = cohortTypes(c);
      const max = maxCohortTypes(c, bloodBrothers);
      return [c.id, { c, types, max, full: types.length >= max }];
    })
  );
  const first = [...info.values()].find((i) => !i.full);
  const cohortCards = [...info.values()].map(({ c, types, max, full }) => {
    const n = types.length;
    const sub = [types.join(", ") || game.i18n.localize(`BITD.${kindOf(c) ?? "Gang"}`)];
    if (!full) sub.push(L("TypesOf", { n, max }));
    return card("cohortId", c.id, c.name, c.img, { sub, reason: full ? L("AtMax", { n, max }) : "", checked: c === first?.c });
  });
  const content = `<div class="bitd-alt selection-dialog cohort-dialog">
    <p class="dialog-instructions">${esc(L("AddCohortTypeInstructions"))}</p>
    ${step(L("Cohort"))}
    ${cards(3, cohortCards)}
    ${step(L("NewType"))}
    <div data-show="Gang">${cards(5, GANG_TYPES.map((t) => card("gangType", t, gangLabel(t), icon(t))))}</div>
    <div data-show="Expert" hidden>${textField(L("ExpertType"), "expertType", L("ExpertTypePlaceholder"))}</div>
  </div>`;
  const result = await openFormDialog({
    title: L("AddCohortType"),
    content,
    okLabel: L("AddType"),
    cancelLabel: L("Cancel"),
    render: (root) => {
      const sync = () => {
        const sel = info.get(root.querySelector('[name="cohortId"]:checked')?.value);
        showFor(root, sel ? kindOf(sel.c) : "");
        for (const input of root.querySelectorAll('[name="gangType"]')) {
          const has = Boolean(sel?.types.includes(input.value));
          const label = input.closest("label");
          input.disabled = has;
          if (has) input.checked = false;
          label.classList.toggle("choice-disabled", has);
          label.querySelector(".card-reason").textContent = has ? L("HasIt") : "";
          label.title = has ? L("HasIt") : "";
        }
        if (!root.querySelector('[name="gangType"]:checked')) {
          const next = root.querySelector('[name="gangType"]:not(:disabled)');
          if (next) next.checked = true;
        }
      };
      root.addEventListener("change", (ev) => ev.target.name === "cohortId" && sync());
      sync();
    },
  });
  const sel = info.get(result?.cohortId);
  if (!sel || sel.full) return null;

  let update;
  if (kindOf(sel.c) === "Gang") {
    if (!GANG_TYPES.includes(result.gangType) || sel.types.includes(result.gangType)) return null;
    update = { "system.gang_type": [...sel.types, result.gangType] };
  } else {
    const added = String(result.expertType ?? "").trim();
    if (!added) {
      ui.notifications.warn(L("ExpertTypeNeeded"));
      return null;
    }
    update = { "system.expert_type": [...sel.types, added].join(", ") };
  }
  await queueUpdate(() => sel.c.update(update));
  return sel.c;
}
