import Sortable from "../lib/sortablejs/sortable.esm.js";

const MODULE_ID = "bitd-alternate-sheets";
const FLAG_KEY = "dockLayout";

/**
 * Initialize dockable sections for a sheet.
 * @param {object} config Configuration object
 * @param {HTMLElement} config.root The root element containing the dock columns
 * @param {string} config.actorUuid The UUID of the actor
 * @param {string} config.namespace Module namespace (defaults to bitd-alternate-sheets)
 * @param {object} config.columnSelectors Map of column IDs to selector strings. Default: { left: '[data-dock-column="left"]', right: '[data-dock-column="right"]' }
 * @param {string} config.sectionSelector Selector for dockable sections. Default: '.dock-section'
 * @param {string} config.keyAttr Attribute containing the section key. Default: 'data-section-key'
 * @param {string} config.handleSelector Selector for the drag handle. Default: '.dock-handle'
 * @param {object} config.defaultLayout Default layout object { left: [], right: [] }
 */
export async function initDockableSections(config) {
    const root = config.root;
    if (!root) return;

    // Idempotency check: Don't init twice on the same root
    if (root.dataset.dockableInitialized) return;
    root.dataset.dockableInitialized = "true";

    const namespace = config.namespace || MODULE_ID;
    const actorUuid = config.actorUuid;
    const columnSelectors = config.columnSelectors || {
        left: '[data-dock-column="left"]',
        right: '[data-dock-column="right"]',
    };
    const sectionSelector = config.sectionSelector || ".dock-section";
    const keyAttr = config.keyAttr || "data-section-key";
    const handleSelector = config.handleSelector || ".dock-handle";
    const defaultLayout = config.defaultLayout || { left: [], right: [] };

    // Sanitize UUID for flag storage (Foundry expands dots in keys)
    const storageKey = actorUuid.replace(/\./g, "_");

    // 1. Load Persistence
    const savedMap = (await game.user.getFlag(namespace, FLAG_KEY)) || {};
    const savedLayout = savedMap[storageKey] || defaultLayout;

    // 2. Apply Layout (Move DOM Nodes)
    const columns = {};
    for (const [colId, selector] of Object.entries(columnSelectors)) {
        const colEl = root.querySelector(selector);
        if (colEl) {
            columns[colId] = colEl;
            // Get saved order for this column
            const savedOrder = savedLayout[colId] || [];
            // Move known sections
            for (const sectionKey of savedOrder) {
                const selector = `${sectionSelector}[${keyAttr}="${sectionKey}"]`;
                const section = root.querySelector(selector);
                if (section) {
                    colEl.appendChild(section);
                }
            }
        }
    }

    // 3. Handle Orphans (New sections or those not in saved layout)
    // Append them to the left column (or first available) if they aren't already attached
    const allSections = root.querySelectorAll(sectionSelector);
    const firstCol = Object.values(columns)[0];
    if (firstCol) {
        allSections.forEach((section) => {
            // If parent is not one of our columns, append to default (e.g. left)
            if (!Object.values(columns).some((col) => col.contains(section))) {
                firstCol.appendChild(section);
            }
        });
    }

    // 4. Initialize SortableJS
    const sortableGroup = `dock-group-${actorUuid}`;

    const saveLayout = async () => {
        const newLayout = {};
        for (const [colId, colEl] of Object.entries(columns)) {
            const keys = [];
            colEl.querySelectorAll(sectionSelector).forEach((el) => {
                const key = el.getAttribute(keyAttr);
                if (key) keys.push(key);
            });
            newLayout[colId] = keys;
        }

        // Persist
        const currentMap = (await game.user.getFlag(namespace, FLAG_KEY)) || {};
        currentMap[storageKey] = newLayout;
        await game.user.setFlag(namespace, FLAG_KEY, currentMap);
    };

    for (const colEl of Object.values(columns)) {
        new Sortable(colEl, {
            group: sortableGroup,
            handle: handleSelector,
            draggable: sectionSelector,
            animation: 150,
            onSort: (evt) => {
                // Only save if the item was dropped in this list (prevents double save on cross-list move)
                // or if it was reordered within the same list
                // console.log("DockableSections | onSort triggered", evt);
                saveLayout();
            },
        });
    }
}
