import { BladesSheet } from "../../../systems/blades-in-the-dark/module/blades-sheet.js";
import { BladesActiveEffect } from "../../../systems/blades-in-the-dark/module/blades-active-effect.js";
import { Utils, MODULE_ID } from "./utils.js";
import {queueUpdate} from "./lib/update-queue.js";

// import { migrateWorld } from "../../../systems/blades-in-the-dark/module/migration.js";

/**
 * Pure chaos
 * @extends {BladesSheet}
 */
export class BladesAlternateActorSheet extends BladesSheet {
  // playbookChangeOptions = {};
  coins_open = false;
  harm_open = false;
  load_open = false;

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

  /** @override **/
  async _onDropActor(event, droppedActor){
    await super._onDropActor(event, droppedActor);
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
    await this.handleDrop(event, droppedActor);
  }

  /** @override **/
  async handleDrop(event, droppedEntity){
    // console.log(await Utils.modifiedFromPlaybookDefault(this.actor));
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
        // just let Foundry do its thing
        break;
      case "ability":
        // just let Foundry do its thing
        break;
      case "class":
        // let d = new Dialog({
        //   title: game.i18n.localize("bitd-alt.SwitchPlaybook"),
        //   content:  `<h3>This will reset your owned abilities, skill points, and acquaintances. Do you wish to continue?`,
        //   buttons: {
        //     ok: {
        //       icon: "<i class='fas fa-check'></i>",
        //       label: game.i18n.localize("bitd-alt.Ok"),
        //       callback: async (html)=> {
        //         await this.switchPlaybook(droppedEntityFull);
        //       }
        //     },
        //     cancel: {
        //       icon: "<i class='fas fa-times'></i>",
        //       label: game.i18n.localize("bitd-alt.Cancel"),
        //       callback: ()=> close()
        //     }
        //   },
        //   close: (html) => {
        //   }
        // }, {classes:["add-existing-dialog"], width: "650"});
        // d.render(true);
         await this.switchPlaybook(droppedEntityFull);
        break ;
      default:
        // await this.actor.setUniqueDroppedItem(droppedEntityFull);
        // await this.onDroppedDistinctItem(droppedEntityFull);
        break;
    }
  }

  async switchToPlaybookAcquaintances(selected_playbook){
    let all_acquaintances = await Utils.getSourcedItemsByType('npc');
    let playbook_acquaintances = all_acquaintances.filter(item => item.data.data.associated_class === selected_playbook.data.name);
    let current_acquaintances = this.actor.data.data.acquaintances;
    let neutral_acquaintances = current_acquaintances.filter(acq => acq.standing === "neutral");
    await Utils.removeAcquaintanceArray(this.actor, neutral_acquaintances);
    await Utils.addAcquaintanceArray(this.actor, playbook_acquaintances);
  }

  async switchPlaybook(newPlaybookItem){
    // show confirmation (ask for items to replace) - not doing this. can't be bothered. sry.
    // remove old playbook (done automatically somewhere else. tbh I don't know where)
    // add abilities - not adding. virtual!
    // add items - virtual!
    // add acquaintances - should be virtual?

    await this.switchToPlaybookAcquaintances(newPlaybookItem);
    await this.setPlaybookAttributes(newPlaybookItem);
    // return newPlaybookItem;
    // set skills
  }

  async generateAddExistingItemDialog(item_type){
    let all_items = await Utils.getSourcedItemsByType(item_type);
    all_items = Utils.filterItemsForDuplicatesOnActor(all_items, item_type, this.actor, true);
    let grouped_items = {};

    let items_html = '<div class="items-list">';
    all_items = all_items.filter(i => !i.name.includes("Veteran"));
    let sorted_grouped_items = Utils.groupItemsByClass(all_items);

    for (const [itemclass, group] of Object.entries(sorted_grouped_items)) {
      items_html += `<div class="item-group"><header>${itemclass}</header>`;
      for (const item of group) {
        let trimmedname = Utils.trimClassFromName(item.name);
        let description = item.data.data.description.replace(/"/g, '&quot;');
        items_html += `
            <div class="item-block farts">
              <input type="checkbox" id="character-${this.actor.id}-${item_type}add-${item.id}" data-${item_type}-id="${item.id}" >
              <label for="character-${this.actor.id}-${item_type}add-${item.id}" title="${description}" class="hover-term">${trimmedname}</label>
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
          label: game.i18n.localize("bitd-alt.Cancel"),
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
      name: game.i18n.localize("bitd-alt.DeleteItem"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        let traumaToDisable = element.data("trauma");
        let traumaUpdateObject = this.actor.data.data.trauma.list;
        traumaUpdateObject[traumaToDisable.toLowerCase()] = false;
        // let index = traumaUpdateObject.indexOf(traumaToDisable.toLowerCase());
        // traumaUpdateObject.splice(index, 1);
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
        Utils.removeAcquaintance(this.actor, element.data("acquaintance"));
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
    // console.log(new_ability);
    await new_ability.setFlag(MODULE_ID, "custom_ability", true);

    return new_ability;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    let data = await super.getData();
    data.editable = this.options.editable;
    data.isGM = game.user.isGM;
    const actorData = data.data;
    data.actor = actorData;
    data.data = actorData.data;
    data.coins_open = this.coins_open;
    data.harm_open = this.harm_open;
    data.load_open = this.load_open;

    // Prepare active effects
    data.effects = BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects);
    let trauma_array = [];
    let trauma_object = {};

    if(Array.isArray(data.data.trauma.list)){
      trauma_object = Utils.convertArrayToBooleanObject(data.data.trauma.list);
      trauma_object = expandObject({"data.trauma.list": trauma_object});
      await this.actor.update(trauma_object);
    }
    trauma_array = Utils.convertBooleanObjectToArray(data.data.trauma.list);

    data.trauma_array = trauma_array;
    data.trauma_count = trauma_array.length;
    // data.acquaintances_array = this.getAcquaintances();

    // @todo - fix this. display heritage, background, and vice based on owned objects (original sheet style) or stored string, with priority given to string if not empty and not default value
    data.heritage = data.data.heritage != "" && data.data.heritage != "Heritage" ? data.data.heritage : (Utils.getOwnedObjectByType(this.actor, "heritage") ? Utils.getOwnedObjectByType(this.actor, "heritage").name : "");
    data.background = data.data.background != "" && data.data.background != "Background" ? data.data.background : (Utils.getOwnedObjectByType(this.actor, "background") ? Utils.getOwnedObjectByType(this.actor, "background").name : "");
    data.vice = data.data.vice != "" && data.data.vice != "Vice" ? data.data.vice : (Utils.getOwnedObjectByType(this.actor, "vice") ? Utils.getOwnedObjectByType(this.actor, "vice").name : "");

    data.load_levels = {"BITD.Light":"BITD.Light", "BITD.Normal":"BITD.Normal", "BITD.Heavy":"BITD.Heavy"};

    let owned_playbooks = this.actor.items.filter(item => item.type == "class");
    if(owned_playbooks.length == 1){
      console.log("One playbook selected. Doing the thing.");
      data.selected_playbook = owned_playbooks[0];
    }
    else{
      console.log("Wrong number of playbooks on character " + this.actor.name);
    }



    let combined_abilities_list = [];
    let all_generic_items = [];
    let my_items = [];
    if(data.selected_playbook){
      combined_abilities_list = await Utils.getVirtualListOfItems("ability", data, true, data.selected_playbook.name, false, true);
      my_items = await Utils.getVirtualListOfItems("item", data, true, data.selected_playbook.name, true, true);

      data.selected_playbook_full = data.selected_playbook;
      data.selected_playbook_full = await Utils.getItemByType("class", data.selected_playbook.id);
    }
    else{
      combined_abilities_list = await Utils.getVirtualListOfItems("ability", data, true, "", false, true);

      my_items = await Utils.getVirtualListOfItems("item", data, true, "noclassselectod", true, true);
    }

    all_generic_items = await Utils.getVirtualListOfItems("item", data, true, "", false, false);
    data.available_playbook_abilities = combined_abilities_list;

    let armor = all_generic_items.findSplice(item => item.name.includes("Armor"));
    let heavy = all_generic_items.findSplice(item => item.name.includes("Heavy"));
    all_generic_items.sort((a, b) => {
      if(a.name === b.name){ return 0; }
      return Utils.trimClassFromName(a.name) > Utils.trimClassFromName(b.name) ? 1 : -1;
    });

    if(armor){
      all_generic_items.splice(0, 0, armor);
    }
    if(heavy){
      all_generic_items.splice(1, 0, heavy);
    }

    data.generic_items = all_generic_items;
    data.my_items = my_items;

    let my_abilities = data.items.filter(ability => ability.type == "ability");
    data.my_abilities = my_abilities;

    // Calculate Load
    let loadout = 0;
    let equipped = await this.actor.getFlag('bitd-alternate-sheets', 'equipped-items');
    if(equipped){
      for(const i of equipped){
        loadout += parseInt(i.load);
      }
    }

    // Encumbrance Levels
    // let load_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal","BITD.Heavy","BITD.Encumbered",
    //   "BITD.Encumbered","BITD.Encumbered","BITD.OverMax"];
    // let mule_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal",
    //   "BITD.Heavy","BITD.Encumbered","BITD.OverMax"];
    // let mule_present=0;

    //Sanity Check
    if (loadout < 0) {
      loadout = 0;
    }
    if (loadout > 10) {
      loadout = 10;
    }

    data.loadout = loadout;

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
        data.max_load = data.data.base_max_load + 5;
        break;
    }

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

  _onRadioToggle(event){
    let type = event.target.tagName.toLowerCase();
    let target = event.target;
    if(type == "label"){
      let labelID = $(target).attr('for');
      target = $(`#${labelID}`).get(0);
    }
    if(target.checked){
      //find the next lowest-value input with the same name and click that one instead
      let name = target.name;
      let value = parseInt(target.value) - 1;
      this.element.find(`input[name="${name}"][value="${value}"]`).trigger('click');
    }
    else{
      //trigger the click on this one
      $(target).trigger('click');
    }
  }



  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    this.addTermTooltips(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // new ContextMenu(html, ".item-block", this.itemContextMenu);
    // new ContextMenu(html, ".ability-block", this.abilityContextMenu);
    new ContextMenu(html, ".context-items > span", this.itemListContextMenu);
    new ContextMenu(html, ".item-list-add", this.itemListContextMenu, {eventName : "click"});
    new ContextMenu(html, ".context-abilities", this.abilityListContextMenu);
    new ContextMenu(html, ".ability-add-popup", this.abilityListContextMenu, {eventName : "click"});
    new ContextMenu(html, ".trauma-item", this.traumaListContextMenu);
    new ContextMenu(html, ".acquaintance", this.acquaintanceContextMenu);


    html.find("input.radio-toggle, label.radio-toggle").click(e => e.preventDefault());
    html.find("input.radio-toggle, label.radio-toggle").mousedown(e => {
      this._onRadioToggle(e);
    });

    html.find('.inline-input').on('input', async ev => {
      let input = ev.currentTarget.previousSibling;
      input.value = ev.currentTarget.innerText;
    })

    html.find('.inline-input').on('blur', async ev => {
      let input = ev.currentTarget.previousSibling;
      $(input).change();
    })

    html.find('.debug-toggle').click(async ev => {
      let debug = await this.actor.getFlag('bitd-alternate-sheets', 'show-debug');
      await this.actor.setFlag('bitd-alternate-sheets', 'show-debug', !debug);
    });

    /* Removed drop-down in favor of drag/drop playbooks. Hopefully more simple.
    html.find('.dropdown.playbook-select').change(async ev=>{
      let existing_playbooks = this.actor.items.filter(item=>item.type == "class");
      existing_playbooks = existing_playbooks.map(pb => pb.id);
      let new_playbook = await Utils.getItemByType('class', ev.target.value);
      if(new_playbook){
        //deleting old playbooks is done automatically ... somewhere else
        // await this.actor.deleteEmbeddedDocuments('Item', existing_playbooks);
        await this.actor.createEmbeddedDocuments('Item', [new_playbook.data]);
      }
    });
     */

    // Update Inventory Item
    html.find('.item-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let itemId = ev.currentTarget.closest(".item-block").dataset.itemId;
      let item = this.actor.items.get(itemId);
      if(item && !item.data.virtual){
        item.sheet.render(true);
      }
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
        await this.actor.setFlag('bitd-alternate-sheets', 'allow-edit', false);
      } else {
        await this.actor.setFlag('bitd-alternate-sheets', 'allow-edit', true);
      }
    });

    html.find('.item-block .main-checkbox').change(ev => {
      let checkbox = ev.target;
      let itemId = checkbox.closest(".item-block").dataset.itemId;
      let item = this.actor.items.get(itemId);
      if(item){
        return item.update({data: {equipped : checkbox.checked}});
      }
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

    html.find('.item-block .main-checkbox').change(async ev => {
      let checkbox = ev.target;
      let item_id = checkbox.closest(".item-block").dataset.itemId;
      await Utils.toggleOwnership(checkbox.checked, this.actor, 'item', item_id);
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
          newStanding = "rival";
          break;
        case "rival":
          newStanding = "neutral";
          break;
        case "neutral":
          newStanding = "friend";
          break;
      }
      clickedAcq.standing = newStanding;
      acquaintances.splice(clickedAcqIdx, 1, clickedAcq);
      this.actor.update({data: {acquaintances : acquaintances}});
    });

    html.find('.coins-box').click(async ev => {
      this.setLocalProp("coins_open", !this.coins_open);
    });

    html.find('.coins-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.harm-box').click(ev => {
      this.setLocalProp("harm_open", !this.harm_open);
    });

    html.find('.harm-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.load-box').click(ev => {
      this.setLocalProp("load_open", !this.load_open);
    });

    html.find('.load-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.add_trauma').click(async ev => {
      // let data = await this.getData();
      let actorTraumaList = [];
      if(Array.isArray(this.actor.data.data.trauma.list)){
        actorTraumaList = this.actor.data.data.trauma.list;
      }
      else{
        actorTraumaList = Utils.convertBooleanObjectToArray(this.actor.data.data.trauma.list);
      }
      let allTraumas = this.actor.data.data.trauma.options;
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
              newTraumaListValue.data.trauma.list[newTrauma] = true;
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
  }

  /* -------------------------------------------- */

  async setPlaybookAttributes(newPlaybookItem) {
    let attributes = await Utils.getStartingAttributes(newPlaybookItem.name);
    let newAttributeData = {data:{}};
    newAttributeData.data.attributes = attributes;
    // this damned issue. For some reason exp and exp_max were getting grabbed as numbers instead of strings, which breaks the multiboxes helper somehow?
    Object.keys(newAttributeData.data.attributes).map((key, index)=>{
      newAttributeData.data.attributes[key].exp = newAttributeData.data.attributes[key].exp.toString();
      newAttributeData.data.attributes[key].exp_max = newAttributeData.data.attributes[key].exp_max.toString();
    });
    queueUpdate(()=> this.actor.update(newAttributeData));
  }
}
