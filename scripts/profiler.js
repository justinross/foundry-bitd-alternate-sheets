const MODULE_ID = "bitd-alternate-sheets";
const PREFIX = "[bitd-alt-profiler]";

export class Profiler {
  static get enabled() {
    try {
      return game?.settings?.get?.(MODULE_ID, "enableProfilingLogs") === true;
    } catch (err) {
      return false;
    }
  }

  static log(label, data = {}) {
    if (!Profiler.enabled) return;
    try {
      console.log(
        PREFIX,
        label,
        JSON.stringify({
          ...data,
          ts: Date.now(),
        })
      );
    } catch (err) {
      // Swallow logging errors to avoid impacting runtime.
    }
  }

  /**
   * Measure the duration of an async or sync function and log the result.
   * @param {string} label
   * @param {Function} fn
   * @param {object} meta optional metadata to include in the log
   * @returns {*} return value of fn
   */
  static async time(label, fn, meta = {}) {
    if (!Profiler.enabled) return fn();
    const start = performance.now();
    let success = true;
    try {
      return await fn();
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const duration = performance.now() - start;
      Profiler.log(label, { duration, success, ...meta });
    }
  }
}
