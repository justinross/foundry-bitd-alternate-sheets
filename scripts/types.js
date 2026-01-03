/**
 * Shared JSDoc type definitions for the BitD Alternate Sheets module.
 * These are lightweight structural types for editor IntelliSense only.
 *
 * Note: We use `unknown` for Foundry document types (Actor, Item, etc.)
 * to avoid brittleness from version changes and avoid requiring external type packages.
 */

/**
 * Options for sourcing items from world and/or compendia
 * @typedef {object} ItemSourceOptions
 * @property {string} [playbook] - Filter items by playbook name
 * @property {boolean} [includeWorld=true] - Include world items in results
 * @property {boolean} [includeCompendia=true] - Include compendium items in results
 */

/**
 * Options for virtual list generation
 * @typedef {object} VirtualListOptions
 * @property {string} type - The item type to retrieve (e.g., "ability", "item", "npc")
 * @property {unknown} data - Sheet data containing actor reference
 * @property {boolean} [sort=true] - Whether to sort the resulting list
 * @property {string} [filter_playbook=""] - Playbook name to filter by
 * @property {boolean} [duplicate_owned_items=false] - Allow duplicate items in list
 * @property {boolean} [include_owned_items=false] - Include actor's owned items
 */

/**
 * Choice object for card selection dialogs
 * @typedef {object} DialogChoice
 * @property {string} value - The unique identifier for this choice
 * @property {string} label - Display label for the choice
 * @property {string} [img] - Optional image path for the choice
 * @property {string} [description] - Optional description (shown as tooltip)
 */

/**
 * Options for card selection dialog
 * @typedef {object} CardSelectionDialogOptions
 * @property {string} title - Dialog window title
 * @property {string} instructions - Instructional text shown above choices
 * @property {string} okLabel - Label for OK/confirm button
 * @property {string} cancelLabel - Label for cancel button
 * @property {string} clearLabel - Label for clear button
 * @property {Array<DialogChoice>} choices - Array of selectable choices
 * @property {string} [currentValue] - Currently selected value (if any)
 * @property {number} [width=720] - Dialog width in pixels
 * @property {number} [height=576] - Dialog height in pixels
 */

/**
 * Options for confirmation dialog
 * @typedef {object} ConfirmDialogOptions
 * @property {string} title - Dialog window title
 * @property {string} content - HTML content to display
 * @property {string} [yesLabel] - Label for yes/confirm button
 * @property {string} [noLabel] - Label for no/cancel button
 * @property {boolean} [defaultYes=false] - Whether yes is the default action
 */

/**
 * UI state object for persisting sheet preferences
 * @typedef {object} UiState
 * @property {object} [collapsedSections] - Map of section keys to collapsed state
 * @property {boolean} [showFilteredAcquaintances] - Whether to show only friends/rivals
 * @property {unknown} [filters] - Additional filter state (structure varies by sheet)
 */

export {};
