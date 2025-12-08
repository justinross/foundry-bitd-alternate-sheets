import { Utils } from "./utils.js";

export const registerHandlebarsHelpers = function () {
  Handlebars.registerHelper("or", function (arg1, arg2) {
    if (typeof arg1 == "string") {
      arg1 = arg1.length > 0;
    }
    if (typeof arg2 == "string") {
      arg2 = arg2.length > 0;
    }
    return arg1 || arg2;
  });

  Handlebars.registerHelper("notempty", function (arg1) {
    return arg1.trim().length > 0;
  });

  // Handlebars.registerHelper('flexinput', function(field, ctx){
  //   switch (field.type) {
  //     case "img":
  //         return new Handlebars.SafeString(`<img src="${ctx[field.name]}" data-edit="img" title="${field.name}"/>`);
  //       break;
  //     case "number":

  //       break;
  //     case "editor":
  //       return Handlebars.helpers['editor']()

  //     default:
  //       break;
  //   }
  // });

  Handlebars.registerHelper(
    "inline-editable-text",
    function (
      editable,
      parameter_name,
      blank_value,
      current_value,
      uniq_id,
      context
    ) {
      let html = "";
      if (current_value?.length === 0 || !current_value) {
        current_value = blank_value;
      }
      html += `<input  data-input="character-${uniq_id}-${parameter_name}" name="${parameter_name}" type="hidden" value="${current_value}" placeholder="${blank_value}"><span class="inline-input" ${context.owner && editable ? 'contenteditable="true"' : null
        } spellcheck="false" data-target="character-${uniq_id}-${parameter_name}" data-placeholder="${blank_value}">${current_value}</span>`;
      return html;
    }
  );

  Handlebars.registerHelper(
    "smart-field",
    function (
      allow_edit,
      parameter_name,
      label,
      current_value,
      uniq_id,
      context
    ) {
      if (!current_value) current_value = "";

      // Escape all values to prevent XSS
      const escapedLabel = Handlebars.escapeExpression(label);
      const escapedValue = Handlebars.escapeExpression(current_value);
      const escapedParam = Handlebars.escapeExpression(parameter_name);
      const escapedId = Handlebars.escapeExpression(uniq_id);

      // Locked Mode: Clean Value
      if (!allow_edit) {
        // If empty, display label as placeholder (User Request)
        const display = (!current_value || current_value.trim() === "") ? escapedLabel : escapedValue;
        // Conditional tooltip: don't show ": " if value is empty
        const tooltip = current_value ? `${escapedLabel}: ${escapedValue}` : escapedLabel;
        return `<span class="smart-field-value" data-tooltip="${tooltip}">${display}</span>`;
      }

      // Unlocked Mode: Interactive Label or Value
      const display = (current_value && current_value.trim() !== "") ? escapedValue : escapedLabel;
      // Removing role="button" to prevent flexbox baseline misalignment (UA styles treating it as control)
      return `<span class="smart-field-label" data-action="smart-edit" data-field="${escapedParam}" data-header="${escapedLabel}" data-value="${escapedValue}" data-id="${escapedId}" tabindex="0">${display}</span>`;
    }
  );

  Handlebars.registerHelper("getItemByType", function (items, type) {
    if (!items || !type) return null;
    return items.find(i => i.type === type) || null;
  });

  Handlebars.registerHelper("testing", function () {
    return "testing";
  });
  Handlebars.registerHelper(
    "fancyToggle",
    function (
      parameter_name,
      offIcon,
      onIcon,
      current_value,
      tooltip,
      uniq_id
    ) {
      let html = `
      <label class="fancyToggle" for="fancyToggle-${uniq_id}" data-tooltip="${tooltip}">
        <i class="fas ${offIcon}" style="display: ${current_value ? "none" : "inline"
        };"></i>
        <i class="fas ${onIcon}" style="display: ${current_value ? "inline" : "none"
        };"></i>
      </label>
        <input type="checkbox" style="" checked="${current_value}" id="fancyToggle-${uniq_id}" name="${parameter_name}" data-input="${uniq_id}-${parameter_name}" />
      `;
      return html;
    }
  );

  Handlebars.registerHelper("ifCond", function (v1, operator, v2, options) {
    switch (operator) {
      case "==":
        return v1 == v2 ? options.fn(this) : options.inverse(this);
      case "===":
        return v1 === v2 ? options.fn(this) : options.inverse(this);
      case "!=":
        return v1 != v2 ? options.fn(this) : options.inverse(this);
      case "!==":
        return v1 !== v2 ? options.fn(this) : options.inverse(this);
      case "<":
        return v1 < v2 ? options.fn(this) : options.inverse(this);
      case "<=":
        return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case ">":
        return v1 > v2 ? options.fn(this) : options.inverse(this);
      case ">=":
        return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case "&&":
        return v1 && v2 ? options.fn(this) : options.inverse(this);
      case "||":
        return v1 || v2 ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });

  Handlebars.registerHelper("clean-name", function (input) {
    return Utils.trimClassFromName(input);
  });

  Handlebars.registerHelper("owns-ability", function (actor, ability_name) {
    return actor.items.some((item) => item.name == ability_name);
  });

  Handlebars.registerHelper("ability-cost", function (ability) {
    const raw = ability?.system?.price ?? ability?.system?.cost ?? 1;
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.floor(parsed);
  });

  Handlebars.registerHelper("inc", function (value) {
    return Number(value) + 1;
  });

  Handlebars.registerHelper("times_from_2", function (n, block) {
    var accum = "";
    n = parseInt(n);
    for (var i = 2; i <= n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  Handlebars.registerHelper("item-equipped", function (actor, id) {
    let actor_doc = game.actors.get(actor._id);
    let equipped_items = actor_doc.getFlag(
      "bitd-alternate-sheets",
      "equipped-items"
    );
    return equipped_items ? equipped_items[id] : false;
  });

  Handlebars.registerHelper("clean-html", function (html) {
    html = Utils.strip(html);
    return html ? new Handlebars.SafeString(html) : "";
  });

  Handlebars.registerHelper("times", function (n, block) {
    let accum = "";
    const count = Math.max(0, Number.parseInt(n, 10) || 0);
    const data = block.data ? Handlebars.createFrame(block.data) : undefined;
    for (let i = 0; i < count; ++i) {
      if (data) data.index = i;
      accum += block.fn(i, { data });
    }
    return accum;
  });

  Handlebars.registerHelper("md", function (input) {
    let md = window.markdownit();
    input = Utils.strip(input);
    let output_value = md.render(input);
    return output_value;
  });

  Handlebars.registerHelper(
    "editable-textarea",
    function (
      editable,
      parameter_name,
      blank_value,
      use_markdown = false,
      force_editable = false,
      current_value,
      uniq_id,
      context
    ) {
      let html = "";
      if (!current_value || current_value.length === 0) {
        // current_value = "Click the edit lock above to add character notes.";
      }
      let output_value = current_value;
      if (use_markdown) {
        var md = window.markdownit();
        output_value = md.render(current_value);
        // output_value = current_value;
      }
      if (force_editable || (context.owner && editable)) {
        html += `<textarea data-input="character-${uniq_id}-${parameter_name}" name="${parameter_name}" value="${current_value}" placeholder="${blank_value}">${current_value}</textarea>`;
      } else {
        html += `<div class="output">${output_value}</div>`;
      }
      return html;
    }
  );

  Handlebars.registerHelper("upper-first", function (input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  });

  Handlebars.registerHelper("firstLine", function (text) {
    if (!text) return "";
    const lines = text.split("\n");
    // Return first non-empty line, removing any leading "- " prefix
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        return trimmed.replace(/^-\s*/, "");
      }
    }
    return "";
  });
};
