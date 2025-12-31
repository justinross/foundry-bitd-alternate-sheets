import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { registerDiceSoNiceChanges } from "./dice-so-nice.js";
import { Patch } from "./patches.js";
import { Utils } from "./utils.js";
import { replaceClockLinks, setupGlobalClockHandlers } from "./clocks.js";

export async function registerHooks() {
  // Import cache invalidation (dynamic import to avoid circular dependency)
  const collections = await import("./utils/collections.js");
  const invalidateCache = collections.invalidateCompendiumCache;

  // Invalidate cache when compendium content changes
  Hooks.on("createItem", (item, options, userId) => {
    if (item.pack) invalidateCache();
  });

  Hooks.on("updateItem", (item, changes, options, userId) => {
    if (item.pack) invalidateCache();
  });

  Hooks.on("deleteItem", (item, options, userId) => {
    if (item.pack) invalidateCache();
  });

  Hooks.on("createActor", (actor, options, userId) => {
    if (actor.pack) invalidateCache();
  });

  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (actor.pack) invalidateCache();
  });

  Hooks.on("deleteActor", (actor, options, userId) => {
    if (actor.pack) invalidateCache();
  });

  // Hooks.once('ready', () => {
  // if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
  //   ui.notifications.error("Module Blades in the Dark Alternate Sheets requires the 'libWrapper' module. Please install and activate it.");
  // });

  // Hooks.once("setup", () => {
  // });

  Hooks.on("renderSidebarTab", (app, html, options) => {
    if (options.tabName !== "actors") return;
    if (!game.user.isGM) return;

    Utils.replaceCharacterNamesInDirectory(app, html);
  });

  Hooks.once("ready", () => {
    Hooks.once("diceSoNiceReady", (dice3d) => {
      registerDiceSoNiceChanges(dice3d);
    });

    // Set up global event delegation for clock interactivity
    // This enables clocks to work in journals, chat, and other contexts
    setupGlobalClockHandlers();
  });

  // Bake clock state into chat messages at creation time to preserve historical values
  // This runs BEFORE the message is saved, so the snapshot is permanent
  Hooks.on("preCreateChatMessage", async (message, data, options, userId) => {
    let content = message.content || "";

    // Find @UUID references to actors
    const uuidPattern = /@UUID\[([^\]]+)\]\{([^}]*)\}/g;
    let match;
    let newContent = content;

    while ((match = uuidPattern.exec(content)) !== null) {
      try {
        const uuid = match[1];
        const doc = await fromUuid(uuid);

        if (!doc || (doc.type !== "🕛 clock" && doc.type !== "clock")) continue;

        // Capture current clock state
        const type = doc.system?.type ?? 4;
        const value = doc.system?.value ?? 0;
        const color = doc.system?.theme ?? "black";

        // Replace @UUID with a data-enriched version that includes the snapshot
        // We'll use a custom attribute to store the value at creation time
        const snapshotMarker = `@UUID[${uuid}]{${match[2]}|snapshot:${value}}`;
        newContent = newContent.replace(match[0], snapshotMarker);
      } catch (e) {
        // Ignore resolution errors
      }
    }

    if (newContent !== content) {
      message.updateSource({ content: newContent });
    }
  });

  // Post-process rendered content to replace clock actor links with clock visualizations
  // This runs AFTER Foundry's built-in @UUID enricher has created content-link elements
  Hooks.on("renderChatMessage", async (message, html, data) => {
    const container = html[0] || html;
    // Pass the message content to extract snapshot values
    if (container) await replaceClockLinks(container, message.content);
  });

  // Also process journals and other sheets that might contain clock links
  // V12 and earlier
  Hooks.on("renderJournalSheet", async (app, html, data) => {

    const container = html[0] || html;
    if (container) await replaceClockLinks(container);
  });

  Hooks.on("renderJournalPageSheet", async (app, html, data) => {

    const container = html[0] || html;
    if (container) await replaceClockLinks(container);
  });

  // V11+ uses JournalTextPageSheet for text pages
  Hooks.on("renderJournalTextPageSheet", async (app, html, data) => {

    const container = html[0] || html;
    if (container) await replaceClockLinks(container);
  });

  // V13+ uses ApplicationV2 - the hook name format is different
  // Generic hook for ALL ApplicationV2 renders
  // Note: Don't await to avoid blocking the render chain
  Hooks.on("renderApplicationV2", (app, html, data) => {
    // Check if this is a journal-related application
    const className = app.constructor.name;
    if (className.includes("Journal") || app.document?.documentName === "JournalEntry") {

      const container = html instanceof HTMLElement ? html : (html[0] || html);
      if (container) replaceClockLinks(container); // Fire and forget
    }
  });

  // V13+ DocumentSheetV2 for journal entries
  Hooks.on("renderDocumentSheetV2", (app, html, data) => {
    if (app.document?.documentName === "JournalEntry" || app.document?.documentName === "JournalEntryPage") {

      const container = html instanceof HTMLElement ? html : (html[0] || html);
      if (container) replaceClockLinks(container); // Fire and forget
    }
  });

  // Process actor sheets (for Notes tab)
  Hooks.on("renderActorSheet", async (app, html, data) => {
    const container = html[0] || html;
    if (container) await replaceClockLinks(container);
  });

  // Process crew sheets (for Notes tab)  
  Hooks.on("renderBladesCrewSheet", async (app, html, data) => {
    const container = html[0] || html;
    if (container) await replaceClockLinks(container);
  });
  //why isn't sheet showing up in update hook?

  Hooks.on("deleteItem", async (item, options, id) => {
    if (!item?.parent) return;
    const canModifyParent = item.isOwner || item.parent?.isOwner || game.user.isGM;
    if (!canModifyParent) return;

    if (item.type === "item") {
      await Utils.toggleOwnership(false, item.parent, "item", item.id);
    }
    // Ability progress is now managed by the ghost slots system
  });

  Hooks.on("renderBladesClockSheet", async (sheet, html, options) => {
    let characters = game.actors.filter((a) => {
      return a.type === "character";
    });
    for (let index = 0; index < characters.length; index++) {
      const character = characters[index];
      if (!character?.isOwner) continue;
      if (!character.sheet?.rendered) continue;
      let notes = await character.getFlag("bitd-alternate-sheets", "notes");
      notes = notes ? notes : "";
      if (notes.includes(sheet.actor._id)) {
        character.sheet.render(false);
      }
    }
  });
  // should we just display items and abilities some other way so switching back and forth between sheets is easy?

  // Note: updateActor and createActor hooks were removed as they contained
  // no implementation. If sheet-switching logic is needed in the future,
  // re-add them with actual functionality.

  return true;
}
