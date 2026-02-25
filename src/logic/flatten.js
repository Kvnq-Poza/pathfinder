/**
 * flatten.js
 * Converts a JSON object into a flat array of node descriptors.
 * Each node contains metadata needed for virtual rendering and path generation.
 */

let _idCounter = 0;

/**
 * @param {*} value - The JSON value to flatten
 * @param {string|number} key - The key for this value
 * @param {string} path - Dot/bracket path from root
 * @param {number} depth - Nesting depth
 * @param {number|null} parentId - Parent node id
 * @param {Node[]} out - Output array (mutated in place)
 * @returns {Node} The created node
 */
function _flatten(value, key, path, depth, parentId, out) {
  const id = ++_idCounter;
  const type = detectType(value);
  const isLeaf =
    type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "null";

  /** @type {Node} */
  const node = {
    id,
    key,
    path,
    value,
    type,
    depth,
    parentId,
    isLeaf,
    childCount: 0,
    childrenStart: -1, // index in flat array where children begin
  };

  out.push(node);

  if (!isLeaf) {
    const entries =
      type === "array" ? value.map((v, i) => [i, v]) : Object.entries(value);
    node.childCount = entries.length;
    node.childrenStart = out.length; // mark before children are added

    for (const [k, v] of entries) {
      const childPath = buildSegment(path, k, type);
      _flatten(v, k, childPath, depth + 1, id, out);
    }
  }

  return node;
}

/**
 * Public API: flatten a JSON value into a flat node array.
 * @param {*} json - Parsed JSON value
 * @returns {Node[]}
 */
export function flatten(json) {
  _idCounter = 0;
  const out = [];
  _flatten(json, "root", "", 0, null, out);
  return out;
}

/**
 * Returns the JS type string for a value.
 * @param {*} v
 * @returns {'null'|'array'|'string'|'number'|'boolean'|'object'}
 */
export function detectType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v; // 'string' | 'number' | 'boolean' | 'object'
}

/**
 * Builds an accessor path segment given a parent path, key, and parent type.
 * @param {string} parent
 * @param {string|number} key
 * @param {string} parentType
 * @returns {string}
 */
export function buildSegment(parent, key, parentType) {
  if (parentType === "array") {
    return parent ? `${parent}[${key}]` : `[${key}]`;
  }
  // Object key
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(key))) {
    return parent ? `${parent}.${key}` : String(key);
  }
  // Needs bracket notation for special characters
  const escaped = String(key).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return parent ? `${parent}['${escaped}']` : `['${escaped}']`;
}
