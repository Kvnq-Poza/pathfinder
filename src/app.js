import { flatten } from "./logic/flatten.js";
import { generateSchema } from "./logic/scanner.js";
import {
  toOptionalChain,
  toJSONPath,
  toLodash,
  toDestructure,
} from "./logic/pathgen.js";
import { VirtualTree } from "./components/tree/virtualTree.js";
import {
  setJson,
  setSelectedNode,
  loadPersistedState,
  getState,
  clearState,
  subscribe,
} from "./logic/store.js";

// ── Globals ──────────────────────────────────────────────────────────────────
window.tree = null;
let _isMobile = window.innerWidth <= 768;
let currentTab = "tree";
let _schemaText = "";

// ── DOM refs ────────────────────────────────────────────────────────────────
const dropZone = document.getElementById("drop-zone");
const treePanel = document.getElementById("tree-panel");
const schemaPage = document.getElementById("schema-page");
const rightPanel = document.getElementById("right-panel");
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
const pathDisplay = document.getElementById("path-display");
const valueDisplay = document.getElementById("value-display");
const valueTypeBadge = document.getElementById("value-type-badge-wrap");
const sidebarSchema = document.getElementById("sidebar-schema-output");
const schemaPageOut = document.getElementById("schema-output");
const schemaPageSub = document.getElementById("schema-page-sub");
const treeInfo = document.getElementById("tree-info");
const virtualScroll = document.getElementById("virtual-scroll");
const virtualSpacer = document.getElementById("virtual-spacer");
const vNodesContainer = document.getElementById("v-nodes-container");
const drawerOverlay = document.getElementById("drawer-overlay");
const panelToggle = document.getElementById("panel-toggle");
const fileInput = document.getElementById("file-input");
const pasteArea = document.getElementById("paste-area");
const copySchemaBtn = document.getElementById("copy-schema-btn");

// ── Initialise virtual tree ─────────────────────────────────────────────────
window.tree = new VirtualTree({
  scrollEl: virtualScroll,
  spacerEl: virtualSpacer,
  containerEl: vNodesContainer,
  infoEl: treeInfo,
  onSelect: onNodeSelect,
});

// ── Boot: restore persisted state ───────────────────────────────────────────
if (loadPersistedState()) {
  const { json } = getState();
  if (json !== null) {
    initWithJson(json);
  }
}

// ── Extension: Check for pending JSON from background ───────────────────────
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["pending_json"], (result) => {
    if (result.pending_json) {
      const json = result.pending_json;
      chrome.storage.local.remove("pending_json");
      parseRaw(json);
    }
  });
}

// ── State subscription ───────────────────────────────────────────────────────
subscribe((state) => {
  const schemaTab = document.querySelector('.app-tab[data-tab="schema"]');
  if (state.json !== null) {
    showTreePanel();
    if (schemaTab) {
      schemaTab.style.opacity = "1";
      schemaTab.style.pointerEvents = "auto";
      schemaTab.style.cursor = "pointer";
      schemaTab.title = "";
    }
  } else {
    showDropZone();
    if (schemaTab) {
      schemaTab.style.opacity = "0.4";
      schemaTab.style.pointerEvents = "none";
      schemaTab.style.cursor = "not-allowed";
      schemaTab.title = "Load JSON to enable Schema view";
    }
  }
});

// ── Event Listeners ─────────────────────────────────────────────────────────

// Tabs
document.querySelectorAll(".app-tab").forEach((t) => {
  t.addEventListener("click", () => switchTab(t.dataset.tab));
});

// Sidebar & Panel controls
panelToggle.addEventListener("click", togglePanel);
drawerOverlay.addEventListener("click", closePanel);

// File handling
document
  .getElementById("file-trigger-btn")
  .addEventListener("click", triggerFile);
fileInput.addEventListener("change", (e) => handleFileInput(e.target));

// Drop zone
dropZone.addEventListener("dragover", onDragOver);
dropZone.addEventListener("dragleave", onDragLeave);
dropZone.addEventListener("drop", onDrop);
dropZone.addEventListener("click", handleDropZoneClick);

// Paste area
pasteArea.addEventListener("click", (e) => e.stopPropagation());
pasteArea.addEventListener("keydown", (e) => e.stopPropagation());
pasteArea.addEventListener("input", clearError);

// Actions
document.getElementById("parse-btn")?.addEventListener("click", parsePaste);
document
  .getElementById("load-sample-btn")
  ?.addEventListener("click", loadSample);
document.getElementById("clear-btn")?.addEventListener("click", clearAll);
document
  .getElementById("collapse-all-btn")
  ?.addEventListener("click", () => window.tree && window.tree.collapseAll());
document
  .getElementById("expand-all-btn")
  ?.addEventListener("click", () => window.tree && window.tree.expandAll());

// Schema
copySchemaBtn.addEventListener("click", copySchema);
document
  .querySelector(".schema-panel .copy-mini")
  .addEventListener("click", copySchema);

// Search
searchInput.addEventListener("input", (e) => onSearch(e.target.value));
searchClear.addEventListener("click", clearSearch);

// ── Functions ───────────────────────────────────────────────────────────────

