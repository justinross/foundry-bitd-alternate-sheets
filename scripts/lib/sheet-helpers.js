/**
 * Small helpers shared by item/class sheets to reduce duplication.
 */
export function sheetDefaultOptions(baseOptions, { classes = [], template, width, height } = {}) {
  return foundry.utils.mergeObject(baseOptions, {
    classes,
    template,
    width,
    height,
  });
}

const NOTIFY_PERMS =
  "You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.";

export async function guardDropAndHandle(sheet, superDropFn, event, droppedItem) {
  await superDropFn(event, droppedItem);
  if (!sheet.actor?.isOwner) {
    ui.notifications.error(NOTIFY_PERMS, { permanent: true });
    return false;
  }
  return sheet.handleDrop(event, droppedItem);
}

export function setLocalPropAndRender(sheet, propName, value) {
  sheet[propName] = value;
  sheet.render(false);
}

/**
 * Bind event handlers for inline-input contenteditable fields.
 * Syncs contenteditable span content to hidden input on keyup and blur.
 * @param {JQuery} html - The sheet's HTML element
 */
export function bindInlineInputHandlers(html) {
  html.find(".inline-input").on("keyup", async (ev) => {
    const input = ev.currentTarget.previousSibling;
    const text = ev.currentTarget.innerText ?? "";
    input.value = text.trim().length === 0 ? "" : text;
  });

  html.find(".inline-input").on("blur", async (ev) => {
    const input = ev.currentTarget.previousSibling;
    const placeholder = ev.currentTarget.dataset.placeholder ?? "";
    const text = ev.currentTarget.innerText ?? "";
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      ev.currentTarget.innerText = placeholder;
      input.value = "";
    } else {
      input.value = text;
    }
    $(input).change();
  });
}
