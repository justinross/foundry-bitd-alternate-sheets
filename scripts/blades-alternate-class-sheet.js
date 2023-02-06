// import { BladesActiveEffect } from "../../../systems/blades-in-the-dark/module/blades-active-effect.js";
import { Utils, MODULE_ID } from "./utils.js";
import {queueUpdate} from "./lib/update-queue.js";


/**
 * Pure chaos
 * @extends {ItemSheet}
 */
export class BladesAlternateClassSheet extends ItemSheet {
  fields = [
    {
      label: "BITD.Description,
      name : "description",
      type : "editor"
    },
    {
      label: "BITD.SkillsHunt",
      name : "base_skills.hunt",
      type : "number"
    },
    {
      label: "BITD.SkillsStudy",
      name : "base_skills.study",
      type : "number"
    },
    {
      label: "BITD.SkillsSurvey",
      name : "base_skills.survey",
      type : "number"
    },
    {
      label: "BITD.SkillsTinker",
      name : "base_skills.tinker",
      type : "number"
    },
    {
      label: "BITD.SkillsFinesse",
      name : "base_skills.finesse",
      type : "number"
    },
    {
      label: "BITD.SkillsProwl",
      name : "base_skills.prowl",
      type : "number"
    },
    {
      label: "BITD.SkillsSkirmish",
      name : "base_skills.skirmish",
      type : "number"
    },
    {
      label: "BITD.SkillsWreck",
      name : "base_skills.wreck",
      type : "number"
    },
    {
      label: "BITD.SkillsAttune",
      name : "base_skills.attune",
      type : "number"
    },
    {
      label: "BITD.SkillsCommand",
      name : "base_skills.command",
      type : "number"
    },
    {
      label: "BITD.SkillsConsort",
      name : "base_skills.consort",
      type : "number"
    },
    {
      label: "BITD.SkillsSway",
      name : "base_skills.sway",
      type : "number"
    }










  ]

    // "templates": ["default", "logic", "activatedEffect"],
    // "experience_clues": [],
    // "base_skills": {
    //   "hunt": [0],
    //   "study": [0],
    //   "survey": [0],
    //   "tinker": [0],
    //   "finesse": [0],
    //   "prowl": [0],
    //   "skirmish": [0],
    //   "wreck": [0],
    //   "attune": [0],
    //   "command": [0],
    //   "consort": [0],
    //   "sway": [0]
    // }
  

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
    // console.log(this.item);
    let superData = await super.getData();
    let sheetData = superData.data;
    sheetData.isGM = game.user.isGM;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;

    return sheetData;
  }

}
