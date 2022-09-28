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
      let has_double = (item_data.type === i.type);
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
    if ( e.disabled || (e.parent.documentName !== "Actor") ) return true;
    const [parentType, parentId, documentType, documentId] = e.origin?.split(".") ?? [];
    if ( (parentType !== "Actor") || (parentId !== e.parent.id) || (documentType !== "Item") ) return true;
    const item = e.parent.items.get(documentId);
    if ( !item ) return true;
    const itemData = item;
    // If an item is not equipped, or it is equipped but it requires attunement and is not attuned, then disable any
    // Active Effects that might have originated from it.
    //
    isSuppressed = itemData.type !== "class" && itemData.system.equipped !== true && itemData.system.purchased !== true;
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
      let itemclass= getProperty(item, "system.class");
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
  // static _addOwnedItem(event, actor) {
  //
  //   event.preventDefault();
  //   const a = event.currentTarget;
  //   const item_type = a.dataset.itemType;
  //
  //   let data = {
  //     name: randomID(),
  //     type: item_type
  //   };
  //   return actor.createEmbeddedDocuments("Item", [data]);
  // }

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
      let nameA = a.name.toUpperCase();
      let nameB = b.name.toUpperCase();
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
        let selected_playbook_base_skills = all_playbooks.find(pb => pb.name == playbook_name).system.base_skills;
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
    if(playbook){
      return playbook.name;
    }
    else{
      return "No Playbook";
    }
  }

  static async toggleOwnership(state, actor, type, id){
    if(type == "ability"){
      if(state){
        let all_of_type = await Utils.getSourcedItemsByType(type);
        let checked_item = all_of_type.find(item => item.id == id);
        let added_item = await actor.createEmbeddedDocuments("Item", [{type: checked_item.type, name: checked_item.name, data: checked_item.system}]);
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
    else if(type == "item"){
      // let item = actor.items.find(item => item.id === id);
      let equipped_items = await actor.getFlag('bitd-alternate-sheets', 'equipped-items');
      if(!equipped_items){
        equipped_items = [];
      }
      let item_blueprint;
      if(actor.items.some(item => item.id === id)){
        item_blueprint = actor.items.find(item => item.id === id);
      }
      else{
        item_blueprint = await Utils.getItemByType(type, id);
      }
      if(state){
        equipped_items.push({id: item_blueprint.id, load: item_blueprint.system.load, name: item_blueprint.name});
      }
      else{
        equipped_items = equipped_items.filter(i => i.id !== id);
      }
      // if(equipped_items){
      //   let item_source = await Utils.getItemByType(type, id);
      //   if(equipped_items.some(i => i.id === id )){
      //     // equipped_items.findSplice(i => i === id);
      //   }
      //   else{
      //   }
      // }
      // else{
      //   equipped_items = [id];
      // }
      await actor.setFlag('bitd-alternate-sheets', 'equipped-items', equipped_items);
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
        custom = playbook_name === entity.system.class;
        break;
      case "item":
        custom = playbook_name === entity.system.class;
        break;
      case "npc":
        custom = playbook_name === entity.system.associated_class;
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
    let current_acquaintances = actor.system.acquaintances;
    let acquaintance = {
      id : acq.id,
      name : acq.name,
      description_short : acq.system.description_short,
      standing: "neutral"
    };
    let unique_id =  !current_acquaintances.some((oldAcq) => {
      return oldAcq.id == acq.id;
    });
    if(unique_id){
      // queueUpdate(()=> {actor.update({data: {acquaintances : current_acquaintances.concat([acquaintance])}});});
      await actor.update({data: {acquaintances : current_acquaintances.concat([acquaintance])}});
    }
    else{
      ui.notifications.info("The dropped NPC is already an acquaintance of this character.");
    }
  }

  static async addAcquaintanceArray(actor, acqArr){
    let current_acquaintances = actor.system.acquaintances;
    for(const currAcq of current_acquaintances){
      acqArr.findSplice((acq) => acq.id == currAcq._id);
    }
    acqArr = acqArr.map((acq)=>{
      return {
        id : acq.id,
        name : acq.name,
        description_short : acq.system.description_short,
        standing: "neutral"
      }
    });
    await actor.update({data: {acquaintances : current_acquaintances.concat(acqArr)}});
  }

  static async removeAcquaintance(actor, acqId){
    let current_acquaintances = actor.system.acquaintances;
    let updated_acquaintances = current_acquaintances.filter(acq => acq._id !== acqId && acq.id !== acqId);
    await actor.update({data: {acquaintances : updated_acquaintances}});
  }

   static async removeAcquaintanceArray(actor, acqArr){
    //see who the current acquaintances are
    let current_acquaintances = actor.system.acquaintances;
    //for each of the passed acquaintances
    for(const currAcq of acqArr){
      //remove the matching acquaintance from the current acquaintances
      current_acquaintances.findSplice((acq)=>acq.id == currAcq.id);
    }
    // let new_acquaintances = current_acquaintances.filter(acq => acq._id !== acqId && acq.id !== acqId);
    await actor.update({data: {acquaintances : current_acquaintances}});
  }

  static async getVirtualListOfItems(type = "", data, sort = true, filter_playbook = "", duplicate_owned_items  = false, include_owned_items = false){
    let virtual_list = [];
    let owned_items;
    let all_game_items = await Utils.getSourcedItemsByType(type);
    let sheet_items;

    sheet_items = all_game_items.filter(item =>{
      if(item.system.class !== undefined){
        if(item.system.class !== ""){
        }
        return item.system.class === filter_playbook
      }
      else if(item.system.associated_class){
        return item.system.associated_class === filter_playbook
      }
      else{
        return false;
      }
    });
    sheet_items.sort((a, b) => {
      if(a.name.includes("Veteran") || b.system.class_default){
        return 1;
      }
      if(b.name.includes("Veteran") || a.system.class_default){
        return -1;
      }
      if(a.name === b.name){ return 0; }
      return Utils.trimClassFromName(a.name) > Utils.trimClassFromName(b.name) ? 1 : -1;
      }
    )
    sheet_items = sheet_items.map(el => {
      el.system.virtual = true;
      return el;
    });
    if(include_owned_items){
      owned_items = data.actor.items.filter(item => item.type === type);
    }
    else{
      owned_items = [];
    }
    virtual_list = sheet_items;
    for(const item of owned_items){
      if(duplicate_owned_items || !virtual_list.some(i => i.name === item.name)){
        virtual_list.push(item);
      }
    }

    return virtual_list;
  }

  static strip(html){
    let doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }

  static convertArrayToBooleanObject(arr){
    const obj = {};
    for (const key of arr) {
      obj[key] = true;
    }
    return obj;
  }

  static convertBooleanObjectToArray(obj){
    return Object.keys(obj).filter(key => obj[key]);
    // if(Array.isArray(obj))
    //
    //   let arr = [];
    //   if(!Array.isArray(object)){
    //     for(const el in object){
    //       if(object[el]){
    //         arr.push(el);
    //       }
    //     }
    //     return arr;
    //   }
    //   else{
    //     // console.log("Can't use convertBooleanObjectToArray on an array. Returning object untouched.");
    //     return object;
    //   }
  }

  // This doesn't work as expected. It hasn't been updated
  static async modifiedFromPlaybookDefault(actor) {
    let skillsChanged = false;
    let newAbilities = false;
    let ownedAbilities = false;
    let relationships = false;
    let acquaintanceList = false;
    let addedItems = false;

    //get the original playbook
    let selected_playbook_source;
    if(actor.system.playbook !== "" && actor.system.playbook){
      // selected_playbook_source = await game.packs.get("blades-in-the-dark.class").getDocument(this.system.playbook);
      selected_playbook_source = await Utils.getItemByType("class", actor.system.playbook);

      let startingAttributes = await Utils.getStartingAttributes(selected_playbook_source.name);
      let currentAttributes = actor.system.attributes;
      //vampire ActiveEffects make this think there's been a change to the base skills, so ignore the exp_max field
      for (const attribute in currentAttributes) {
        currentAttributes[attribute].exp = 0;
        delete currentAttributes[attribute].exp_max;
      }
      for (const attribute in startingAttributes) {
        startingAttributes[attribute].exp = 0;
        delete startingAttributes[attribute].exp_max;
      }
      if(!isObjectEmpty(diffObject(currentAttributes, startingAttributes))){
        skillsChanged = true;
      }





      //check for added abilities
      let all_abilities = await Utils.getSourcedItemsByType("ability");
      if(all_abilities){
        let pb_abilities = all_abilities.filter(ab=> ab.system.class === selected_playbook_source.name);
        let my_abilities = actor.system.items.filter(i => i.type === "ability");
        for (const ability of my_abilities) {
          if(!pb_abilities.some(ab=> ab.name === ability.name)){
            newAbilities = true;
          }
          //check for purchased abilities that aren't class defaults
          if(ability.system.purchased && (ability.system.class_default && ability.system.class === await Utils.getPlaybookName(actor.system.playbook))){
            ownedAbilities = true;
          }
        }
      }

      //check for non-default acquaintances
      let all_acquaintances = await Utils.getSourcedItemsByType("npc");
      if(all_acquaintances){
        let pb_acquaintances = all_acquaintances.filter(acq=>acq.system.associated_class === selected_playbook_source.name);
        let my_acquaintances = actor.system.acquaintances;
        for (const my_acq of my_acquaintances) {
          if(!pb_acquaintances.some(acq=> acq.id === my_acq.id || acq.id === my_acq._id)){
            acquaintanceList = true;
          }
          //check for acquaintance relationships
          if(my_acq.standing !== "neutral"){
            relationships = true;
          }
        }
      }

      //check for added items
      let all_items = await Utils.getSourcedItemsByType("item");
      if(all_items){
        let pb_items = all_items.filter(i=> i.system.class === selected_playbook_source.name);
        let my_non_generic_items = actor.items.filter(i=> i.type === "item" && i.system.class !== "");
        for (const myNGItem of my_non_generic_items) {
          if(!pb_items.some(i=> i.name ===  myNGItem.name)){
            addedItems = true;
          }
        }
      }
    }


    if(skillsChanged || newAbilities || ownedAbilities || relationships || acquaintanceList || addedItems){
      return {skillsChanged, newAbilities, ownedAbilities, relationships, acquaintanceList, addedItems};
    }
    else{
      return false;
    }
  }
}
