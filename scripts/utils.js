import {BladesAlternateActorSheet} from "./blades-alternate-actor-sheet.js";
import {queueUpdate} from "./lib/update-queue.js";

export const MODULE_ID = 'bitd-alternate-sheets';

export class Utils {

  /**
   * Identifies duplicate items by type and returns a array of item ids to remove
   *
   * @param {Object} item_data
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static removeDuplicatedItemType(item_data, actor) {
    let dupe_list = [];
    let distinct_types = ["crew_reputation", "class", "vice", "background", "heritage"];
    let allowed_types = ["item"];
    let should_be_distinct = distinct_types.includes(item_data.type);
    // If the Item has the exact same name - remove it from list.
    // Remove Duplicate items from the array.
    actor.items.forEach( i => {
      let has_double = (item_data.type === i.data.type);
      if ( ( ( i.name === item_data.name ) || ( should_be_distinct && has_double ) ) && !( allowed_types.includes( item_data.type ) ) && ( item_data.id !== i.id ) ) {
        dupe_list.push (i.id);
      }
    });

    return dupe_list;
  }

  static trimClassFromName(name){
    return name.replace(/\([^)]*\)\ /, "");
  }

  static capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  static isUsingAltSheets(actor){
    return actor._sheet instanceof BladesAlternateActorSheet;
  }

  static isEffectSuppressed(e){
    let isSuppressed = false;
    if ( e.data.disabled || (e.parent.documentName !== "Actor") ) return true;
    const [parentType, parentId, documentType, documentId] = e.data.origin?.split(".") ?? [];
    if ( (parentType !== "Actor") || (parentId !== e.parent.id) || (documentType !== "Item") ) return true;
    const item = e.parent.items.get(documentId);
    if ( !item ) return true;
    const itemData = item.data;
    // If an item is not equipped, or it is equipped but it requires attunement and is not attuned, then disable any
    // Active Effects that might have originated from it.
    //
    isSuppressed = itemData.type !== "class" && itemData.data.equipped !== true && itemData.data.purchased !== true;
    return isSuppressed;
  }

  /**
   * Compares a list of items to those already present on the provided actor and returns a deduped array
   *
   * @param {Object} item_data
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static filterItemsForDuplicatesOnActor(item_list, type, actor, check_trimmed_name = false) {
    let deduped_list = [];
    let existing_items = actor.items.filter(i=> i.type === type);

    // If the Item has the exact same name - remove it from list.
    // Remove Duplicate items from the array.
    deduped_list = item_list.filter(new_item => {
      if(check_trimmed_name){
        return !existing_items.some(existing => this.trimClassFromName(new_item.name) === this.trimClassFromName(existing.name));
      }
      else{
        return !existing_items.some(existing => new_item.name === existing.name);
      }
    })

    return deduped_list;
  }

  /**
   * Returns a list of owned items with the same type as the passed item
   *
   * @param {Object} item_data the item being added
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static getExistingItemsByType(item_data, actor) {
    let ownedItemsOfSameType = actor.items.filter(i=> i.type === item_data.type);
    return ownedItemsOfSameType;
  }

  static groupItemsByClass(item_list, generic_last = true){
    let grouped_items = {};
    let generics = [];
    for (const item of item_list) {
      let itemclass= getProperty(item, "data.data.class");
      if(itemclass === ""){
        generics.push(item);
      }
      else{
        if(!(itemclass in grouped_items) || !Array.isArray(grouped_items[itemclass])){
          grouped_items[itemclass] = [];
        }
        grouped_items[itemclass].push(item);
      }
    }
    if(!generic_last && generics.length > 0){
      grouped_items["Generic"] = generics;
    }
    let sorted_grouped_items = Object.keys(grouped_items).sort().reduce(
      (obj, key) => {
        obj[key] = grouped_items[key];
        return obj;
      },
      {}
    );
    if(generic_last && generics.length > 0){
      sorted_grouped_items["Generic"] = generics;
    }
    return sorted_grouped_items;
  }

  /**
   * Get a nested dynamic attribute.
   * @param {Object} obj
   * @param {string} property
   */
  static getNestedProperty(obj, property) {
    return property.split('.').reduce((r, e) => {
        return r[e];
    }, obj);
  }


  /**
   * Add item functionality
   */
  static _addOwnedItem(event, actor) {

    event.preventDefault();
    const a = event.currentTarget;
    const item_type = a.dataset.itemType;

    let data = {
      name: randomID(),
      type: item_type
    };
    return actor.createEmbeddedDocuments("Item", [data]);
  }

  static getOwnedObjectByType(actor, type){
    return actor.items.find(item => item.type === type);
  }

  /**
   * Get the list of all available ingame items by Type.
   *
   * @param {string} item_type
   * @param {Object} game
   */
  static async getAllItemsByType(item_type) {

    let list_of_items = [];
    let game_items = [];
    let compendium_items = [];

    game_items = game.items.filter(e => e.type === item_type).map(e => {return e});

    let pack = game.packs.find(e => e.metadata.name === item_type);
    let compendium_content = await pack.getDocuments();
    compendium_items = compendium_content.map(e => {return e});

    list_of_items = game_items.concat(compendium_items);
    list_of_items.sort(function(a, b) {
      let nameA = a.data.name.toUpperCase();
      let nameB = b.data.name.toUpperCase();
      return nameA.localeCompare(nameB);
    });
    return list_of_items;

  }

