import { safeUpdate } from "./utils.js";

/**
 * Find content-link elements pointing to clock actors and replace them with clock displays.
 * This runs after Foundry's built-in @UUID enricher has processed the text.
 * @param {HTMLElement} container - The container to search for clock links
 * @param {string} [messageContent] - Optional raw message content to extract snapshot values from
 */
export async function replaceClockLinks(container, messageContent = null) {
  if (!container) return;

  const snapshotValues = parseClockSnapshotValues(messageContent);
  const links = container.querySelectorAll('a.content-link[data-type="Actor"]');

  for (const link of links) {
    const uuid = link.dataset.uuid;
    if (!uuid) continue;

    try {
      const doc = await fromUuid(uuid);
      if (!doc || !isClockActor(doc)) continue;

      const model = getClockRenderModel(doc, uuid, snapshotValues);
      const clockHtml = buildClockHtml(model, doc.name);
      const clockDiv = createClockDiv(uuid, model.isSnapshot, clockHtml);

      link.replaceWith(clockDiv);
    } catch (err) {
      // Preserve original error as cause when wrapping non-Errors
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });

      // Error funnel: stack traces + ecosystem hooks (no UI notification)
      Hooks.onError("BitD-Alt.ClockRender", error, {
        msg: "[BitD-Alt]",
        log: "warn",  // Use warn for non-critical rendering errors
        notify: null,  // Developer-only, no UI spam
        data: {
          context: "ClockRender",
          uuid: uuid
        }
      });
    }
  }
}

export function setupGlobalClockHandlers() {
  const $body = $(document.body);

  function getUpdatePath(input) {
    let name = input.name || "";
    name = name.replace(/-[a-zA-Z0-9]+-[a-zA-Z0-9]+$/, "");
    return name || "system.value";
  }

  function getDocumentUuid(clockEl) {
    return clockEl.dataset.uuid
      || clockEl.closest('[data-uuid]')?.dataset.uuid
      || clockEl.closest('form')?.dataset.uuid;
  }

  async function getUpdatableDoc(clockEl) {
    const uuid = getDocumentUuid(clockEl);
    if (!uuid) return null;

    const doc = await fromUuid(uuid);
    if (!doc?.isOwner) return null;
    return doc;
  }

  $body.on("click", ".blades-clock label.radio-toggle", async (e) => {
    if ($(e.currentTarget).closest('[data-snapshot="true"]').length) return;

    e.preventDefault();
    e.stopPropagation();

    const label = e.currentTarget;
    const forId = label.getAttribute("for");
    if (!forId) return;

    const input = document.getElementById(forId);
    if (!input || input.type !== "radio") return;

    const clockEl = label.closest('.blades-clock');
    if (!clockEl) return;

    const clickedSegment = parseInt(input.value);
    const updatePath = getUpdatePath(input);

    const bg = clockEl.style.backgroundImage || "";
    const bgMatch = bg.match(/(\d+)clock_(\d+)\./);
    const currentValue = bgMatch ? parseInt(bgMatch[2]) : 0;

    const newValue = clickedSegment <= currentValue ? clickedSegment - 1 : clickedSegment;
    if (newValue === currentValue) return;

    const doc = await getUpdatableDoc(clockEl);
    if (!doc) return;

    const updateData = { [updatePath]: newValue };
    if (isClockActor(doc)) {
      const type = doc.system?.type ?? 4;
      const color = doc.system?.color ?? "black";
      const imgPath = `systems/blades-in-the-dark/themes/${color}/${type}clock_${newValue}.svg`;
      updateData.img = imgPath;
      updateData["prototypeToken.texture.src"] = imgPath;
    }

    await safeUpdate(doc, updateData);
  });

  $body.on("contextmenu", ".blades-clock", async (e) => {
    if ($(e.currentTarget).closest('[data-snapshot="true"]').length) return;

    e.preventDefault();
    e.stopPropagation();

    const clockEl = e.currentTarget;

    const bg = clockEl.style.backgroundImage || "";
    const bgMatch = bg.match(/(\d+)clock_(\d+)\./);
    const currentValue = bgMatch ? parseInt(bgMatch[2]) : 0;
    const newValue = Math.max(0, currentValue - 1);
    if (newValue === currentValue) return;

    const doc = await getUpdatableDoc(clockEl);
    if (!doc) return;

    const anyInput = clockEl.querySelector('input[type="radio"]');
    const updatePath = anyInput ? getUpdatePath(anyInput) : "system.value";

    const updateData = { [updatePath]: newValue };
    if (isClockActor(doc)) {
      const type = doc.system?.type ?? 4;
      const color = doc.system?.color ?? "black";
      const imgPath = `systems/blades-in-the-dark/themes/${color}/${type}clock_${newValue}.svg`;
      updateData.img = imgPath;
      updateData["prototypeToken.texture.src"] = imgPath;
    }

    await safeUpdate(doc, updateData);
  });

  $body.on("change click", ".blades-clock input[type='radio']", (e) => {
    if ($(e.currentTarget).closest('.blades-clock').length) {
      e.stopPropagation();
    }
  });
}

