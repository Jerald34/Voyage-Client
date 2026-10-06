/**
 * Prints a ready PDF, so the paper copy is the very file the PDF button saves.
 *
 * Desktop browsers print a PDF loaded into a hidden frame. iPhone and iPad can't
 * print a frame, but the share sheet deliverPdf opens has "Print" in it.
 *
 * Call printPdf synchronously from the click handler, with no await before it:
 * the tab it falls back to needs the tap's activation, like deliverPdf's.
 */

import { deliverPdf, isAppleMobile } from "./pdfDelivery.js";

const CLEAN_UP_AFTER_MS = 60_000;
// A PDF that hasn't shown up in the frame by now isn't going to (a browser set to
// download PDFs, say), so show it in a tab instead.
const LOAD_TIMEOUT_MS = 15_000;
// Firefox fires the frame's load event before its PDF viewer can print.
const FIREFOX_SETTLE_MS = 1_000;

// One print frame at a time: a second tap replaces the first tap's leftovers.
let activeFrame = null;

function browserEnv() {
  return { navigator: window.navigator, document: window.document, window, URL: window.URL };
}

function printThroughFrame(file, env) {
  activeFrame?.dispose();

  const url = env.URL.createObjectURL(file);
  const frame = env.document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.setAttribute("title", "Itinerary for printing");
  // visibility:hidden, not display:none: a frame that isn't rendered doesn't print.
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.src = url;

  return new Promise((resolve) => {
    const timers = new Set();
    const later = (fn, ms) => {
      const id = env.window.setTimeout(fn, ms);
      timers.add(id);
      return id;
    };
    const dispose = () => {
      timers.forEach((id) => env.window.clearTimeout(id));
      timers.clear();
      frame.remove();
      env.URL.revokeObjectURL(url);
      if (activeFrame?.dispose === dispose) activeFrame = null;
    };
    activeFrame = { dispose };

    // The person prints from the tab's own viewer. The blob URL the tab is showing
    // lives until cleanup. A frame that loads after this must not print as well.
    let handedToTab = false;
    const openInTab = () => {
      handedToTab = true;
      const tab = env.window.open(url, "_blank");
      resolve(tab ? "opened" : "failed");
    };

    const loadTimeout = later(openInTab, LOAD_TIMEOUT_MS);
    frame.addEventListener("load", () => {
      if (handedToTab) return;
      env.window.clearTimeout(loadTimeout);
      const settle = /firefox/i.test(env.navigator.userAgent) ? FIREFOX_SETTLE_MS : 0;
      later(() => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          resolve("printed");
        } catch {
          openInTab();
        }
      }, settle);
    });

    later(dispose, CLEAN_UP_AFTER_MS);
    env.document.body.appendChild(frame);
  });
}

/**
 * @param {File} file
 * @param {{ title?: string }} [options]
 * @returns {Promise<"printed" | "opened" | "failed" | "shared" | "cancelled">}
 *   The share-sheet outcomes come back only on iPhone and iPad.
 */
export function printPdf(file, { title = "" } = {}, env = browserEnv()) {
  if (isAppleMobile(env.navigator)) return deliverPdf(file, { title }, env);
  return printThroughFrame(file, env);
}
