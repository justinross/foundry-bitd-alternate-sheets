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
 * @param {Array<{ value: string, label: string, img?: string }>} options.choices
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
  return Boolean(dialogV2 && typeof dialogV2.wait === "function");
}

function escapeHTML(value) {
  return foundry.utils.escapeHTML?.(value ?? "") ?? value ?? "";
}

function getCardHtml(choices, currentValue) {
  const safeCurrentValue = currentValue ?? "";

  const cards = choices
    .filter((c) => c.value) // Filter out empty values
    .map((choice) => {
      const value = escapeHTML(choice.value);
      const label = escapeHTML(choice.label);
      const img = choice.img || "icons/svg/mystery-man.svg";
      const isSelected = choice.value === safeCurrentValue;
      const checked = isSelected ? "checked" : "";

      // Inline styles for card content - changes based on selection
      const cardContentStyle = isSelected
        ? "display: flex; flex-direction: column; align-items: center; padding: 0.5rem; border-radius: 5px; height: 100%; transition: all 0.2s; border: 2px solid #800000; background: rgba(128, 0, 0, 0.15); box-shadow: 0 0 8px #800000;"
        : "display: flex; flex-direction: column; align-items: center; padding: 0.5rem; border-radius: 5px; height: 100%; transition: all 0.2s; border: 2px solid transparent; background: rgba(0, 0, 0, 0.05);";

      return `
        <label style="cursor: pointer; position: relative; display: block;">
          <input type="radio" name="crewId" value="${value}" ${checked} style="position: absolute; opacity: 0; width: 0; height: 0;">
          <div class="card-content" data-crew-value="${value}" style="${cardContentStyle}">
            <img src="${img}" alt="${label}" style="width: 48px; height: 48px; border: none; margin-bottom: 0.25rem; object-fit: cover; border-radius: 4px;" />
            <div style="font-weight: bold; font-size: 0.9em; text-align: center; word-break: break-word; line-height: 1.2;">${label}</div>
          </div>
        </label>
      `;
    })
    .join("");

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem; max-height: 400px; overflow-y: auto; padding: 4px;">
      ${cards}
    </div>
  `;
}

async function openCrewSelectionDialogV2({
  title,
  instructions,
  okLabel,
  cancelLabel,
  clearLabel,
  choices,
  currentValue,
}) {
  const { DialogV2 } = foundry.applications.api;

  const content = `
    <form class="bitd-alt crew-dialog">
      <p style="margin-bottom: 0.5rem; font-style: italic;">${escapeHTML(instructions)}</p>
      ${getCardHtml(choices, currentValue)}
    </form>
  `;

  const result = await DialogV2.wait({
    window: { title, resizable: true },
    content,
    render: (event, dialog) => {
      // Attach event listeners programmatically since inline handlers are stripped by Foundry's sanitization
      // v12: dialog.element may be undefined, fallback to event.currentTarget or document query
      // v13: dialog.element is available
      const form =
        dialog.element?.querySelector("form") ||
        event.currentTarget?.querySelector("form") ||
        document.querySelector("dialog[open] form");

      if (form) {
        const radios = form.querySelectorAll('input[type="radio"]');

        radios.forEach(radio => {
          radio.addEventListener('change', function () {
            const grid = this.closest('div[style*="grid"]');
            if (!grid) return;

            // Reset all cards to default style
            const allCards = grid.querySelectorAll('.card-content');
            allCards.forEach(card => {
              card.style.border = '2px solid transparent';
              card.style.background = 'rgba(0, 0, 0, 0.05)';
              card.style.boxShadow = 'none';
            });

            // Highlight the selected card
            const thisCard = this.parentElement.querySelector('.card-content');
            if (thisCard) {
              thisCard.style.border = '2px solid #800000';
              thisCard.style.background = 'rgba(128, 0, 0, 0.15)';
              thisCard.style.boxShadow = '0 0 8px #800000';
            }
          });
        });
      }
    },
    buttons: [
      {
        action: "ok",
        label: okLabel,
        icon: "fas fa-check",
        default: true,
        callback: (event, button, dialog) => {
          // v12: dialog.element may be undefined, use event.target to find form
          // v13: dialog.element is available
          const formElement =
            dialog.element?.querySelector("form") ||
            event.target?.closest("dialog")?.querySelector("form") ||
            document.querySelector("dialog[open] form");
          if (!formElement) return "";
          const formData = new FormDataExtended(formElement);
          return formData.object.crewId || "";
        },
      },
      {
        action: "clear",
        label: clearLabel,
        icon: "fas fa-unlink",
        callback: () => "",
      },
      {
        action: "cancel",
        label: cancelLabel,
        icon: "fas fa-times",
        callback: () => undefined,
      },
    ],
  });

  if (result === undefined) return undefined;
  const normalized = (result ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

async function openCrewSelectionDialogV1({
  title,
  instructions,
  okLabel,
  cancelLabel,
  clearLabel,
  choices,
  currentValue,
}) {
  const content = `
    <form class="bitd-alt crew-dialog">
      <p class="instructions">${escapeHTML(instructions)}</p>
      ${getCardHtml(choices, currentValue)}
    </form>
  `;

  return await new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const dialog = new Dialog(
      {
        title,
        content,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: okLabel,
            callback: (html) => {
              const selected = html.find("input[name='crewId']:checked").val();
              console.log("BitD Alt | V1 Selected:", selected);
              finish(selected ? String(selected) : null);
            },
          },
          clear: {
            icon: '<i class="fas fa-unlink"></i>',
            label: clearLabel,
            callback: () => {
              console.log("BitD Alt | V1 Clear clicked");
              finish(null);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: cancelLabel,
            callback: () => {
              console.log("BitD Alt | V1 Cancel clicked");
              finish(undefined);
            },
          },
        },
        default: "confirm",
        close: () => finish(undefined),
      },
      {
        resizable: true,
        width: 500,
      }
    );
    dialog.render(true);
  });
}
