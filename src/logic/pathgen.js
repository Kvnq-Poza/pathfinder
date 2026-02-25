/**
 * pathgen.js
 * Generates multiple accessor formats from a dot/bracket path string.
 */

/**
 * Generate an optional-chaining JS accessor.
 * e.g. "user.address['my-key'][0]" → "root?.user?.address?.['my-key']?.[0]"
 * @param {string} path - Raw path from flatten (empty string = root)
 * @returns {string}
 */
export function toOptionalChain(path) {
  if (!path) return "root";

  // Tokenise the path into segments: dot-key, bracket-index, bracket-string-key
  const tokens = tokenisePath(path);
  let result = "root";
  for (const tok of tokens) {
    if (tok.type === "dot") {
      result += `?.${tok.key}`;
    } else {
      // bracket (numeric index or string key)
      result += `?.[${tok.raw}]`;
    }
  }
  return result;
}

/**
 * Generate a JSONPath expression.
 * @param {string} path
 * @returns {string}
 */
export function toJSONPath(path) {
  if (!path) return "$";
  const tokens = tokenisePath(path);
  let result = "$";
  for (const tok of tokens) {
    if (tok.type === "dot") {
      result += `.${tok.key}`;
    } else if (tok.numeric) {
      result += `[${tok.key}]`;
    } else {
      result += `['${tok.key}']`;
    }
  }
  return result;
}

/**
 * Generate a Lodash _.get() accessor.
 * @param {string} path
 * @returns {string}
 */
export function toLodash(path) {
  if (!path) return "_.get(obj, '')";
  return `_.get(obj, '${path.replace(/'/g, "\\'")}')`;
}

/**
 * Generate a destructuring hint (for simple single-level paths).
 * @param {string} path
 * @returns {string}
 */
export function toDestructure(path) {
  if (!path) return "const { ... } = root;";
  const tokens = tokenisePath(path);
  const last = tokens[tokens.length - 1];
  const key = last ? last.key : "value";
  const parent = toOptionalChain(
    path
      .slice(0, path.length - String(key).length - 1)
      .replace(/\.$/, "")
      .replace(/\[.*$/, ""),
  );
  return `const { ${key} } = ${parent || "root"};`;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Tokenise a raw path string into an array of segment descriptors.
 * Handles:  key.subkey   key[0]   key['special-key']   key["other"]
 */
function tokenisePath(path) {
  const tokens = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === ".") {
      i++; // skip dot
      const start = i;
      while (i < path.length && path[i] !== "." && path[i] !== "[") i++;
      const key = path.slice(start, i);
      if (key) tokens.push({ type: "dot", key, raw: key, numeric: false });
    } else if (path[i] === "[") {
      i++; // skip [
      if (path[i] === '"' || path[i] === "'") {
        const quote = path[i++];
        const start = i;
        while (i < path.length && path[i] !== quote) i++;
        const key = path.slice(start, i);
        i += 2; // skip quote + ]
        tokens.push({ type: "bracket", key, raw: `'${key}'`, numeric: false });
      } else {
        const start = i;
        while (i < path.length && path[i] !== "]") i++;
        const key = path.slice(start, i);
        i++; // skip ]
        tokens.push({
          type: "bracket",
          key,
          raw: key,
          numeric: /^\d+$/.test(key),
        });
      }
    } else {
      // initial identifier (root segment, no leading dot)
      const start = i;
      while (i < path.length && path[i] !== "." && path[i] !== "[") i++;
      const key = path.slice(start, i);
      if (key) tokens.push({ type: "dot", key, raw: key, numeric: false });
    }
  }
  return tokens;
}
