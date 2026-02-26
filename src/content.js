(function () {
  const isRawJson =
    document.contentType === "application/json" ||
    (document.body.children.length === 1 &&
      document.body.firstChild.tagName === "PRE");

  if (isRawJson) {
    const jsonContent = document.body.innerText;
    try {
      JSON.parse(jsonContent);
      createFloatingBadge(jsonContent);
    } catch (e) {}
  }

  function createFloatingBadge(json) {
    const badge = document.createElement("div");
    badge.id = "pathfinder-detect-badge";
    badge.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Open in PathFinder</span>
      </div>
    `;

    Object.assign(badge.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      backgroundColor: "hsl(199, 89%, 48%)",
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      cursor: "pointer",
      zIndex: "999999",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      fontWeight: "600",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      border: "1px solid rgba(255,255,255,0.1)",
    });

    badge.onmouseover = () => {
      badge.style.transform = "translateY(-4px)";
      badge.style.backgroundColor = "hsl(199, 89%, 55%)";
      badge.style.boxShadow = "0 12px 32px rgba(0,0,0,0.4)";
    };
    badge.onmouseout = () => {
      badge.style.transform = "translateY(0)";
      badge.style.backgroundColor = "hsl(199, 89%, 48%)";
      badge.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    };

    badge.onclick = () => {
      chrome.storage.local.set({ pending_json: json }, () => {
        chrome.runtime.sendMessage({ action: "open_tool" });
      });
    };

    document.body.appendChild(badge);
  }
})();
