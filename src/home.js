// Demo tree state
const demoExpanded = { root: false, user: false, tags: false };
const childMap = {
  root: "demo-children",
  user: "demo-user-ch",
  tags: "demo-tags-ch",
};
const arrowMap = { root: "arr-root", user: "arr-user", tags: "arr-tags" };

document.addEventListener("DOMContentLoaded", () => {
  // Dynamic footer year
  const footerYear = document.getElementById("footer-year");
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // Mobile menu
  const hamBtn = document.getElementById("ham-btn");
  const mobileMenu = document.getElementById("mobile-menu");

  if (hamBtn) {
    hamBtn.addEventListener("click", toggleMobileMenu);
  }

  // Close menu on outside click
  document.addEventListener("click", (e) => {
    if (
      mobileMenu &&
      !e.target.closest("#mobile-menu") &&
      !e.target.closest("#ham-btn")
    ) {
      mobileMenu.classList.remove("open");
    }
  });

  // Launch buttons
  document.querySelectorAll(".btn-primary").forEach((btn) => {
    if (btn.textContent.includes("Launch Tool")) {
      btn.addEventListener("click", () => (window.location.href = "tool.html"));
    }
  });

  document.querySelectorAll(".btn-launch").forEach((btn) => {
    btn.addEventListener("click", () => (window.location.href = "tool.html"));
  });

  // Scroll to features
  const featuresBtn = document.querySelector(".btn-ghost");
  if (featuresBtn && featuresBtn.textContent.includes("Features")) {
    featuresBtn.addEventListener("click", () => {
      document
        .getElementById("features")
        .scrollIntoView({ behavior: "smooth" });
    });
  }

  // Demo tree nodes
  document.getElementById("dn-root")?.addEventListener("click", function () {
    demoToggle("root", this);
  });
  document.getElementById("dn-user")?.addEventListener("click", function () {
    demoToggle("user", this);
  });
  document.getElementById("dn-tags")?.addEventListener("click", function () {
    demoToggle("tags", this);
  });

  document.querySelectorAll(".demo-node[data-path]").forEach((node) => {
    node.addEventListener("click", () => {
      const path = node.getAttribute("data-path");
      demoLeaf(path, node);
    });
  });

  document
    .getElementById("demo-copy-btn")
    ?.addEventListener("click", copyDemoPath);
});

function toggleMobileMenu() {
  const m = document.getElementById("mobile-menu");
  if (m) m.classList.toggle("open");
}

function demoToggle(id, el) {
  demoExpanded[id] = !demoExpanded[id];
  const childEl = document.getElementById(childMap[id]);
  if (childEl) childEl.style.display = demoExpanded[id] ? "block" : "none";

  const arr = document.getElementById(arrowMap[id]);
  if (arr) {
    arr.className =
      "fa-solid fa-chevron-right demo-arrow" +
      (demoExpanded[id] ? " open" : "");
  }
  highlightDemo(el);
  const paths = { root: "root", user: "root?.user", tags: "root?.tags" };
  setDemoPath(paths[id]);
}

function demoLeaf(path, el) {
  highlightDemo(el);
  setDemoPath(path);
}

function highlightDemo(el) {
  document
    .querySelectorAll(".demo-node")
    .forEach((n) => n.classList.remove("active"));
  el.classList.add("active");
}

function setDemoPath(path) {
  const t = document.getElementById("demo-path-text");
  if (t) {
    t.style.fontStyle = "normal";
    t.style.color = "var(--accent)";
    t.innerHTML = path;
  }
  const copyBtn = document.getElementById("demo-copy-btn");
  if (copyBtn) copyBtn.style.display = "inline-flex";
}

function copyDemoPath() {
  const t = document.getElementById("demo-path-text");
  if (t) {
    const text = t.textContent;
    navigator.clipboard.writeText(text).then(() => showToast("Path copied!"));
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (t) {
    t.innerHTML = '<i class="fa-solid fa-check"></i> ' + msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2000);
  }
}
