import { MODULE_ID } from "./utils.js";

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
      const msg = `${PREFIX} ${label} ${(data.duration || 0).toFixed(2)}ms`;
      console.log(msg, data);

      // Also show a toast notification for visibility
      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.info(`${label}: ${(data.duration || 0).toFixed(2)}ms`);
      }
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
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      Profiler.log(label, { duration, ...meta });
    }
  }
}
