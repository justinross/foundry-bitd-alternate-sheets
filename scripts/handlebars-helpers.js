import {Utils} from "./utils.js";

export const registerHandlebarsHelpers = function() {
  Handlebars.registerHelper('or', function(arg1, arg2){
    if(typeof(arg1) == "string"){
      arg1 = arg1.length > 0;
    }
    if(typeof(arg2) == "string"){
      arg2 = arg2.length > 0;
    }
    return(arg1 || arg2);
  });


  Handlebars.registerHelper('inline-editable-text', function(parameter_name, blank_value, current_value, uniq_id, context){
    let html = '';
    if(current_value.length === 0){
      current_value = blank_value;
    }
    html += `<input  data-input="character-${uniq_id}-${parameter_name}" name="${parameter_name}" type="hidden" value="${current_value}" placeholder="${blank_value}"><span class="inline-input" ${context.owner && context.actor.flags["bitd-alternate-sheets"]?.["allow-edit"] ? 'contenteditable="true"' : null} spellcheck="false" data-target="character-${uniq_id}-${parameter_name}" data-placeholder="${blank_value}">${current_value}</span>`;
    return html;
  });

  Handlebars.registerHelper('clean-name', function(input){
    return Utils.trimClassFromName(input);
  });

  Handlebars.registerHelper('owns-ability', function(actor, ability_name){
    return actor.items.some(item => item.name == ability_name);
  });

  Handlebars.registerHelper('times_from_2', function(n, block) {

    var accum = '';
    n = parseInt(n);
    for (var i = 2; i <= n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  Handlebars.registerHelper('item-equipped', function(actor, id){
    let actor_doc = game.actors.get(actor._id);
    let equipped_items = actor_doc.getFlag('bitd-alternate-sheets', 'equipped-items');
    if(equipped_items){
      let equipped = equipped_items.find(item => item.id === id);
      return equipped;
    }
    else{
      return false;
    }
  });

  Handlebars.registerHelper('times', function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
      accum += block.fn(i);
    return accum;
  });

  Handlebars.registerHelper('md', function(input){
    let md = window.markdownit();
    let output_value = md.render(input);
    return output_value;
  });


  Handlebars.registerHelper('editable-textarea', function(parameter_name, blank_value, use_markdown = false, force_editable=false, current_value, uniq_id, context){
    let html = '';
    if(!current_value || current_value.length === 0){
      current_value = "Click the edit lock above to add character notes.";
    }
    let output_value = current_value;
    if(use_markdown){
      var md = window.markdownit();
      output_value = md.render(current_value);
      // output_value = current_value;
    }
    if(force_editable || context.owner && context.actor.flags["bitd-alternate-sheets"]?.["allow-edit"]){
      html += `<textarea data-input="character-${uniq_id}-${parameter_name}" name="${parameter_name}" value="${current_value}" placeholder="${blank_value}">${current_value}</textarea>`;
    }
    else{
      html += `<div class="output">${output_value}</div>`;
    }
    return html;
  });

  // Commented out to avoid conflict with existing foundry helper that I somehow didn't notice
  // Handlebars.registerHelper('icon', function(icon_name, classes){
  //   let icon_folder = "/systems/blades-in-the-dark/styles/assets/icons/";
  //   let icon_info = BladesHelpers.icons[icon_name];
  //   let html = '';
  //   switch(icon_info.type){
  //     case 'fa':
  //       html = `<i class='${icon_info.icon} ${classes}'></i>`;
  //       break;
  //     case 'svg':
  //       html = `<img src="${icon_folder}${icon_info.icon}" alt="">`
  //
  //   }
  //   return new Handlebars.SafeString(html);
  // });

  Handlebars.registerHelper('upper-first', function(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  });
}
