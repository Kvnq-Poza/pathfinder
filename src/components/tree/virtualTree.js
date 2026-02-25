/**
 * VirtualTree.js
 * Manages the virtual scroll tree: flattened node list, expand/collapse,
 * search filtering, rendering, and node selection.
 */

import { flatten } from "../../logic/flatten.js";

const ROW_H = 30;

export class VirtualTree {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.scrollEl    - The scrollable container
   * @param {HTMLElement} opts.spacerEl    - The height spacer
   * @param {HTMLElement} opts.containerEl - Where rows are rendered
   * @param {HTMLElement} opts.infoEl      - Node count display
   * @param {function} opts.onSelect       - Called with (node) on click
   */
  constructor(opts) {
    this.scrollEl = opts.scrollEl;
    this.spacerEl = opts.spacerEl;
    this.containerEl = opts.containerEl;
    this.infoEl = opts.infoEl;
    this.onSelect = opts.onSelect || (() => {});

    this.allNodes = []; // full flat list
    this.visibleNodes = []; // filtered by expansion + search
    this.expanded = new Set();
    this.selectedId = null;
    this.searchQuery = "";

    this._rafId = null;

    this.scrollEl.addEventListener("scroll", () => this._scheduleRender());
  }

  /** Load a new JSON value into the tree */
  load(json) {
    this.allNodes = flatten(json);
    this.expanded = new Set();
    this.selectedId = null;
    this.searchQuery = "";

    // Auto-expand root
    if (this.allNodes.length > 0) {
      this.expanded.add(this.allNodes[0].id);
    }

    this._rebuild();
    this.scrollEl.scrollTop = 0;
    this._render();
  }

