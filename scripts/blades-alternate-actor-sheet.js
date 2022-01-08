import { BladesSheet } from "../../../systems/blades-in-the-dark/module/blades-sheet.js";
import { BladesActiveEffect } from "../../../systems/blades-in-the-dark/module/blades-active-effect.js";
import { Utils, MODULE_ID } from "./utils.js";
import {queueUpdate} from "./lib/update-queue.js";

// import { migrateWorld } from "../../../systems/blades-in-the-dark/module/migration.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BladesSheet}
 */
export class BladesAlternateActorSheet extends BladesSheet {
  playbookChangeOptions = {};

  // async render(args){
  //   // await this.prepExistingActorForSheet();
  //   return super.render(args);
  // }

  async prepActorForSheet(){
    //make sure a playbook is selected (take from owned class item if one exists)
    //new actor with sheet
    //switching to sheet
    await this.ensureActorHasPlaybook(this.actor);
    //add missing playbook abilities (and mark non-missing ones as purchased)
    //mark playbook default items as purchased
    //add missing playbook items (and mark non-missing ones as purchased)
    //add missing generic items (and mark non-missing ones as purchased)
    //add playbook npcs
    //add vice, heritage, and background items -- this could be done in getData, just render whatever exists, with string getting priority
  }


  async ensureActorHasPlaybook(){
    let actor = this.actor;
    //check to see if the playbook field is filled
    if (typeof actor.data.data.playbook === "undefined" || actor.data.data.playbook === ""){
      console.log("No playbook set");
      let old_playbook = actor.data.items.find(item => {
        return item.type === "class";
      });
      console.log("Old playbook:", old_playbook);
      if(typeof old_playbook != "undefined"){
        let updateData = {};
        let playbooks_content = await BladesHelpers.getSourcedItemsByType("class");
        updateData[`data.playbook`] = playbooks_content.find(pb => pb.name === old_playbook.name)._id;
        // let existing_abilities = actor.items.filter(item => item.type === "ability");
        // for (const existingAbility of existing_abilities) {
        //   await existingAbility.update({data : { purchased : true } });
        // }
        // await actor.addPlaybookAbilities(old_playbook.name);
        //
        // // Migrate character playbook items
        // await actor.addPlaybookItems(old_playbook.name);
        //
        // // Migrate character generic items
        // await actor.addGenericItems();
        //
        // // Add default character NPCs
        // await actor.addPlaybookAcquaintances(old_playbook.name);
        // if (typeof actor.data.data.heritage === "undefined" || actor.data.data.heritage === "" || actor.data.data.heritage === "Heritage") {
        //   let old_heritage = actor.data.items.find(item => {
        //     return item.type === "heritage";
        //   });
        //   if (typeof old_heritage != "undefined") {
        //     updateData[`data.heritage`] = old_heritage.name;
        //   }
        // }
        //
        // if (typeof actor.data.data.background === "undefined" || actor.data.data.background === "" || actor.data.data.background === "Background") {
        //   let old_background = actor.data.items.find(item => {
        //     return item.type === "background";
        //   });
        //   if (typeof old_background != "undefined") {
        //     updateData[`data.background`] = old_background.name;
        //   }
        // }
        //
        // if (typeof actor.data.data.vice === "undefined" || actor.data.data.vice === "" || actor.data.data.vice === "Vice") {
        //   let old_vice = actor.data.items.find(item => {
        //     return item.type === "vice";
        //   });
        //   if (typeof old_vice != "undefined") {
        //     updateData[`data.vice`] = old_vice.name;
        //   }
        // }

      }
      else{
        ui.notifications.info(`No playbook/class item found. Please select a class manually via the dropdown`, {permanent: true});
      }
    }
  }


  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["blades-alt", "sheet", "pc", "actor"],
  	  template: "modules/bitd-alternate-sheets/templates/actor-sheet.html",
      width: 800,
      height: 1200,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "playbook"}]
    });
  }

  /** @override **/
  async _onDropItem(event, droppedItem) {
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
	  await this.handleDrop(event, droppedItem);
    return super._onDropItem(event, droppedItem);
  }

  /** @override **/
  async _onDropActor(event, droppedActor){
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
    await this.handleDrop(event, droppedActor);
    return super._onDropActor(event, droppedActor);
  }

  /** @override **/
  async handleDrop(event, droppedEntity){
    let droppedEntityFull;
    //if the dropped entity is from a compendium, get the full entity from there
    if("pack" in droppedEntity){
      droppedEntityFull = await game.packs.get(droppedEntity.pack).getDocument(droppedEntity.id);
    }
    //otherwise get it from the world
    else{
      switch(droppedEntity.type){
        case "Actor":
          droppedEntityFull = game.actors.find(actor=> actor.id === droppedEntity.id);
          break;
        case "Item":
          droppedEntityFull = game.items.find(actor=> actor.id === droppedEntity.id);
          break;
      }
    }
    switch (droppedEntityFull.type) {
      case "npc":
        await Utils.addAcquaintance(this.actor, droppedEntityFull);
        // await this.actor.addAcquaintance(droppedEntityFull);
        break;
      case "item":
        break;
      case "ability":
        break;
      default:
        // await this.actor.setUniqueDroppedItem(droppedEntityFull);
        // await this.onDroppedDistinctItem(droppedEntityFull);
        break;
    }
  }

  async generateAddExistingItemDialog(item_type){
    let all_items = await Utils.getSourcedItemsByType(item_type);
    all_items = Utils.filterItemsForDuplicatesOnActor(all_items, item_type, this.actor, true);
    let grouped_items = {};

    let items_html = '<div class="items-list">';
    let sorted_grouped_items = Utils.groupItemsByClass(all_items);

    for (const [itemclass, group] of Object.entries(sorted_grouped_items)) {
      items_html += `<div class="item-group"><header>${itemclass}</header>`;
      for (const item of group) {
        let trimmedname = Utils.trimClassFromName(item.name);
        items_html += `
            <div class="item-block">
              <input type="checkbox" id="character-${this.actor.id}-${item_type}add-${item.id}" data-${item_type}-id="${item.id}" >
              <label for="character-${this.actor.id}-${item_type}add-${item.id}" title="${item.data.data.description}" class="hover-term">${trimmedname}</label>
            </div>
          `;
      }
      items_html += '</div>';
    }

    items_html += '</div>';

    let d = new Dialog({
      title: game.i18n.localize("BITD.AddExisting" + Utils.capitalizeFirstLetter(item_type)),
      content:  `<h3>${game.i18n.localize("BITD.SelectToAdd" + Utils.capitalizeFirstLetter(item_type))}</h3>
                    ${items_html}
                    `,
      buttons: {
        add: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("BITD.Add"),
          callback: async (html)=> {
            let itemInputs = html.find("input:checked");
            let items = [];
            for (const itemelement of itemInputs) {
              let item = await Utils.getItemByType(item_type, itemelement.dataset[item_type + "Id"]);
              items.push(item.data);
            }
            this.actor.createEmbeddedDocuments("Item", items);
          }
        },
        cancel: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize("BITD.Cancel"),
          callback: ()=> close()
        }
      },
      render: (html) => {
        this.addTermTooltips(html);
      },
      close: (html) => {

      }
    }, {classes:["add-existing-dialog"], width: "650"});
    d.render(true);
  }


  itemContextMenu = [
    {
      name: game.i18n.localize("BITD.TitleDeleteItem"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.deleteEmbeddedDocuments("Item", [element.data("item-id")]);
      }
    }
  ];

  itemListContextMenu = [
    {
      name: game.i18n.localize("bitd-alt.AddNewItem"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.addNewItem();
      }
    },
    {
      name: game.i18n.localize("bitd-alt.AddExistingItem"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.generateAddExistingItemDialog("item", this.actor);
      }
    }
  ];

  traumaListContextMenu = [
    {
      name: game.i18n.localize("BITD.DeleteTrauma"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        let traumaToDisable = element.data("trauma");
        let traumaUpdateObject = this.actor.data.data.trauma.list;
        let index = traumaUpdateObject.indexOf(traumaToDisable.toLowerCase());
        traumaUpdateObject.splice(index, 1);
        queueUpdate(()=> this.actor.update({data:{trauma:{list: traumaUpdateObject}}}));
      }
    }
  ];

  abilityContextMenu = [
    {
      name: game.i18n.localize("bitd-alt.DeleteAbility"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.deleteEmbeddedDocuments("Item", [element.data("ability-id")]);
      }
    }
  ];

  acquaintanceContextMenu = [
    {
      name: game.i18n.localize("bitd-alt.DeleteItem"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.removeAcquaintance(element.data("acquaintance"));
        // this.actor.deleteEmbeddedDocuments("Item", [element.data("ability-id")]);
      }
    }
  ];


  abilityListContextMenu = [
    {
      name: game.i18n.localize("bitd-alt.AddNewAbility"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.addNewAbility();
      }
    },
    {
      name: game.i18n.localize("bitd-alt.AddExistingAbility"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.generateAddExistingItemDialog("ability", this.actor);
      }
    }
  ];

  async addNewItem(){
      let playbook_name = "custom";
      let item_data_model = game.system.model.Item.item;
      let new_item_data = { name : "New Item", type : "item", data : {...item_data_model} };
      new_item_data.data.class = "custom";
      new_item_data.data.load = 1;

      let new_item = await this.actor.createEmbeddedDocuments("Item", [new_item_data], {renderSheet : true});
      return new_item;
  }

  async addNewAbility(){
    let playbook_name = "custom";
    let ability_data_model = game.system.model.Item.ability;
    let new_ability_data = { name : "New Ability", type : "ability", data : {...ability_data_model} };
    new_ability_data.data.class = "custom";

    let new_abilities = await this.actor.createEmbeddedDocuments("Item", [new_ability_data], {renderSheet : true});
    let new_ability = new_abilities[0];
    console.log(new_ability);
    await new_ability.setFlag(MODULE_ID, "custom_ability", true);

    return new_ability;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    let data = super.getData();
    data.editable = this.options.editable;
    data.isGM = game.user.isGM;
    const actorData = data.data;
    data.actor = actorData;
    data.data = actorData.data;

    // Prepare active effects
    data.effects = BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects);

    // Calculate Load
    let loadout = 0;
    data.items.forEach(i => {
      loadout += (i.type === "item" && i.data.equipped) ? parseInt(i.data.load) : 0});
    data.data.loadout = loadout;

    // Encumbrance Levels
    let load_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal","BITD.Heavy","BITD.Encumbered",
			"BITD.Encumbered","BITD.Encumbered","BITD.OverMax"];
    let mule_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal",
			"BITD.Heavy","BITD.Encumbered","BITD.OverMax"];
    let mule_present=0;

    //Sanity Check
    if (loadout < 0) {
      loadout = 0;
    }
    if (loadout > 10) {
      loadout = 10;
    }

    switch (data.data.selected_load_level){
      case "BITD.Light":
        data.max_load = data.data.base_max_load + 3;
        break;
      case "BITD.Normal":
        data.max_load = data.data.base_max_load + 5;
        break;
      case "BITD.Heavy":
        data.max_load = data.data.base_max_load + 6;
        break;
      default:
        data.data.selected_load_level = "BITD.Normal";
        data.max_load = data.base_max_load + 5;
        break;
    }

    // @todo - fix this. display heritage, background, and vice based on owned objects (original sheet style) or stored string, with priority given to string if not empty and not default value
    // data.heritage = data.data.heritage != "" && data.data.heritage != "Heritage" ? data.data.heritage : (Utils.getOwnedObjectByType(this.actor, "heritage") ? Utils.getOwnedObjectByType(this.actor, "heritage").name : "");
    // data.background = data.data.background != "" && data.data.background != "Background" ? data.data.background : (Utils.getOwnedObjectByType(this.actor, "background") ? Utils.getOwnedObjectByType(this.actor, "background").name : "");
    // data.vice = data.data.vice != "" && data.data.vice != "Vice" ? data.data.vice : (Utils.getOwnedObjectByType(this.actor, "vice") ? Utils.getOwnedObjectByType(this.actor, "vice").name : "");

    data.load_levels = {"BITD.Light":"BITD.Light", "BITD.Normal":"BITD.Normal", "BITD.Heavy":"BITD.Heavy"};

    //load up playbook options/data for playbook select
    // data.playbook_options = await game.packs.get("blades-in-the-dark.class").getIndex();
    data.playbook_options = await Utils.getSourcedItemsByType("class");
    data.playbook_select = Utils.prepIndexForHelper(data.playbook_options);
    // data.playbook_select["0"] = "Playbook";
    let owned_playbooks = this.actor.items.filter(item => item.type == "class");
    if(owned_playbooks.length > 1){
      await this.handleTooManyPlaybookItems();
    }
    else if(owned_playbooks.length < 1){
      data.owned_playbook = '0';
      console.log("no playbooks");
    }
    else if(owned_playbooks.length == 1){
      data.selected_playbook = data.playbook_options.find(pb => pb.name == owned_playbooks[0].name)
      console.log("One playbook: ", data.selected_playbook);
    }


    let all_abilities = await Utils.getSourcedItemsByType("ability");

    if(data.selected_playbook){
      data.selected_playbook_full = await Utils.getItemByType("class", data.selected_playbook.id);
      if(typeof data.selected_playbook_full != "undefined"){
        data.selected_playbook_name = data.selected_playbook_full.name;
        data.selected_playbook_description = data.selected_playbook_full.data.data.description;
        let available_abilities = all_abilities.filter(item => item.data.data.class == data.selected_playbook_name);
        available_abilities = available_abilities.map(item => item.data);
        // let custom_abilities = data.items.filter(item => {
        //   return item.flags[MODULE_ID]?.custom_ability && item.type == "ability";
        // });
        let owned_abilities = this.actor.items.filter(item => item.type == "ability");
        // available_abilities = available_abilities.concat(custom_abilities);
        owned_abilities.forEach(ability => {
          if(!available_abilities.some(avail_ab => ability.name == avail_ab.name)){
            available_abilities.push(ability.data);
          }
        });

        //hide the playbook abbreviations for display

        data.available_abilities = available_abilities.sort((a, b) => {
          if(a.name.includes("Veteran") || b.data.class_default){
            return 1;
          }
          if(b.name.includes("Veteran") || a.data.class_default){
            return -1;
          }
          if(a.name == b.name){ return 0; }
          return Utils.trimClassFromName(a.name) > Utils.trimClassFromName(b.name) ? 1 : -1;
        });
      }
    }

    let all_sourced_items = await Utils.getSourcedItemsByType("item")
    // let all_playbook_items = all_sourced_items.filter()
    // let my_abilities = data.items.filter(ability => ability.type == "ability" && ability.data.purchased);
    // data.my_abilities = my_abilities;

    // let playbook_items = data.items.filter(item => item.type == "item" && item.data.class == data.selected_playbook_name);
    // let my_items = data.items.filter(item => item.type == "item" && item.data.class != "");

    //hide the playbook abbreviations for display
    // data.my_items = my_items.map(item => {
    //   item.name = Utils.trimClassFromName(item.name);
    //   return item;
    // });
    // data.generic_items = data.items.filter(item => item.type == "item" && item.data.class == "");

    // data.ownedTraumas = [];
    // if(data.data.trauma.list.length > 0){
    //   for (const trauma in data.data.trauma.list){
    //     console.log(trauma);
    //     if(data.data.trauma.list[trauma]){
    //       data.ownedTraumas.push(trauma.charAt(0).toUpperCase() + trauma.slice(1));
    //     }
    //   }
    // }

    return data;
  }


  addTermTooltips(html){
    html.find('.hover-term').hover(function(e){ // Hover event
      var titleText;
      if(e.target.title == ""){
        titleText = BladesLookup.getTerm($(this).text());
      }
      else{
        titleText = e.target.title;
      }
      $(this).data('tiptext', titleText).removeAttr('title');
      $('<p class="bitd-alt tooltip"></p>').text(titleText).appendTo('body').css('top', (e.pageY - 10) + 'px').css('left', (e.pageX + 20) + 'px').fadeIn('fast');
    }, function(){ // Hover off event
      $(this).attr('title', $(this).data('tiptext'));
      $('.tooltip').remove();
    }).mousemove(function(e){ // Mouse move event
      $('.tooltip').css('top', (e.pageY - 10) + 'px').css('left', (e.pageX + 20) + 'px');
    });
  }

  async showPlaybookChangeDialog(changed){
    let modifications = await this.actor.modifiedFromPlaybookDefault(this.actor.data.data.playbook);
    return new Promise(async (resolve, reject)=>{
      if(modifications){
        let abilitiesToKeepOptions = {name : "abilities", value:"none", options : {all: "Keep all Abilities", custom: "Keep added abilities", owned: "Keep owned abilities", ghost: `Keep "Ghost" abilities`, none: "Replace all"}};
        let acquaintancesToKeepOptions = {name : "acquaintances", value:"none", options : {all: "All contacts", friendsrivals: "Keep only friends and rivals", custom: "Keep any added contacts", both: "Keep added contacts and friends/rivals", none: "Replace all"}};
        let keepSkillPointsOptions = {name : "skillpoints", value:"reset", options : {keep: "Keep current skill points", reset: "Reset to new playbook starting skill points"}};
        let playbookItemsToKeepOptions = {name : "playbookitems", value: "none", options: {all: "Keep all playbook items", custom: "Keep added items", none: "Replace all"}};
        let selectTemplate = Handlebars.compile(`<select name="{{name}}" class="pb-migrate-options">{{selectOptions options selected=value}}</select>`)
        let dialogContent = `
          <p>Changes have been made to this character that would be overwritten by a playbook switch. Please select how you'd like to handle this data and click "Ok", or click "Cancel" to cancel this change.</p>
          <p>Note that this process only uses the Item, Ability, Playbook, and NPC compendia to decide what is "default". If you have created entities outside the relevant compendia and added them to your character, those items will be considered "custom" and removed unless you choose to save.</p>
          <h2>Changes to keep</h2>
          <div ${modifications.newAbilities || modifications.ownedAbilities ? "" : "hidden"}>
            <label>Abilities to keep</label>
            ${selectTemplate(abilitiesToKeepOptions)}
          </div>
          <div ${modifications.addedItems ? "" : "hidden"}>
            <label>Playbook Items</label>
            ${selectTemplate(playbookItemsToKeepOptions)}
          </div>
          <div ${modifications.skillsChanged ? "" : "hidden"}>
            <label>Skill Points</label>
            ${selectTemplate(keepSkillPointsOptions)}
          </div>
          <div ${modifications.acquaintanceList || modifications.relationships ? "" : "hidden"}>
            <label>Acquaintances</label>
            ${selectTemplate(acquaintancesToKeepOptions)}
          </div>
        `;

        let pbConfirm = new Dialog({
          title: `Change playbook to ${await Utils.getPlaybookName(changed.data.playbook)}?`,
          content: dialogContent,
          buttons:{
            ok:{
              icon: '<i class="fas fa-check"></i>',
              label: 'Ok',
              callback: async (html)=> {
                let selects = html.find("select.pb-migrate-options");
                let selectedOptions = {};
                for (const select of $.makeArray(selects)) {
                  selectedOptions[select.name] = select.value;
                };
                resolve(selectedOptions);
              }
            },
            cancel:{
              icon: '<i class="fas fa-times"></i>',
              label: 'Cancel',
              callback: ()=> {
                reject();
              }
            }
          },
          close: () => {reject();}
        });
        pbConfirm.render(true);
      }
      else{
        let selectedOptions = {
          "abilities": "none",
          "playbookitems": "none",
          "skillpoints": "reset",
          "acquaintances": "none"
        };
        resolve(selectedOptions);
      }
    });
  }


  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    this.addTermTooltips(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    new ContextMenu(html, ".item-block", this.itemContextMenu);
    new ContextMenu(html, ".ability-block", this.abilityContextMenu);
    new ContextMenu(html, ".context-items > span", this.itemListContextMenu);
    new ContextMenu(html, ".item-list-add", this.itemListContextMenu, {eventName : "click"});
    new ContextMenu(html, ".context-abilities", this.abilityListContextMenu);
    new ContextMenu(html, ".ability-add-popup", this.abilityListContextMenu, {eventName : "click"});
    new ContextMenu(html, ".trauma-item", this.traumaListContextMenu);
    new ContextMenu(html, ".acquaintance", this.acquaintanceContextMenu);

    // // todo - remove
    html.find('.migrate-test').click(async ev => {
      console.log("Testing world migration");
      this.actor.resetMigTest();
      await migrateWorld();
    });

    html.find('.debug-toggle').click(async ev => {
      let debug = await this.actor.getFlag('bitd-alternate-sheets', 'show-debug');
      await this.actor.setFlag('bitd-alternate-sheets', 'show-debug', !debug);
    });

    html.find('.dropdown.playbook-select').change(async ev=>{
      let existing_playbooks = this.actor.items.filter(item=>item.type == "class");
      existing_playbooks = existing_playbooks.map(pb => pb.id);
      let new_playbook = await Utils.getItemByType('class', ev.target.value);
      if(new_playbook){
        //deleting old playbooks is done automatically ... somewhere else
        // await this.actor.deleteEmbeddedDocuments('Item', existing_playbooks);
        await this.actor.createEmbeddedDocuments('Item', [new_playbook.data]);
      }
      console.log("changed");
    });

    // Update Inventory Item
    html.find('.item-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let itemId = ev.currentTarget.closest(".item-block").dataset.itemId;
      let item = this.actor.items.get(itemId);
      item.sheet.render(true);
    });

    html.find('.ability-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let abilityId = ev.currentTarget.closest(".ability-block").dataset.abilityId;
      let ability = this.actor.items.get(abilityId);
      ability.sheet.render(true);
    });

    // Delete Inventory Item -- not used in new design
    html.find('.delete-button').click( async ev => {
      const element = $(ev.currentTarget);
      await this.actor.deleteEmbeddedDocuments("Item", [element.data("id")]);
      element.slideUp(200, () => this.render(false));
    });

    html.find('.toggle-allow-edit').click(async (event) => {
      event.preventDefault();
      if(this.actor.getFlag('bitd-alternate-sheets', 'allow-edit')){
        await this.actor.unsetFlag('bitd-alternate-sheets', 'allow-edit');
      } else {
        await this.actor.setFlag('bitd-alternate-sheets', 'allow-edit', true);
      }
    });

    html.find('.item-block .main-checkbox').change(ev => {
      let checkbox = ev.target;
      let itemId = checkbox.closest(".item-block").dataset.itemId;
      let item = this.actor.items.get(itemId);
      return item.update({data: {equipped : checkbox.checked}});
    });

    html.find('.item-block .child-checkbox').click(ev => {
      let checkbox = ev.target;
      let $main = $(checkbox).siblings(".main-checkbox");
      $main.trigger('click');
    });

    html.find('.item-control.item-delete').click(async ev => {
      let item_id = ev.target.closest("div.item").dataset.itemId;
      await this.actor.deleteEmbeddedDocuments('Item', [item_id]);
    });

    html.find('.ability-block .main-checkbox').change(async ev => {
      let checkbox = ev.target;
      let ability_id = checkbox.closest(".ability-block").dataset.abilityId;
      await Utils.toggleOwnership(checkbox.checked, this.actor, 'ability', ability_id);
    });

    //this could probably be cleaner. Numbers instead of text would be fine, but not much easier, really.
    html.find('.standing-toggle').click(ev => {
      let acquaintances = this.actor.data.data.acquaintances;
      let acqId = ev.target.closest('.acquaintance').dataset.acquaintance;
      let clickedAcqIdx = acquaintances.findIndex(item => item.id == acqId);
      let clickedAcq = acquaintances[clickedAcqIdx];
      let oldStanding = clickedAcq.standing;
      let newStanding;
      switch(oldStanding){
        case "friend":
          newStanding = "neutral";
          break;
        case "rival":
          newStanding = "friend";
          break;
        case "neutral":
          newStanding = "rival";
          break;
      }
      clickedAcq.standing = newStanding;
      acquaintances.splice(clickedAcqIdx, 1, clickedAcq);
      this.actor.update({data: {acquaintances : acquaintances}});
    });

    html.find('.coins-box').click(ev => {
      //note: apparently have to do this via flag, as just adding a class doesn't help when the box get rerendered on data change. Fun. Only downside is that it will probably show the coins opening and closing for anyone else viewing the sheet, too.
      this.actor.getFlag('bitd-alternate-sheets', 'coins_open') ? this.actor.setFlag('bitd-alternate-sheets', 'coins_open', false) : this.actor.setFlag('bitd-alternate-sheets', 'coins_open', true);
    });

    html.find('.coins-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.harm-box').click(ev => {
      this.actor.getFlag('bitd-alternate-sheets', 'harm_open') ? this.actor.setFlag('bitd-alternate-sheets', 'harm_open', false) : this.actor.setFlag('bitd-alternate-sheets', 'harm_open', true);
    });

    html.find('.harm-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.load-box').click(ev => {
      this.actor.getFlag('bitd-alternate-sheets', 'load_open') ? this.actor.setFlag('bitd-alternate-sheets', 'load_open', false) : this.actor.setFlag('bitd-alternate-sheets', 'load_open', true);
    });

    html.find('.load-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.add_trauma').click(async ev => {
      console.log(this.actor.data.data.trauma);
      let actorTraumaList = this.actor.data.data.trauma.list;
      let allTraumas = this.actor.data.data.trauma.options;
      let playbookName = await Utils.getPlaybookName(this.actor.data.data.playbook);
      let unownedTraumas = [];
      for (const traumaListKey of allTraumas) {
        if(!actorTraumaList.includes(traumaListKey)){
          unownedTraumas.push(traumaListKey.charAt(0).toUpperCase() + traumaListKey.slice(1));
        }
      }

      let unownedTraumasOptions;
      unownedTraumas.forEach((trauma)=>{
        unownedTraumasOptions += `<option value=${trauma}>${game.i18n.localize("BITD.Trauma"+trauma)}</option>`;
      });
      let unownedTraumasSelect = `
        <select id="${this.actor.id}-trauma-select">
        ${unownedTraumasOptions}
        </select>
      `;
      let d = new Dialog({
        title: "Add Trauma",
        content: `Select a trauma to add:<br/>${unownedTraumasSelect}`,
        buttons: {
          add: {
            icon: "<i class='fas fa-plus'></i>",
            label: "Add",
            callback: async (html) => {
              let newTrauma = html.find(`#${this.actor.id}-trauma-select`).val().toLowerCase();
              let newTraumaListValue = {
                data:
                  {
                    trauma: this.actor.data.data.trauma
                  }
              };
              newTraumaListValue.data.trauma.list.push(newTrauma);
              await this.actor.update(newTraumaListValue);

            }
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel"
          },
        },
        render: (html) => {},
        close: (html) => {}
      });
      d.render(true);

    });

    // manage active effects
    html.find(".effect-control").click(ev => BladesActiveEffect.onManageActiveEffect(ev, this.actor));

    html.find(".toggle-expand").click(ev => {
      if(!this._element.hasClass("can-expand")){
        this.setPosition({height: 275});
        this._element.addClass("can-expand");
      }
      else{
        this.setPosition({height: "auto"});
        this._element.removeClass("can-expand");
      }
    });

    // let sheetObserver = new MutationObserver(mutationRecords => {
    //   let element = $(mutationRecords[0].target);
    //   let scrollbox = $(mutationRecords[0].target).find(".window-content").get(0);
    //   let scrollbarVisible = scrollbox.scrollHeight > scrollbox.clientHeight;
    //   if(scrollbarVisible){
    //     element.addClass("can-expand");
    //   }
    //   else{
    //     element.removeClass("can-expand");
    //   }
    // });
    // sheetObserver.observe(this._element.get(0), {childList:false, attributes:true, attributeFilter: ["style"], subtree: false});

  }

  /* -------------------------------------------- */

}
