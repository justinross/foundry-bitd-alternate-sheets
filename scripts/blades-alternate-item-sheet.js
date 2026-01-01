import { Utils, MODULE_ID } from "./utils.js";
import { TEMPLATES } from "./constants.js";
import { queueUpdate } from "./lib/update-queue.js";
import { getItemSheetClass } from "./compat.js";
import { guardDropAndHandle, setLocalPropAndRender, sheetDefaultOptions } from "./lib/sheet-helpers.js";

const BaseItemSheet = getItemSheetClass();

/**
 * Pure chaos
 * @extends {ItemSheet}
 */
export class BladesAlternateItemSheet extends BaseItemSheet {
  /** @override */
  static get defaultOptions() {
    return sheetDefaultOptions(super.defaultOptions, {
      classes: ["blades-alt", "sheet", "item"],
      template: TEMPLATES.ITEM_SHEET,
      width: 400,
      height: 600,
    });
  }

  /** @override **/
  async _onDropItem(event, droppedItem) {
    await guardDropAndHandle(this, super._onDropItem.bind(this), event, droppedItem);
  }

  setLocalProp(propName, value) {
    setLocalPropAndRender(this, propName, value);
  }

  /** @override */
  async getData() {
    let data = await super.getData();
    return data;
  }
}
