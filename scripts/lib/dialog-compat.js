// Set to true while developing to force the legacy V1 dialog even on V2-capable cores.
// This lets us regression-test the fallback path on v13+ without spinning up an older Foundry build.
const FORCE_DIALOG_V1 = false;

/**
 * Open a compatibility dialog that supports both Application V1 and V2
 * frameworks depending on the Foundry version in use.
 * Displays choices as selectable cards with optional text input.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.instructions
 * @param {string} options.okLabel
 * @param {string} options.cancelLabel
 * @param {string} options.clearLabel
 * @param {Array<{ value: string, label: string, img?: string }>} options.choices
 * @param {string} [options.currentValue]
 * @param {boolean} [options.allowCustomText=false] - Enable text input field for custom values
 * @param {string} [options.textInputLabel=""] - Label for the text input field
 * @param {string} [options.textInputPlaceholder=""] - Placeholder text for the input
 * @returns {Promise<string|null|undefined>}
 */
export async function openCardSelectionDialog(options) {
  if (supportsDialogV2()) {
    return openCardSelectionDialogV2(options);
  }
  return openCardSelectionDialogV1(options);
}

// Alias for backward compatibility if needed, but we will update consumers.
export const openCrewSelectionDialog = openCardSelectionDialog;

function supportsDialogV2() {
  if (FORCE_DIALOG_V1) return false;
  const dialogV2 = foundry?.applications?.api?.DialogV2;
  return Boolean(dialogV2 && typeof dialogV2.wait === "function");
}

function escapeHTML(value) {
  return foundry.utils.escapeHTML?.(value ?? "") ?? value ?? "";
}

