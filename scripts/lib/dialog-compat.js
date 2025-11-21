const MODULE_ID_FALLBACK = "bitd-alternate-sheets";

// Set to true while developing to force the legacy V1 dialog even on V2-capable cores.
// This lets us regression-test the fallback path on v13+ without spinning up an older Foundry build.
const FORCE_DIALOG_V1 = false;

/**
 * Open a compatibility dialog that supports both Application V1 and V2
 * frameworks depending on the Foundry version in use.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.instructions
 * @param {string} options.okLabel
 * @param {string} options.cancelLabel
 * @param {string} options.clearLabel
 * @param {string} [options.clearHint]
 * @param {string} options.crewLabel
 * @param {Array<{ value: string, label: string }>} options.choices
 * @param {string} [options.currentValue]
 * @returns {Promise<string|null|undefined>}
 */
export async function openCrewSelectionDialog(options) {
  if (supportsDialogV2()) {
    return openCrewSelectionDialogV2(options);
  }
  return openCrewSelectionDialogV1(options);
}

function supportsDialogV2() {
  if (FORCE_DIALOG_V1) return false;
  const dialogV2 = foundry?.applications?.api?.DialogV2;
  return Boolean(dialogV2 && typeof dialogV2.input === "function");
}

function escapeHTML(value) {
  return foundry.utils.escapeHTML?.(value ?? "") ?? value ?? "";
}

async function openCrewSelectionDialogV2({
  title,
  instructions,
  okLabel,
  cancelLabel,
  clearLabel,
  clearHint,
  crewLabel,
  choices,
  currentValue,
}) {
  const { DialogV2 } = foundry.applications.api;
  const selectId =
    foundry.utils.randomID?.() ||
    crypto.randomUUID?.() ||
    MODULE_ID_FALLBACK;
  const optionsHtml = choices
    .map((choice) => {
      const value = escapeHTML(choice.value);
      const label = escapeHTML(choice.label);
      const selected = choice.value === (currentValue ?? "") ? " selected" : "";
      return `<option value="${value}"${selected}>${label}</option>`;
    })
    .join("");

  const content = `
    <form class="bitd-alt crew-dialog">
      <p class="instructions">${escapeHTML(instructions)}</p>
      <div class="form-group" style="display:flex; flex-direction:column; gap:0.35rem;">
        <label for="${selectId}">${escapeHTML(crewLabel)}</label>
        <select id="${selectId}" name="crewId">
          ${optionsHtml}
        </select>
      </div>
      ${clearHint ? `<p class="notes">${escapeHTML(clearHint)}</p>` : ""}
    </form>
  `;

  const result =
    (await DialogV2.input({
      window: { title },
      content,
      ok: {
        label: okLabel,
        icon: "fas fa-check",
      },
      cancel: {
        label: cancelLabel,
        icon: "fas fa-times",
      },
    })) ?? null;

  if (result === null) return undefined;
  const normalized = (result.crewId ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

async function openCrewSelectionDialogV1({
  title,
  instructions,
  okLabel,
  cancelLabel,
  clearLabel,
  clearHint,
  crewLabel,
  choices,
  currentValue,
}) {
  const selectId =
    foundry.utils.randomID?.() ||
    crypto.randomUUID?.() ||
    MODULE_ID_FALLBACK;
  const optionsHtml = choices
    .map((choice) => {
      const value = escapeHTML(choice.value);
      const label = escapeHTML(choice.label);
      const selected = choice.value === (currentValue ?? "") ? " selected" : "";
      return `<option value="${value}"${selected}>${label}</option>`;
    })
    .join("");

  const content = `
      <form class="bitd-alt crew-dialog">
        <p class="instructions">${escapeHTML(instructions)}</p>
        <div class="form-group" style="display:flex; flex-direction:column; gap:0.35rem;">
          <label for="${selectId}">${escapeHTML(crewLabel)}</label>
          <select id="${selectId}" name="crewId">
            ${optionsHtml}
          </select>
        </div>
        ${clearHint ? `<p class="notes">${escapeHTML(clearHint)}</p>` : ""}
      </form>
    `;

  return await new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const dialog = new Dialog({
      title,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: okLabel,
          callback: (html) => {
            const select = html.find("select[name='crewId']");
            const value = select.val();
            finish(value ? String(value) : null);
          },
        },
        clear: {
          icon: '<i class="fas fa-unlink"></i>',
          label: clearLabel,
          callback: () => finish(null),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: cancelLabel,
          callback: () => finish(undefined),
        },
      },
      default: "confirm",
      close: () => finish(undefined),
    });
    dialog.render(true);
  });
}
