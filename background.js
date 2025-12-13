"use strict";

// Track tabs we trigger a redirect on to prevent redirect loops.
const redirectingTabs = new Set();

function shouldIgnore(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://")
  );
}

function sanitizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const params = url.searchParams;
    let changed = false;

    for (const key of Array.from(params.keys())) {
      if (key.toLowerCase().startsWith("utm_")) {
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