function getTextInputHtml(options) {
  const { allowCustomText, textInputLabel, textInputPlaceholder, currentValue } = options;
  if (!allowCustomText) return "";

  const safeLabel = escapeHTML(textInputLabel || "");
  const safePlaceholder = escapeHTML(textInputPlaceholder || "");
  const safeValue = escapeHTML(currentValue || "");

  return `
    <div class="custom-text-input-wrapper" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.03); border-radius: 4px;">
      <label style="font-weight: bold; white-space: nowrap;">${safeLabel}</label>
      <div style="flex: 1; position: relative; display: flex; align-items: center;">
        <input type="text" name="customTextValue" value="${safeValue}" placeholder="${safePlaceholder}"
          style="width: 100%; padding: 0.4rem 2rem 0.4rem 0.5rem; border: 1px solid #999; border-radius: 3px; font-size: 1em;" />
        <button type="button" class="clear-text-btn" style="position: absolute; right: 4px; background: none; border: none; cursor: pointer; padding: 0.25rem; color: #666; font-size: 1.1em;" title="Clear">✕</button>
      </div>
    </div>
  `;
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

      const description = choice.description ? escapeHTML(choice.description) : "";

      const cardContentStyle = isSelected
        ? "display: flex; flex-direction: column; align-items: center; padding: 0.5rem; border-radius: 5px; height: 100%; transition: all 0.2s; border: 2px solid #800000; background: rgba(128, 0, 0, 0.15); box-shadow: 0 0 8px #800000;"
        : "display: flex; flex-direction: column; align-items: center; padding: 0.5rem; border-radius: 5px; height: 100%; transition: all 0.2s; border: 2px solid transparent; background: rgba(0, 0, 0, 0.05);";

      return `
        <label style="cursor: pointer; position: relative; display: block;" title="${description}">
          <input type="radio" name="selectionId" value="${value}" ${checked} style="position: absolute; opacity: 0; width: 0; height: 0;">
          <div class="card-content" data-selection-value="${value}" style="${cardContentStyle}">
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

async function openCardSelectionDialogV2({
  title,
  instructions,
  okLabel,
  cancelLabel,
  clearLabel,
  choices,
  currentValue,
  allowCustomText = false,
  textInputLabel = "",
  textInputPlaceholder = "",
}) {
  const { DialogV2 } = foundry.applications.api;
  const hasChoices = choices && choices.length > 0;

  const content = `
    <form class="bitd-alt selection-dialog">
      <p style="margin-bottom: 0.5rem; font-style: italic;">${escapeHTML(instructions)}</p>
      ${getTextInputHtml({ allowCustomText, textInputLabel, textInputPlaceholder, currentValue })}
      ${hasChoices ? getCardHtml(choices, currentValue) : ""}
    </form>
  `;

  const result = await DialogV2.wait({
    window: { title, resizable: true },
    position: { width: 550 },
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
        const textInput = form.querySelector('input[name="customTextValue"]');
        const clearBtn = form.querySelector('.clear-text-btn');

        // Card selection handler - also updates text input if present
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

            // Update text input with selected card's value (the label, not ID)
            if (textInput && this.value) {
              const selectedChoice = choices.find(c => c.value === this.value);
              textInput.value = selectedChoice?.label || this.value;
            }
          });
        });

        // Text input handler - clears card selection when typing
        if (textInput) {
          textInput.addEventListener('input', function () {
            // Clear card highlight when user types custom text
            const allCards = form.querySelectorAll('.card-content');
            allCards.forEach(card => {
              card.style.border = '2px solid transparent';
              card.style.background = 'rgba(0, 0, 0, 0.05)';
              card.style.boxShadow = 'none';
            });
            // Uncheck all radios
            radios.forEach(r => r.checked = false);
          });
        }

        // Clear button handler
        if (clearBtn) {
          clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (textInput) textInput.value = '';
            // Clear card highlight
            const allCards = form.querySelectorAll('.card-content');
            allCards.forEach(card => {
              card.style.border = '2px solid transparent';
              card.style.background = 'rgba(0, 0, 0, 0.05)';
              card.style.boxShadow = 'none';
            });
            // Uncheck all radios
            radios.forEach(r => r.checked = false);
          });
        }
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
          // v13: Use namespaced FormDataExtended, v12: Use global
          const FormData = foundry.applications?.ux?.FormDataExtended || FormDataExtended;
          const formData = new FormData(formElement);

          // If allowCustomText is enabled, text input is the source of truth
          if (allowCustomText) {
            return formData.object.customTextValue ?? "";
          }
          return formData.object.selectionId || "";
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

  // DialogV2 sometimes returns the action name as a string instead of the callback result
  // Handle "cancel" and "clear" action names explicitly
  // Handle null (Close button 'X') as cancel (undefined)
  if (result === undefined || result === "cancel" || result === null) return undefined;
  if (result === "clear") return null;

  const normalized = (result ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

async function openCardSelectionDialogV1({
  title,
  instructions,
  okLabel,
  cancelLabel,
  clearLabel,
  choices,
  currentValue,
  allowCustomText = false,
  textInputLabel = "",
  textInputPlaceholder = "",
}) {
  const hasChoices = choices && choices.length > 0;

  const content = `
    <form class="bitd-alt selection-dialog">
      <p class="instructions">${escapeHTML(instructions)}</p>
      ${getTextInputHtml({ allowCustomText, textInputLabel, textInputPlaceholder, currentValue })}
      ${hasChoices ? getCardHtml(choices, currentValue) : ""}
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
              // If allowCustomText is enabled, text input is the source of truth
              if (allowCustomText) {
                const textValue = html.find('input[name="customTextValue"]').val() ?? "";
                const trimmed = textValue.trim();
                finish(trimmed.length > 0 ? trimmed : null);
                return;
              }
              const selected = html.find("input[name='selectionId']:checked").val();
              finish(selected ? String(selected) : null);
            },
          },
          clear: {
            icon: '<i class="fas fa-unlink"></i>',
            label: clearLabel,
            callback: () => {
              finish(null);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: cancelLabel,
            callback: () => {
              finish(undefined);
            },
          },
        },
        default: "confirm",
        close: () => finish(undefined),
        render: (html) => {
          if (!allowCustomText) return;

          const form = html.find('form')[0];
          if (!form) return;

          const radios = form.querySelectorAll('input[type="radio"]');
          const textInput = form.querySelector('input[name="customTextValue"]');
          const clearBtn = form.querySelector('.clear-text-btn');

          // Card selection handler - also updates text input if present
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

              // Update text input with selected card's value (the label, not ID)
              if (textInput && this.value) {
                const selectedChoice = choices.find(c => c.value === this.value);
                textInput.value = selectedChoice?.label || this.value;
              }
            });
          });

          // Text input handler - clears card selection when typing
          if (textInput) {
            textInput.addEventListener('input', function () {
              // Clear card highlight when user types custom text
              const allCards = form.querySelectorAll('.card-content');
              allCards.forEach(card => {
                card.style.border = '2px solid transparent';
                card.style.background = 'rgba(0, 0, 0, 0.05)';
                card.style.boxShadow = 'none';
              });
              // Uncheck all radios
              radios.forEach(r => r.checked = false);
            });
          }

          // Clear button handler
          if (clearBtn) {
            clearBtn.addEventListener('click', function (e) {
              e.preventDefault();
              if (textInput) textInput.value = '';
              // Clear card highlight
              const allCards = form.querySelectorAll('.card-content');
              allCards.forEach(card => {
                card.style.border = '2px solid transparent';
                card.style.background = 'rgba(0, 0, 0, 0.05)';
                card.style.boxShadow = 'none';
              });
              // Uncheck all radios
              radios.forEach(r => r.checked = false);
            });
          }
        },
      },
      {
        resizable: true,
        width: 550,
      }
    );
    dialog.render(true);
  });
}