  static async getSourcedItemsByType(item_type){
    const populateFromCompendia = game.settings.get('bitd-alternate-sheets','populateFromCompendia');
    const populateFromWorld = game.settings.get('bitd-alternate-sheets','populateFromWorld');
    let limited_items;

    if(populateFromCompendia && populateFromWorld){
      limited_items = await this.getAllItemsByType(item_type);
    }
    else if(populateFromCompendia && !populateFromWorld){
      limited_items = await game.packs.get("blades-in-the-dark." + item_type).getDocuments();
    }
    else if(!populateFromCompendia && populateFromWorld){
      if(item_type === "npc"){
        limited_items = game.actors.filter(actor=> actor.type === item_type);
      }
      else{
        limited_items = game.items.filter(item=>item.type === item_type);
      }
    }
    else{
      ui.notifications.error(`No playbook auto-population source has been selected in the system settings. Please choose at least one source.`, {permanent: true});
    }
    if(limited_items){
      limited_items.sort(function(a, b) {
        let nameA = a.name.toUpperCase();
        let nameB = b.name.toUpperCase();
        return nameA.localeCompare(nameB);
      });
    }

    return limited_items;

  }

  static async getItemByType(item_type, item_id){
    let game_items = await this.getAllItemsByType(item_type);
    let item = game_items.find(item => item.id === item_id);
    return item;
  }

  /* -------------------------------------------- */

  /**
   * Returns the label for attribute.
   *
   * @param {string} attribute_name
   * @returns {string}
   */
  static getAttributeLabel(attribute_name) {
        let attribute_labels = {};
        const attributes = game.system.model.Actor.character.attributes;

        for (const att_name in attributes) {
          attribute_labels[att_name] = attributes[att_name].label;
          for (const skill_name in attributes[att_name].skills) {
            attribute_labels[skill_name] = attributes[att_name].skills[skill_name].label;
          }

        }

        return attribute_labels[attribute_name];
  }
  
  /**
   * Returns true if the attribute is an action
   *
   * @param {string} attribute_name 
   * @returns {Boolean}
   */
  static isAttributeAction(attribute_name) {
        const attributes = game.system.model.Actor.character.attributes;
        
        return !(attribute_name in attributes);
  }

  /* -------------------------------------------- */

  /**
   * Return an object with base skills/actions for the given playbook name
   *
   * @param {string} playbook_name 
   * @returns {object}
   */
  static async getStartingAttributes(playbook_name) {
    let empty_attributes = game.system.model.Actor.character.attributes;
    //not sure what was getting linked rather than copied in empty_attributes, but the JSON hack below seems to fix the weirdness I was seeing
    let attributes_to_return = deepClone(empty_attributes);
    try{
      let all_playbooks = await Utils.getSourcedItemsByType("class");
      if(all_playbooks){
        let selected_playbook_base_skills = all_playbooks.find(pb => pb.name == playbook_name).data.data.base_skills;
        for(const [key, value] of Object.entries(empty_attributes)){
          for(const [childKey, childValue] of Object.entries(value.skills)){
            if(selected_playbook_base_skills[childKey]){
              attributes_to_return[key].skills[childKey].value = selected_playbook_base_skills[childKey].toString();
            }
          }
        }
      }
    }
    catch (e) {
      console.log("Error: ", e);
    }
    return attributes_to_return;
  }

  static async getPlaybookName(id){
    let playbook = await this.getItemByType("class", id);
    return playbook.name;
  }

  static async toggleOwnership(state, actor, type, id){
    if(state){
      let all_of_type = await Utils.getSourcedItemsByType('ability');
      let checked_item = all_of_type.find(item => item.id == id);
      let added_item = await actor.createEmbeddedDocuments("Item", [checked_item.data]);
    }
    else{
      if(actor.getEmbeddedDocument('Item', id)){
        actor.deleteEmbeddedDocuments('Item', [id]);
      }
      else{
        let item_source = await Utils.getItemByType(type, id);
        let item_source_name = item_source.name;
        let matching_owned_item = actor.items.find(item => item.name == item_source_name);
        await actor.deleteEmbeddedDocuments('Item', [matching_owned_item.id]);
      }
    }
  }

  static prepIndexForHelper(index){
    let prepped = {};
    if(index){
      index.forEach(item => prepped[item.id] = item.name);
    }
    return prepped;
  }

  static async checkIfDefault(playbook_name, entity){
    let custom = false;
    switch(entity.type){
      case "ability":
        custom = playbook_name === entity.data.data.class;
        break;
      case "item":
        custom = playbook_name === entity.data.data.class;
        break;
      case "npc":
        custom = playbook_name === entity.data.data.associated_class;
        break;
    }
    return custom;
  }

  /**
   * Creates options for faction clocks.
   *
   * @param {int[]} sizes
   *  array of possible clock sizes
   * @param {int} default_size
   *  default clock size
   * @param {int} current_size
   *  current clock size
   * @returns {string}
   *  html-formatted option string
   */
  static createListOfClockSizes( sizes, default_size, current_size ) {

    let text = ``;

    sizes.forEach( size => {
      text += `<option value="${size}"`;
      if ( !( current_size ) && ( size === default_size ) ) {
        text += ` selected`;
      } else if ( size === current_size ) {
        text += ` selected`;
      }

      text += `>${size}</option>`;
    });

    return text;

  }

  // adds an NPC to the character as an acquaintance of neutral standing
  static async addAcquaintance(actor, acq){
    let current_acquaintances = actor.data.data.acquaintances;
    let acquaintance = {
      id : acq.id,
      name : acq.name,
      description_short : acq.data.description_short,
      standing: "neutral"
    };
    let unique_id =  !current_acquaintances.some((oldAcq) => {
      return oldAcq.id == acq.id;
    });
    if(unique_id){
      queueUpdate(()=> {actor.update({data: {acquaintances : current_acquaintances.concat(acquaintance)}});});
    }
    else{
      ui.notifications.info("The dropped NPC is already an acquaintance of this character.");
    }
  }
}
