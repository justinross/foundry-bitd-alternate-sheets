import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { Patch } from "./patches.js";
import { MODULE_ID } from "./utils.js";

export async function registerHooks() {
  Hooks.once('ready', () => {
    if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
      ui.notifications.error("Module Blades in the Dark Alternate Sheets requires the 'libWrapper' module. Please install and activate it.");
    // CONFIG.debug.hooks = true;
  });

  Hooks.once('ready', () => {
    libWrapper.register(MODULE_ID, 'CONFIG.Actor.documentClass.prototype.applyActiveEffects', function (wrapped, ...args) {
      Patch.ActorApplyActiveEffects(this);
      let result = wrapped(...args);
      return result;
    }, 'WRAPPER');

    libWrapper.register(MODULE_ID, 'CONFIG.Actor.documentClass.prototype._onCreateEmbeddedDocuments', function (wrapped, ...args) {
      Patch.ActorOnCreateEmbeddedDocuments(this, ...args);
      let result = wrapped(...args);
      return result;
    }, 'WRAPPER');
  });
  //why isn't sheet showing up in update hook?

  // should we just display items and abilities some other way so switching back and forth between sheets is easy?
  Hooks.on("updateActor", async (actor, updateData, options, actorId)=>{
    if(options.diff && updateData?.flags?.core && "sheetClass" in updateData?.flags?.core){
    }
    if(actor._sheet instanceof BladesAlternateActorSheet){
    }
  });

  Hooks.on("createActor", async (actor)=>{
    if(actor._sheet instanceof BladesAlternateActorSheet){
    }
  })
  return true;
}