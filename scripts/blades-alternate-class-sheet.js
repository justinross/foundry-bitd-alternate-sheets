// import { BladesActiveEffect } from "../../../systems/blades-in-the-dark/module/blades-active-effect.js";
import { Utils, MODULE_ID } from "./utils.js";
import {queueUpdate} from "./lib/update-queue.js";


/**
 * Pure chaos
 * @extends {ItemSheet}
 */
export class BladesAlternateClassSheet extends ItemSheet {
  groups = [
    {
      label: "Starting Attributes", 
      id: "start-attributes"
    }
  ];
  fields = [
    {
      label: "BITD.Description",
      name : "description",
      type : "editor",
      group: "none"
    },
    {
      label: "BITD.Image",
      name : "img",
      type : "img",
      group: "none"
    },
    {
      label: "BITD.SkillsHunt",
      name : "base_skills.hunt",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsStudy",
      name : "base_skills.study",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsSurvey",
      name : "base_skills.survey",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsTinker",
      name : "base_skills.tinker",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsFinesse",
      name : "base_skills.finesse",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsProwl",
      name : "base_skills.prowl",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsSkirmish",
      name : "base_skills.skirmish",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsWreck",
      name : "base_skills.wreck",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsAttune",
      name : "base_skills.attune",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsCommand",
      name : "base_skills.command",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsConsort",
      name : "base_skills.consort",
      type : "number",
      group : "start-attributes"

    },
    {
      label: "BITD.SkillsSway",
      name : "base_skills.sway",
      type : "number",
      group : "start-attributes"
    }
  ];

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["blades-alt", "sheet", "item", "class"],
  	  template: "modules/bitd-alternate-sheets/templates/class-sheet.html",
      width: 600,
      height: 600
      // tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "playbook"}]
    });
  }

  /** @override **/
  async _onDropItem(event, droppedItem) {
    await super._onDropItem(event, droppedItem);
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
	  await this.handleDrop(event, droppedItem);
  }

  setLocalProp(propName, value){
    this[propName] = value;
    this.render(false);
  }

  /** @override */
  async getData() {
    let superData = await super.getData();
    let sheetData = superData.data;
    sheetData.isGM = game.user.isGM;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;
    let templateAttributes = game.template.Actor.character.attributes;
    let classAttributes = superData.item.system.base_skills;
    for (const attributeKey of Object.keys(templateAttributes)) {
      for (const skillKey of Object.keys(templateAttributes[attributeKey].skills)) {
        templateAttributes[attributeKey].skills[skillKey].value = classAttributes[skillKey];
      }
      // if (Object.hasOwnProperty.call(object, key)) {
      //   const element = object[key];

      // }
    }
    sheetData.attributes = templateAttributes;
    console.log(templateAttributes);


    //load attribute object and stuff from system template
    return sheetData;
  }

}
