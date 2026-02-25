/**
 * store.js
 * Single Source of Truth for PathFinder application state.
 * Persists JSON input to sessionStorage so it survives page reloads.
 */

const STORAGE_KEY = "pathfinder_json_v1";
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB localStorage limit safety

/** @type {{ json: any, rawText: string, selectedNode: object|null }} */
const _state = {
  json: null,
  rawText: "",
  selectedNode: null,
};

const _listeners = new Set();

/** Subscribe to state changes. Returns unsubscribe function. */
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _emit() {
  for (const fn of _listeners) fn({ ..._state });
}

/** Load persisted JSON from sessionStorage on startup */
export function loadPersistedState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _state.json = parsed.json;
      _state.rawText = parsed.rawText || "";
      return true;
    }
  } catch (_) {
    /* ignore */
  }
  return false;
}

/** Set the parsed JSON and persist it */
export function setJson(json, rawText) {
  _state.json = json;
  _state.rawText = rawText || "";
  _state.selectedNode = null;

  // Persist (skip if too large for storage)
  try {
    const serialized = JSON.stringify({ json, rawText });
    if (serialized.length < MAX_STORAGE_SIZE) {
      sessionStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (_) {
    /* storage full — ignore */
  }

  _emit();
}

/** Set the selected node */
export function setSelectedNode(node) {
  _state.selectedNode = node;
  _emit();
}

/** Clear all state */
export function clearState() {
  _state.json = null;
  _state.rawText = "";
  _state.selectedNode = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  _emit();
}

/** Get current state snapshot */
export function getState() {
  return { ..._state };
}