// ============================================================================
// Text Input Dialog
// ============================================================================

/**
 * Open a text input dialog with V1/V2 compatibility.
 * Used as fallback when no chooser items are available.
 *
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} options.label - Label for the input field
 * @param {string} options.currentValue - Current value to pre-fill
 * @param {string} options.okLabel - OK button label
 * @param {string} options.cancelLabel - Cancel button label
 * @returns {Promise<string|undefined>} The entered value, or undefined if cancelled
 */
export async function openTextInputDialog(options) {
  if (supportsDialogV2()) {
    return openTextInputDialogV2(options);
  }
  return openTextInputDialogV1(options);
}

async function openTextInputDialogV2({
  title,
  label,
  currentValue,
  okLabel,
  cancelLabel,
}) {
  const { DialogV2 } = foundry.applications.api;

  const content = `
    <form class="bitd-alt text-input-dialog">
      <div class="form-group">
        <label>${escapeHTML(label)}</label>
        <input type="text" name="value" value="${escapeHTML(currentValue ?? "")}" autofocus />
      </div>
    </form>
  `;

  const result = await DialogV2.wait({
    window: { title },
    position: { width: 400 },
    content,
    buttons: [
      {
        action: "ok",
        label: okLabel,
        icon: "fas fa-check",
        default: true,
        callback: (event, button, dialog) => {
          const formElement =
            dialog.element?.querySelector("form") ||
            event.target?.closest("dialog")?.querySelector("form") ||
            document.querySelector("dialog[open] form");
          if (!formElement) return "";
          const FormData = foundry.applications?.ux?.FormDataExtended || FormDataExtended;
          const formData = new FormData(formElement);
          return formData.object.value ?? "";
        },
      },
      {
        action: "cancel",
        label: cancelLabel,
        icon: "fas fa-times",
        callback: () => undefined,
      },
    ],
  });

  // Handle cancel action or close button
  if (result === undefined || result === "cancel" || result === null) return undefined;

  return String(result);
}

async function openTextInputDialogV1({
  title,
  label,
  currentValue,
  okLabel,
  cancelLabel,
}) {
  const content = `
    <form class="bitd-alt text-input-dialog">
      <div class="form-group">
        <label>${escapeHTML(label)}</label>
        <input type="text" name="value" value="${escapeHTML(currentValue ?? "")}" autofocus />
      </div>
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
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: okLabel,
            callback: (html) => {
              const value = html.find('input[name="value"]').val();
              finish(value ?? "");
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: cancelLabel,
            callback: () => {
              finish(undefined);
            },
          },
        },
        default: "ok",
        close: () => finish(undefined),
      },
      {
        width: 400,
      }
    );
    dialog.render(true);
  });
}
