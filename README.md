# PathFinder 🧭

**Stop guessing your JSON paths.**

PathFinder is a zero-dependency, high-performance visual tool designed for mapping, querying, and generating access logic for deeply nested JSON structures. Built with vanilla web technologies, it offers a premium, lightweight experience for developers working with complex data.

## ✨ Features

- ⚡ **High Performance**: Renders 100,000+ nodes at a constant 60fps using a custom Virtual Scroll engine.
- 🔗 **Multi-format Path Generation**: Instantly generate accessors for:
  - **Optional Chaining**: `user?.profile?.settings?.['theme']`
  - **JSONPath**: `$.user.profile.settings.theme`
  - **Lodash `get()`**: `_.get(obj, 'user.profile.settings.theme')`
  - **Destructuring**: `const { user: { profile: { settings: { theme } } } } = obj;`
- 🛡️ **Privacy First**: 100% client-side. Your data never leaves your browser. Zero telemetry, zero tracking.
- 🏗️ **TypeScript Schema Generation**: Automatically infer full interface definitions from your JSON, including support for union types and nested structures.
- 🔍 **Live Search**: Instant search across all keys and values with automatic path expansion and matching highlights.
- 📂 **Drag & Drop**: Load files up to 10MB+ instantly. Your state is persisted locally via `sessionStorage` across reloads.
- 📱 **Fully Responsive**: Premium dark-mode UI that works beautifully on desktop and mobile.

## 🛠️ Project Structure

The project is built using a clean, modular architecture without the overhead of heavy frameworks:

```text
├── index.html          # Landing page & documentation
├── tool.html           # Main application interface
├── public/             # Static assets (favicons, etc.)
└── src/
    ├── components/     # UI Components (VirtualTree, etc.)
    ├── logic/          # Core utilities (Flattening, PathGen, Schema Scanner)
    ├── styles/         # Modular CSS system (Variables, Global, Components)
```

## 🚀 Getting Started

Since PathFinder has **zero dependencies**, you can run it locally without `npm install`:

1. Clone the repository:
   ```bash
   git clone https://github.com/Kvnq-Poza/pathfinder.git
   ```
2. Open `index.html` in your favorite browser.
   _(Or use a simple local server like Live Server for the best experience with ES Modules)_

## ⌨️ Shortcuts

| Shortcut   | Action                      |
| ---------- | --------------------------- |
| `Ctrl + F` | Focus Search Input          |
| `Ctrl + /` | Collapse All Nodes          |
| `Esc`      | Clear Search / Close Panels |

## ⚖️ License

MIT License. Open source and free to use forever.

---

_Built with ❤️ for the JS.ORG ecosystem._
