/**
 * Helper class to manage database updates that occur from
 * hooks that may fire back to back.
 */
class UpdateQueue {
  constructor(entityType) {

    /** self identification */
    this.entityType = entityType;

    /** buffer of update functions to run */
    this.queue = [];

    /** Semaphore for 'batch update in progress' */
    this.inFlight = false;
  }

  queueUpdate(fn) {
    this.queue.push(fn);

    /** only kick off a batch of updates if none are in flight */
    if (!this.inFlight) {
      this.runUpdate();
    }
  }

  async runUpdate(){

    this.inFlight = true;

    while(this.queue.length > 0) {


      /** grab the last update in the list and hold onto its index
       *  in case another update pushes onto this array before we
       *  are finished.
       */
      const updateIndex = this.queue.length-1;
      const updateFn = this.queue[updateIndex];

      /** wait for the update to complete */
      await updateFn();

      /** remove this entry from the queue */
      this.queue.splice(updateIndex,1);
    }

    this.inFlight = false;

  }
}

let updateQueue = new UpdateQueue("All");

/**
 * Safely manages concurrent updates by serializing them in a queue.
 * Prevents race conditions when multiple hooks or events trigger document updates.
 * @param {Function} updateFn - The function that handles the actual update (can be async)
 * @returns {void}
 */
export function queueUpdate(updateFn) {
  /** queue the update for this entity */
  updateQueue.queueUpdate(updateFn);
}

/**
 * Safely updates a document with ownership, no-op, and serialization guards.
 * @param {ClientDocument} doc - The document to update
 * @param {object} updateData - The update payload
 * @param {object} [options] - Options to pass to doc.update()
 * @returns {Promise<boolean>} - True if update was performed, false if skipped
 */
export async function safeUpdate(doc, updateData, options = {}) {
  if (!doc?.isOwner) return false;

  const entries = Object.entries(updateData || {});
  if (entries.length === 0) return false;

  const normalize = (value) =>
    value === undefined || value === null || value === "" ? "" : value;

  const hasChange = entries.some(([key, value]) => {
    if (value !== null && typeof value === "object") return true;
    const currentValue = normalize(foundry.utils.getProperty(doc, key));
    const nextValue = normalize(value);
    return currentValue !== nextValue;
  });

  if (!hasChange) return false;

  await queueUpdate(async () => {
    await doc.update(updateData, options);
  });
  return true;
}

// used under MIT license from https://github.com/trioderegion/dnd5e-helpers/
