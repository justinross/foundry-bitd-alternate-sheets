import { BladesActiveEffect } from "../../../systems/blades-in-the-dark/module/blades-active-effect.js";
import { Utils, MODULE_ID } from "./utils.js";
import { queueUpdate } from "./lib/update-queue.js";

/**
 * Pure chaos
 * @extends {ItemSheet}
 */
export class BladesAlternateClassSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["blades-alt", "sheet", "item", "class"],
      template: "modules/bitd-alternate-sheets/templates/class-sheet.html",
      width: 600,
      height: 600,
      // tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "playbook"}]
    });
  }

  /** @override **/
  async _onDropItem(event, droppedItem) {
    await super._onDropItem(event, droppedItem);
    if (!this.actor.isOwner) {
      ui.notifications.error(
        `You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`,
        { permanent: true }
      );
      return false;
    }
    await this.handleDrop(event, droppedItem);
  }

  setLocalProp(propName, value) {
    this[propName] = value;
    this.render(false);
  }

  /** @override */
  async activateListeners(html) {
    super.activateListeners(html);
    html
      .find("input.radio-toggle, label.radio-toggle")
      .click((e) => e.preventDefault());
    html.find("input.radio-toggle, label.radio-toggle").mousedown((e) => {
      this._onRadioToggle(e);
    });
    html.find(".debug-toggle").click(async (ev) => {
      console.log("DEBUG");
      this.show_debug = !this.show_debug;
      this.render(false);
      // html.find('.debug-toggle').toggleClass(on)
      // this.show_debug = true;
    });
  }

  /** @override */
  async getData() {
    let superData = await super.getData();
    let sheetData = superData.data;
    sheetData.isGM = game.user.isGM;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;
    sheetData.show_debug = this.show_debug;
    sheetData.description = superData.system.system.description;
    sheetData.experience_clues = superData.system.system.experience_clues;

    sheetData.effects = BladesActiveEffect.prepareActiveEffectCategories(
      this.item.effects
    );
    let templateAttributes = game.template.Actor.character.attributes;
    let classAttributes = superData.item.system.base_skills;
    for (const attributeKey of Object.keys(templateAttributes)) {
      for (const skillKey of Object.keys(
        templateAttributes[attributeKey].skills
      )) {
        templateAttributes[attributeKey].skills[skillKey].value =
          classAttributes[skillKey];
      }
      // if (Object.hasOwnProperty.call(object, key)) {
      //   const element = object[key];

      // }
    }
    sheetData.attributes = templateAttributes;

    //load attribute object and stuff from system template
    return sheetData;
  }

  _onRadioToggle(event) {
    let type = event.target.tagName.toLowerCase();
    let target = event.target;
    if (type == "label") {
      let labelID = $(target).attr("for");
      target = $(`#${labelID}`).get(0);
    }
    if (target.checked) {
      //find the next lowest-value input with the same name and click that one instead
      let name = target.name;
      let value = parseInt(target.value) - 1;
      this.element
        .find(`input[name="${name}"][value="${value}"]`)
        .trigger("click");
    } else {
      //trigger the click on this one
      $(target).trigger("click");
    }
  }
}
