"use strict";

// Track tabs we trigger a redirect on to prevent redirect loops.
const redirectingTabs = new Set();

// Extendable list of tracking params to strip.
// - prefixes match keys starting with the value (e.g., "utm_" removes utm_source, utm_medium, etc.)
// - exact matches remove a specific key.
const TRACKING_PARAM_PREFIXES = ["utm_", "icid", "mc_", "mkt_", "oly_", "hsa_"];
const TRACKING_PARAM_KEYS = [
  "fbclid",
  "gclid",
  "msclkid",
  "igshid",
  "yclid",
  "dclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "pk_campaign",
  "pk_source",
  "pk_medium",
  "pk_content",
  "pk_kwd",
  "vero_id"
];

function shouldIgnore(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://")
  );
}

function isTrackingParam(keyLower) {
  return (
    TRACKING_PARAM_KEYS.includes(keyLower) ||
    TRACKING_PARAM_PREFIXES.some((prefix) => keyLower.startsWith(prefix))
  );
}

function sanitizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const params = url.searchParams;
    let changed = false;

    for (const key of Array.from(params.keys())) {
      const keyLower = key.toLowerCase();
      if (isTrackingParam(keyLower)) {
        params.delete(key);
        changed = true;
      }
    }

    if (!changed) {
      return null;
    }

    // Apply the updated params; URL will drop the "?" if no params remain.
    url.search = params.toString();
    return url.toString();
  } catch (err) {
    // Ignore invalid URLs.
    return null;
  }
}

function handleNavigation(tabId, url) {
  if (shouldIgnore(url)) return;

  if (redirectingTabs.has(tabId)) {
    redirectingTabs.delete(tabId);
    return;
  }

  const cleanedUrl = sanitizeUrl(url);
  if (!cleanedUrl || cleanedUrl === url) return;

  redirectingTabs.add(tabId);
  chrome.tabs.update(tabId, { url: cleanedUrl }, () => {
    if (chrome.runtime.lastError) {
      // Clear the flag so future navigations aren't blocked.
      redirectingTabs.delete(tabId);
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Trigger on URL change or when a navigation starts loading.
  if (changeInfo.url || changeInfo.status === "loading") {
    const targetUrl = changeInfo.url || tab.url;
    handleNavigation(tabId, targetUrl);
  }

  if (changeInfo.status === "complete") {
    redirectingTabs.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  redirectingTabs.delete(tabId);
});