  /** Set the search query and re-filter */
  setSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
    this._rebuild();
    this.scrollEl.scrollTop = 0;
    this._render();
  }

  /** Collapse all except root */
  collapseAll() {
    this.expanded.clear();
    if (this.allNodes.length > 0) this.expanded.add(this.allNodes[0].id);
    this._rebuild();
    this._render();
  }

  /** Expand all nodes */
  expandAll() {
    for (const n of this.allNodes) {
      if (!n.isLeaf) this.expanded.add(n.id);
    }
    this._rebuild();
    this._render();
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /** Rebuild visibleNodes from allNodes + expanded + search */
  _rebuild() {
    const q = this.searchQuery;
    const all = this.allNodes;
    const expanded = this.expanded;

    if (!q) {
      // No search: normal expand/collapse traversal
      this.visibleNodes = [];
      const skipDepthAbove = []; // stack of depths to skip

      for (let i = 0; i < all.length; i++) {
        const node = all[i];

        // Skip if inside a collapsed ancestor
        if (
          skipDepthAbove.length > 0 &&
          node.depth > skipDepthAbove[skipDepthAbove.length - 1]
        ) {
          continue;
        }
        // Clear skip markers no longer applicable
        while (
          skipDepthAbove.length > 0 &&
          node.depth <= skipDepthAbove[skipDepthAbove.length - 1]
        ) {
          skipDepthAbove.pop();
        }

        const isExpanded = !node.isLeaf && expanded.has(node.id);
        this.visibleNodes.push({ ...node, isExpanded });

        if (!node.isLeaf && !isExpanded) {
          skipDepthAbove.push(node.depth);
        }
      }
    } else {
      // Search: show matching nodes + all their ancestors (auto-expanded)
      // Step 1: find all matching node ids
      const matchIds = new Set();
      const ancestorIds = new Set();

      for (const node of all) {
        const keyMatch = String(node.key).toLowerCase().includes(q);
        const valueMatch =
          node.isLeaf && String(node.value).toLowerCase().includes(q);
        if (keyMatch || valueMatch) {
          matchIds.add(node.id);
          // Mark all ancestors
          let pid = node.parentId;
          while (pid !== null && pid !== undefined) {
            ancestorIds.add(pid);
            const parent = all.find((n) => n.id === pid);
            pid = parent ? parent.parentId : null;
          }
        }
      }

      // Step 2: build visible list — include ancestors + matching nodes
      //         collapse non-ancestor containers that aren't expanded
      this.visibleNodes = [];
      const skipDepth = [];

      for (let i = 0; i < all.length; i++) {
        const node = all[i];

        // Pop stale skip markers
        while (
          skipDepth.length > 0 &&
          node.depth <= skipDepth[skipDepth.length - 1]
        ) {
          skipDepth.pop();
        }

        if (
          skipDepth.length > 0 &&
          node.depth > skipDepth[skipDepth.length - 1]
        ) {
          continue;
        }

        const isAncestor = ancestorIds.has(node.id);
        const isMatch = matchIds.has(node.id);
        const isExpanded =
          expanded.has(node.id) || (isAncestor && !node.isLeaf);

        if (!isAncestor && !isMatch) {
          // Not relevant — skip its subtree too
          if (!node.isLeaf) skipDepth.push(node.depth);
          continue;
        }

        this.visibleNodes.push({ ...node, isExpanded, isSearchMatch: isMatch });

        if (!node.isLeaf && !isExpanded) {
          skipDepth.push(node.depth);
        }
      }
    }

    // Update spacer height
    this.spacerEl.style.height = this.visibleNodes.length * ROW_H + "px";

    // Update count info
    if (this.infoEl) {
      this.infoEl.textContent = `${this.visibleNodes.length} / ${this.allNodes.length} nodes`;
    }
  }

  _scheduleRender() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._render());
  }

  _render() {
    const st = this.scrollEl.scrollTop;
    const vh = this.scrollEl.clientHeight;

    const start = Math.max(0, Math.floor(st / ROW_H) - 4);
    const end = Math.min(
      this.visibleNodes.length,
      Math.ceil((st + vh) / ROW_H) + 4,
    );

    this.containerEl.style.top = start * ROW_H + "px";

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      frag.appendChild(this._makeRow(this.visibleNodes[i]));
    }

    this.containerEl.innerHTML = "";
    this.containerEl.appendChild(frag);
  }

  _makeRow(node) {
    const row = document.createElement("div");
    row.className =
      "v-node" +
      (node.id === this.selectedId ? " selected" : "") +
      (node.isSearchMatch ? " search-match" : "");
    row.style.paddingLeft = 8 + node.depth * 18 + "px";
    row.dataset.id = node.id;

    // Arrow
    const arrow = document.createElement("i");
    if (node.isLeaf) {
      arrow.className = "v-node-arrow leaf";
    } else {
      arrow.className = "v-node-arrow" + (node.isExpanded ? " open" : "");
      arrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    }
    row.appendChild(arrow);

    // Key
    const keyEl = document.createElement("span");
    keyEl.className = "v-node-key";
    keyEl.textContent =
      typeof node.key === "number" ? node.key : `"${node.key}"`;
    row.appendChild(keyEl);

    // Colon
    const colon = document.createElement("span");
    colon.className = "v-node-colon";
    colon.textContent = ":";
    row.appendChild(colon);

    // Value or bracket
    if (node.isLeaf) {
      const valEl = document.createElement("span");
      valEl.className = `v-node-val-${node.type}`;
      valEl.textContent =
        node.type === "string"
          ? `"${truncate(String(node.value), 80)}"`
          : String(node.value);
      row.appendChild(valEl);
    } else {
      const bracket = document.createElement("span");
      bracket.className = "v-node-bracket";
      bracket.textContent = node.type === "array" ? "[…]" : "{…}";
      row.appendChild(bracket);

      const count = document.createElement("span");
      count.className = "v-node-count";
      count.textContent =
        node.type === "array"
          ? `${node.childCount} item${node.childCount !== 1 ? "s" : ""}`
          : `${node.childCount} key${node.childCount !== 1 ? "s" : ""}`;
      row.appendChild(count);
    }

    row.addEventListener("click", () => this._handleClick(node));
    return row;
  }

  _handleClick(node) {
    if (!node.isLeaf) {
      // Find the full node from allNodes (not the spread copy)
      const fullNode = this.allNodes.find((n) => n.id === node.id);
      if (fullNode) {
        if (this.expanded.has(fullNode.id)) {
          this.expanded.delete(fullNode.id);
        } else {
          this.expanded.add(fullNode.id);
        }
        this._rebuild();
        this._render();
      }
    }

    this.selectedId = node.id;
    this.onSelect(node);

    // Re-render to update selection highlight
    this._render();
  }
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}
