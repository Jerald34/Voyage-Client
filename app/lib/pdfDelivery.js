/**
 * Hands a ready PDF to the device in a way that device supports.
 *
 * jsPDF's doc.save() clicks a detached <a download href="blob:…"> on a timer.
 * Desktop and Android honour that. iOS ignores it in home-screen apps and only
 * honours it in Safari inside the tap's own activation, and in-app browsers
 * never download blobs. iPhone/iPad therefore get the share sheet ("Save to
 * Files", "Print"…), which works in Safari and from the home screen.
 *
 * Call deliverPdf synchronously from the click handler, with no await before it:
 * navigator.share and window.open both need the tap's activation.
 */

const REVOKE_AFTER_MS = 60_000;

/** iPhone, iPod and iPad, including iPadOS, which reports a desktop Mac user agent. */
export function isAppleMobile(nav) {
  if (/iPad|iPhone|iPod/.test(String(nav?.userAgent ?? ""))) return true;
  return nav?.platform === "MacIntel" && Number(nav?.maxTouchPoints) > 1;
}

function canShareFile(nav, file) {
  if (typeof nav?.share !== "function" || typeof nav?.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] }) === true;
  } catch {
    return false;
  }
}

function supportsDownloadAttribute(doc) {
  return "download" in doc.createElement("a");
}

/** @returns {"share" | "download" | "open"} */
export function choosePdfDelivery(env, file) {
  const shareable = canShareFile(env.navigator, file);
  if (isAppleMobile(env.navigator)) return shareable ? "share" : "open";
  if (supportsDownloadAttribute(env.document)) return "download";
  return shareable ? "share" : "open";
}

function browserEnv() {
  return { navigator: window.navigator, document: window.document, window, URL: window.URL };
}

/**
 * @param {File} file
 * @param {{ title?: string }} [options]
 * @returns {Promise<"shared" | "cancelled" | "downloaded" | "opened" | "failed">}
 */
export function deliverPdf(file, { title = "" } = {}, env = browserEnv()) {
  const strategy = choosePdfDelivery(env, file);

  if (strategy === "share") {
    return env.navigator.share({ files: [file], title }).then(
      () => "shared",
      (error) => (error?.name === "AbortError" ? "cancelled" : "failed"),
    );
  }

  const url = env.URL.createObjectURL(file);
  env.window.setTimeout(() => env.URL.revokeObjectURL(url), REVOKE_AFTER_MS);

  if (strategy === "download") {
    const link = env.document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    link.style.display = "none";
    // Attached, because Firefox ignores clicks on detached links.
    env.document.body.appendChild(link);
    link.click();
    link.remove();
    return Promise.resolve("downloaded");
  }

  // No "noopener" feature: with it, window.open always returns null and a blocked tab can't be detected.
  const tab = env.window.open(url, "_blank");
  return Promise.resolve(tab ? "opened" : "failed");
}
