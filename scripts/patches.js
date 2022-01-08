import { Utils } from "./utils.js";
import { queueUpdate } from "./lib/update-queue.js";

export class Patch {
  static ActorApplyActiveEffects(actor) {
    //if using my sheets, do the thing below
    if(Utils.isUsingAltSheets(actor)){
      actor.effects.forEach((e)=> e.isSuppressed = Utils.isEffectSuppressed(e))
    }
  }

  static async ActorOnCreateEmbeddedDocuments(actor, ...args){
    let embeddedName = args[0];
    let documents = args[1];
    if(actor.type == "character"){
      let class_name = await Utils.getPlaybookName(actor.data.data.playbook);
      if(embeddedName === "Item" && documents.length > 0){
        for (const document of documents) {
          if(document.type === "ability" && document.data.data.class_default && document.data.data.class === class_name){
            queueUpdate(()=> document.update({data : { purchased : true}}));
          }
        }
      }
    }
  }
}