function parseClockSnapshotValues(messageContent) {
  const snapshotValues = new Map();
  if (!messageContent) return snapshotValues;
  const snapshotPattern = /@UUID\[([^\]]+)\]\{[^|]*\|snapshot:(\d+)\}/g;
  let match;
  while ((match = snapshotPattern.exec(messageContent)) !== null) {
    snapshotValues.set(match[1], parseInt(match[2]));
  }
  return snapshotValues;
}

function isClockActor(doc) {
  return doc?.type === "🕛 clock" || doc?.type === "clock";
}

function getClockRenderModel(doc, uuid, snapshotValues) {
  const type = parseInt(doc.system?.type ?? 4);
  const snapshotValue = snapshotValues.has(uuid) ? snapshotValues.get(uuid) : undefined;
  const value = snapshotValue !== undefined ? parseInt(snapshotValue) : parseInt(doc.system?.value ?? 0);
  const color = doc.system?.color ?? "black";
  const uniq_id = doc.id;
  const renderInstance = foundry.utils.randomID();
  const parameter_name = `system.value-${uniq_id}-${renderInstance}`;
  const isSnapshot = snapshotValue !== undefined;
  return { type, value, color, uniq_id, renderInstance, parameter_name, isSnapshot, uuid };
}

function buildClockHtml(model, name) {
  const { type, value, color, uniq_id, renderInstance, parameter_name, uuid } = model;
  let clockHtml = `<div id="blades-clock-${uniq_id}-${renderInstance}"
           class="blades-clock clock-${type} clock-${type}-${value}"
           style="background-image:url('systems/blades-in-the-dark/themes/${color}/${type}clock_${value}.svg'); width: 100px; height: 100px;"
           data-uuid="${uuid}">`;

  const zero_checked = value === 0 ? "checked" : "";
  clockHtml += `<input type="radio" value="0" id="clock-0-${uniq_id}-${renderInstance}" data-dType="String" name="${parameter_name}" ${zero_checked}>`;

  for (let i = 1; i <= type; i++) {
    const checked = value === i ? "checked" : "";
    clockHtml += `<input type="radio" value="${i}" id="clock-${i}-${uniq_id}-${renderInstance}" data-dType="String" name="${parameter_name}" ${checked}>`;
    clockHtml += `<label class="radio-toggle" for="clock-${i}-${uniq_id}-${renderInstance}"></label>`;
  }

  clockHtml += `</div>`;
  clockHtml += `<br/><span class="clock-name">${name}</span>`;
  return clockHtml;
}

function createClockDiv(uuid, isSnapshot, html) {
  const clockDiv = document.createElement("div");
  clockDiv.className = "blades-clock-container linkedClock";
  clockDiv.dataset.uuid = uuid;
  if (isSnapshot) {
    clockDiv.dataset.snapshot = "true";
  }
  clockDiv.innerHTML = html;
  return clockDiv;
}

/**
 * Watch a container for clock actor content-links being added (async enrichment).
 * This handles V13+ where @UUID enrichment happens after render hooks fire.
 * @param {HTMLElement} container - The container to watch
 * @param {number} [timeoutMs=2000] - How long to watch before giving up
 */
export function watchForClockLinks(container, timeoutMs = 2000) {
  if (!container) return;

  // First, try immediate replacement (works if enrichment already happened)
  replaceClockLinks(container);

  // Set up observer to watch for dynamically added content-links
  const observer = new MutationObserver(async (mutations) => {
    let hasNewLinks = false;

    for (const mutation of mutations) {
      // Check added nodes for content-links
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        // Check if the node itself is a content-link
        if (node.matches?.('a.content-link[data-type="Actor"]')) {
          hasNewLinks = true;
          break;
        }

        // Check if the node contains content-links
        if (node.querySelector?.('a.content-link[data-type="Actor"]')) {
          hasNewLinks = true;
          break;
        }
      }

      if (hasNewLinks) break;
    }

    if (hasNewLinks) {
      // Give a tiny delay for any batch of mutations to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      await replaceClockLinks(container);
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });

  // Auto-disconnect after timeout to prevent memory leaks
  setTimeout(() => {
    observer.disconnect();
  }, timeoutMs);
}
