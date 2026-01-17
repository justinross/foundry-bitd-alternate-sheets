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
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });

      /** only kick off a batch of updates if none are in flight */
      if (!this.inFlight) {
        this.runUpdate();
      }
    });
  }

  async runUpdate(){

    this.inFlight = true;

    while(this.queue.length > 0) {

      /** Process from front of queue (FIFO) to maintain submission order */
      const { fn: updateFn, resolve, reject } = this.queue.shift();

      /** wait for the update to complete */
      try {
        const result = await updateFn();
        resolve(result);
      } catch (err) {
        // Normalize to Error object, preserving original as cause
        const error = err instanceof Error ? err : new Error(String(err), { cause: err });

        // Error funnel: stack traces + ecosystem hooks (no UI)
        Hooks.onError("BitD-Alt.QueuedUpdate", error, {
          msg: "[BitD-Alt]",
          log: "error",
          notify: null,
          data: { entityType: this.entityType }
        });

        // User notification (sanitized, no console - already logged)
        ui.notifications.error("[BitD-Alt] Failed to save change. Your data may not have been saved.", {
          console: false
        });

        reject(error);
      }
    }

    this.inFlight = false;

  }
}

let updateQueue = new UpdateQueue("All");

/**
 * Safely manages concurrent updates to the provided entity type
 * @param {Function} updateFn   the function that handles the actual update (can be async)
 * @returns {Promise} resolves with the result of updateFn, or rejects on error
 */
export function queueUpdate(updateFn) {
  /** queue the update for this entity */
  return updateQueue.queueUpdate(updateFn);
}

// used under MIT license from https://github.com/trioderegion/dnd5e-helpers/