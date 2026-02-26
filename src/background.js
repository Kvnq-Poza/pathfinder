/**
 * PathFinder Background Service Worker
 * Handles context menu creation and message passing.
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for selected text
  chrome.contextMenus.create({
    id: "open-in-pathfinder",
    title: "Open in PathFinder",
    contexts: ["selection", "link"],
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("tool.html") });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_tool") {
    chrome.tabs.create({ url: chrome.runtime.getURL("tool.html") });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-in-pathfinder") {
    if (info.selectionText) {
      openPathFinder(info.selectionText);
    } else if (info.linkUrl) {
      fetch(info.linkUrl)
        .then((response) => {
          if (!response.ok) throw new Error("HTTP error " + response.status);
          return response.text();
        })
        .then((text) => openPathFinder(text))
        .catch((err) => {
          console.error("PathFinder: Failed to fetch link content:", err);
          // Optional: notify user of failure
        });
    }
  }
});

/**
 * Validates JSON structure and opens tool.html with the data.
 */
function openPathFinder(jsonString) {
  try {
    const trimmed = jsonString.trim();
    const isProbablyJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"));

    if (!isProbablyJson) {
      throw new Error("Selection does not appear to be valid JSON");
    }

    chrome.storage.local.set({ pending_json: jsonString }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("tool.html") });
    });
  } catch (e) {
    console.warn("PathFinder: Selection is not valid JSON:", e.message);
  }
}