function switchTab(tab) {
  if (tab === "schema") {
    const { json } = getState();
    if (json === null) return;
  }
  currentTab = tab;
  document.querySelectorAll(".app-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });

  treePanel.classList.remove("visible");
  schemaPage.style.display = "none";

  const { json } = getState();

  if (tab === "tree") {
    if (json !== null) treePanel.classList.add("visible");
    else dropZone.classList.remove("hidden");
  } else if (tab === "schema") {
    schemaPage.style.display = "block";
  }
}

function showDropZone() {
  dropZone.classList.remove("hidden");
  treePanel.classList.remove("visible");
  panelToggle.style.display = "none";
}

function showTreePanel() {
  dropZone.classList.add("hidden");
  if (currentTab === "tree") {
    treePanel.classList.add("visible");
  }
  panelToggle.style.display = "";
}

function triggerFile() {
  fileInput.click();
}

function handleFileInput(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => parseRaw(e.target.result);
  reader.readAsText(file);
  input.value = "";
}

function onDragOver(e) {
  e.preventDefault();
  dropZone.classList.add("drag-over");
}

function onDragLeave() {
  dropZone.classList.remove("drag-over");
}

function onDrop(e) {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => parseRaw(ev.target.result);
  reader.readAsText(file);
}

function handleDropZoneClick(e) {
  if (
    e.target === dropZone ||
    e.target.closest(".drop-icon") ||
    e.target.closest(".drop-title") ||
    e.target.closest(".drop-sub")
  ) {
    triggerFile();
  }
}

function parsePaste() {
  const text = pasteArea.value.trim();
  if (!text) return;
  parseRaw(text);
}

function parseRaw(text) {
  try {
    const json = JSON.parse(text);
    setJson(json, text);
    initWithJson(json);
    switchTab("tree");
  } catch (err) {
    const msg = "Parse Error: " + err.message;
    showError(msg);
  }
}

function showError(msg) {
  const el = document.getElementById("error-msg");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 5000);
}

function clearError() {
  document.getElementById("error-msg").style.display = "none";
}

function initWithJson(json) {
  window.tree.load(json);
  _schemaText = generateSchema(json, "Root");
  renderSchema(_schemaText);
  showTreePanel();
  resetPathPanel();
}

function loadSample() {
  const sample = {
    user: {
      id: 1042,
      name: "Alice Nakamura",
      email: "alice@example.com",
      role: "admin",
      active: true,
      preferences: {
        theme: "dark",
        language: "en-US",
        notifications: true,
        dashboard: {
          layout: "grid",
          widgets: ["activity", "stats", "calendar"],
        },
      },
    },
    session: {
      token: "eyJhbGciOiJIUzI1NiJ9.abc123",
      expires_at: "2025-12-31T23:59:59Z",
      ip_address: "192.168.1.1",
      device: "MacBook Pro / Chrome 120",
    },
    permissions: ["read", "write", "admin", "audit"],
    metadata: {
      version: "2.1.0",
      last_updated: "2025-06-01",
      flags: {
        beta_features: false,
        two_factor: true,
        api_access: null,
        rate_limit: 1000,
      },
    },
    audit_log: [
      {
        action: "login",
        timestamp: "2025-06-01T10:00:00Z",
        success: true,
        ip: "192.168.1.1",
      },
      {
        action: "update_profile",
        timestamp: "2025-06-02T15:30:00Z",
        success: true,
        ip: "192.168.1.2",
      },
      {
        action: "failed_auth",
        timestamp: "2025-06-03T09:15:00Z",
        success: false,
        ip: "10.0.0.1",
      },
    ],
  };
  const raw = JSON.stringify(sample, null, 2);
  setJson(sample, raw);
  initWithJson(sample);
  switchTab("tree");
}

function onNodeSelect(node) {
  setSelectedNode(node);
  updatePathPanel(node);
  updateValuePanel(node);

  const schemaName =
    node.key === "Root" || !node.key ? "Root" : pascal(node.key);
  _schemaText = generateSchema(node.value, schemaName);
  renderSchema(_schemaText);
}

