import { registerDiceSoNiceChanges } from "./dice-so-nice.js";
import { Patch } from "./patches.js";
import { Utils } from "./utils.js";
import { replaceClockLinks, setupGlobalClockHandlers } from "./clocks.js";
import { getChatMessageRenderHook } from "./compat.js";

export async function registerHooks() {
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

    // Pre-cache common item types for faster initial sheet renders
    Utils._preCacheCommonTypes();
  });

  // ========================================
  // Compendium Cache Invalidation Hooks
  // ========================================

  // Invalidate cache when compendiums are updated
  Hooks.on("updateCompendium", (pack, documents, options, userId) => {
    // Determine affected item type based on pack contents
    const docName = pack.documentName;
    if (docName === "Item") {
      // Could be any item type - clear all item caches
      Utils._invalidateCache(null);
    } else if (docName === "Actor") {
      // NPC actors are cached
      Utils._invalidateCache("npc");
    }
  });

  // Invalidate cache when world items change (if populateFromWorld is enabled)
  Hooks.on("createItem", (item, options, userId) => {
    if (!item.parent) {
      // World-level item created
      Utils._invalidateCache(item.type);
    } else if (item.pack) {
      // Compendium item created
      Utils._invalidateCache(item.type);
    }
  });

  Hooks.on("updateItem", (item, updateData, options, userId) => {
    if (!item.parent) {
      // World-level item updated
      Utils._invalidateCache(item.type);
    } else if (item.pack) {
      // Compendium item updated
      Utils._invalidateCache(item.type);
    }
  });

  Hooks.on("deleteItem", (item, options, userId) => {
    if (!item.parent) {
      // World-level item deleted
      Utils._invalidateCache(item.type);
    } else if (item.pack) {
      // Compendium item deleted
      Utils._invalidateCache(item.type);
    }
  });

  // Invalidate cache when world actors change (for NPC type)
  Hooks.on("createActor", (actor, options, userId) => {
    if (actor.type === "npc") {
      Utils._invalidateCache("npc");
    }
  });

  Hooks.on("updateActor", (actor, updateData, options, userId) => {
    if (actor.type === "npc") {
      Utils._invalidateCache("npc");
    }
  });

  Hooks.on("deleteActor", (actor, options, userId) => {
    if (actor.type === "npc") {
      Utils._invalidateCache("npc");
    }
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
        const value = doc.system?.value ?? 0;

        // Replace @UUID with a data-enriched version that includes the snapshot
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
  // V13+ uses renderChatMessageHTML (HTMLElement), V12 and earlier use renderChatMessage (jQuery)
  Hooks.on(getChatMessageRenderHook(), async (message, html, data) => {
    const container = html instanceof HTMLElement ? html : (html[0] || html);
    // Pass the message content to extract snapshot values
    if (container) await replaceClockLinks(container, message.content);
  });

  // Helper: wait for @UUID enrichment to complete (content-links to appear)
  // V12's enrichment is async and completes after render hooks fire
  async function waitForEnrichmentThenReplace(container, timeoutMs = 2000) {
    if (!container) return;

    // If content-links already exist, process immediately
    if (container.querySelector('a.content-link[data-type="Actor"]')) {
      await replaceClockLinks(container);
      return;
    }

    // Poll for content-links to appear (V12 async enrichment)
    const start = Date.now();
    return new Promise((resolve) => {
      const check = async () => {
        if (container.querySelector('a.content-link[data-type="Actor"]')) {
          await replaceClockLinks(container);
          resolve();
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          // Timeout - try anyway in case there are no clock links
          await replaceClockLinks(container);
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  // Also process journals and other sheets that might contain clock links
  Hooks.on("renderJournalSheet", async (app, html, data) => {
    const container = html[0] || html;
    await waitForEnrichmentThenReplace(container);
  });

  Hooks.on("renderJournalPageSheet", async (app, html, data) => {
    const container = html[0] || html;
    await waitForEnrichmentThenReplace(container);
  });

  // V11+ uses JournalTextPageSheet for text pages
  Hooks.on("renderJournalTextPageSheet", async (app, html, data) => {
    const container = html[0] || html;
    await waitForEnrichmentThenReplace(container);
  });

  // V13+ uses ApplicationV2 - the hook name format is different
  // Generic hook for ALL ApplicationV2 renders
  Hooks.on("renderApplicationV2", (app, html, data) => {
    // Check if this is a journal-related application
    const className = app.constructor.name;
    if (className.includes("Journal") || app.document?.documentName === "JournalEntry") {
      const container = html instanceof HTMLElement ? html : (html[0] || html);
      if (container) replaceClockLinks(container);
    }
  });

  // V13+ DocumentSheetV2 for journal entries
  Hooks.on("renderDocumentSheetV2", (app, html, data) => {
    if (app.document?.documentName === "JournalEntry" || app.document?.documentName === "JournalEntryPage") {
      const container = html instanceof HTMLElement ? html : (html[0] || html);
      if (container) replaceClockLinks(container);
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

  Hooks.on("deleteItem", async (item, options, id) => {
    if (!item?.parent) return;
    const canModifyParent = item.isOwner || item.parent?.isOwner || game.user.isGM;
    if (!canModifyParent) return;

    if (item.type === "item") {
      await Utils.toggleOwnership(false, item.parent, "item", item.id);
    }
    if (item.type === "ability" && item.parent.type === "character") {
      const key = Utils.getAbilityProgressKeyFromData(item.name, item.id);
      await Utils.updateAbilityProgressFlag(item.parent, key, 0);
    }
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

  return true;
}
