/**
 * scanner.js
 * Infers a TypeScript interface definition from a parsed JSON value.
 * Handles nested objects, union types for mixed arrays, and edge cases.
 */

/**
 * Generate full TypeScript interface definitions for a JSON value.
 * @param {*} json - Parsed JSON root
 * @param {string} rootName - Name for the root interface
 * @returns {string} TypeScript source string
 */
export function generateSchema(json, rootName = "Root") {
  const interfaces = new Map(); // name → lines[]
  inferInterface(json, rootName, interfaces);

  // Output in order, root first
  const parts = [];
  if (interfaces.has(rootName)) {
    parts.push(interfaces.get(rootName).join("\n"));
    interfaces.delete(rootName);
  }
  for (const lines of interfaces.values()) {
    parts.push(lines.join("\n"));
  }

  return parts.join("\n\n");
}

// ─── Internals ───────────────────────────────────────────────────────────────

let _ifaceCounter = 0;

/**
 * Infer and register a TypeScript interface for an object.
 * @param {object} obj
 * @param {string} name
 * @param {Map} interfaces
 */
function inferInterface(obj, name, interfaces) {
  if (interfaces.has(name)) return; // already processed

  const lines = [];
  lines.push(`interface ${name} {`);

  if (Array.isArray(obj)) {
    // Top-level array: describe its item type
    const itemType = inferArrayItemType(obj, name, interfaces);
    lines.push(`  [index: number]: ${itemType};`);
  } else if (obj !== null && typeof obj === "object") {
    for (const [key, val] of Object.entries(obj)) {
      const safeProp = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        ? key
        : `'${key}'`;
      const typeStr = inferType(val, pascal(key), name, interfaces);
      lines.push(`  ${safeProp}: ${typeStr};`);
    }
  }

  lines.push("}");
  interfaces.set(name, lines);
}

/**
 * Infer TypeScript type string for any JSON value.
 */
function inferType(val, propName, parentName, interfaces) {
  if (val === null) return "null";
  if (Array.isArray(val)) {
    if (val.length === 0) return "unknown[]";
    const itemType = inferArrayItemType(val, propName, interfaces);
    return needsParens(itemType) ? `(${itemType})[]` : `${itemType}[]`;
  }
  if (typeof val === "object") {
    // Nested object — generate a sub-interface
    const ifaceName = uniqueName(propName, interfaces);
    inferInterface(val, ifaceName, interfaces);
    return ifaceName;
  }
  return typeof val; // 'string' | 'number' | 'boolean'
}

/**
 * Infer the union type for an array's items.
 */
function inferArrayItemType(arr, propName, interfaces) {
  const typeSet = new Set();

  for (const item of arr) {
    if (item === null) {
      typeSet.add("null");
    } else if (Array.isArray(item)) {
      typeSet.add("unknown[]");
    } else if (typeof item === "object") {
      // Try to create one shared interface for all object items
      const ifaceName = propName + "Item";
      if (!interfaces.has(ifaceName)) {
        inferInterface(item, ifaceName, interfaces);
      }
      typeSet.add(ifaceName);
    } else {
      typeSet.add(typeof item);
    }
  }

  const types = [...typeSet];
  if (types.length === 1) return types[0];
  return types.join(" | ");
}

/** PascalCase a string */
function pascal(str) {
  return String(str)
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/** Ensure unique interface name */
function uniqueName(base, interfaces) {
  let name = pascal(base);
  if (!interfaces.has(name)) return name;
  let i = 2;
  while (interfaces.has(name + i)) i++;
  return name + i;
}

/** Union type strings with '|' need parentheses when used as array item */
function needsParens(type) {
  return type.includes(" | ");
}