function pascal(str) {
  return String(str)
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function resetPathPanel() {
  pathDisplay.innerHTML =
    '<div class="path-empty"><i class="fa-solid fa-hand-pointer fa-xs"></i> Select a node in the tree</div>';
  valueDisplay.innerHTML = '<div class="value-empty">No node selected</div>';
  valueTypeBadge.innerHTML = "";

  const { json } = getState();
  if (json) {
    _schemaText = generateSchema(json, "Root");
    renderSchema(_schemaText);
  }
}

function updatePathPanel(node) {
  const path = node.path;
  const oc = toOptionalChain(path);
  const jp = toJSONPath(path);
  const lo = toLodash(path);
  const ds = toDestructure(path);

  pathDisplay.innerHTML = `
<div class="path-variants">
  ${makeVariant("Optional Chain", oc)}
  ${makeVariant("JSONPath", jp)}
  ${makeVariant("Lodash get()", lo)}
  ${makeVariant("Destructure", ds)}
</div>`;

  // Attach listeners to new copy buttons
  pathDisplay.querySelectorAll(".copy-mini").forEach((btn) => {
    btn.onclick = () => {
      const parent = btn.closest(".path-variant-code");
      const text = parent.querySelector(".code-text").textContent;
      copyText(text, btn);
    };
  });
}

function makeVariant(label, code) {
  const escaped = escHtml(code);
  return `<div class="path-variant">
<div class="path-variant-label">${label}</div>
<div class="path-variant-code">
  <span class="code-text">${escaped}</span>
  <button class="copy-mini">
    <i class="fa-regular fa-copy"></i>
  </button>
</div>
</div>`;
}

function updateValuePanel(node) {
  const typeClass =
    {
      string: "badge-string",
      number: "badge-number",
      boolean: "badge-boolean",
      object: "badge-object",
      array: "badge-array",
      null: "badge-null",
    }[node.type] || "badge-object";

  valueTypeBadge.innerHTML = `<span class="value-type-badge ${typeClass}">${node.type.toUpperCase()}</span>`;

  let html;
  if (node.isLeaf) {
    const colVar =
      {
        string: "--str",
        number: "--num",
        boolean: "--bool",
        null: "--null-col",
      }[node.type] || "--text";
    const display =
      node.type === "string"
        ? `"${escHtml(String(node.value))}"`
        : String(node.value);
    html = `<div class="value-content" style="color:var(${colVar})">${display}</div>`;
  } else {
    try {
      const jsonStr = JSON.stringify(node.value, null, 2);
      const preview =
        jsonStr.length > 600 ? jsonStr.slice(0, 600) + "\n…" : jsonStr;
      html = `<div class="value-content" style="color:var(--text-dim)">${escHtml(preview)}</div>`;
    } catch {
      html = `<div class="value-content">[Complex Object]</div>`;
    }
  }
  valueDisplay.innerHTML = html;
}

function renderSchema(text) {
  const highlighted = highlightSchema(text);
  sidebarSchema.innerHTML = highlighted;
  schemaPageOut.innerHTML = highlighted;
  if (schemaPageSub) {
    const count = (text.match(/^interface /gm) || []).length;
    schemaPageSub.textContent = `${count} interface${count !== 1 ? "s" : ""} generated`;
  }
  if (copySchemaBtn) copySchemaBtn.disabled = false;
}

function highlightSchema(text) {
  return escHtml(text)
    .replace(/\b(interface)\b/g, '<span class="schema-kw">$1</span>')
    .replace(
      /interface <span class="schema-kw">(\w+)<\/span>/g,
      'interface <span class="schema-kw">$1</span>',
    )
    .replace(
      /interface (\w+)/g,
      'interface <span class="schema-name">$1</span>',
    )
    .replace(/: ([\w<>|()\[\] ]+);/g, ': <span class="schema-type">$1</span>;')
    .replace(/^  ([\w']+):/gm, '  <span class="schema-prop">$1</span>:')
    .replace(/([{}])/g, '<span class="schema-brace">$1</span>')
    .replace(/\/\/.*/g, '<span style="color:var(--text-dim)">$&</span>');
}

function copySchema() {
  if (!_schemaText) return;
  navigator.clipboard
    .writeText(_schemaText)
    .then(() => showToast("Schema copied!"));
}

function onSearch(val) {
  searchClear.classList.toggle("visible", val.length > 0);
  window.tree && window.tree.setSearch(val);
}

function clearSearch() {
  searchInput.value = "";
  searchClear.classList.remove("visible");
  window.tree && window.tree.setSearch("");
  searchInput.focus();
}

function clearAll() {
  clearState();
  window.tree.load({});
  window.tree.allNodes = [];
  window.tree.visibleNodes = [];
  _schemaText = "";
  sidebarSchema.innerHTML =
    '<span style="color:var(--text-dim);font-style:italic;">Load JSON to generate schema…</span>';
  schemaPageOut.innerHTML =
    '<span style="color:var(--text-dim);font-style:italic;">// Schema will appear here once JSON is loaded…</span>';
  searchInput.value = "";
  searchClear.classList.remove("visible");
  resetPathPanel();
  pasteArea.value = "";
  switchTab("tree");
  showDropZone();
}

function openPanel() {
  rightPanel.classList.add("open");
  drawerOverlay.classList.add("open");
}

function closePanel() {
  rightPanel.classList.remove("open");
  drawerOverlay.classList.remove("open");
}

function togglePanel() {
  if (rightPanel.classList.contains("open")) {
    closePanel();
  } else {
    openPanel();
  }
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    if (currentTab !== "tree") switchTab("tree");
    searchInput.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    window.tree && window.tree.collapseAll();
  }
  if (e.key === "Escape") {
    searchInput.blur();
    closePanel();
  }
});

// Resize
window.addEventListener("resize", () => {
  _isMobile = window.innerWidth <= 768;
  if (!_isMobile) closePanel();
});

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const oldInner = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = oldInner;
        btn.classList.remove("copied");
      }, 1500);
    }
    showToast("Path copied!");
  });
}

let _toastTimeout;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`;
  t.classList.add("show");
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => t.classList.remove("show"), 2200);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
