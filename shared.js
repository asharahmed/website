/* Shared helpers for status UI. */
(() => {
  const clampPercent = value => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, value));
  };

  const setText = (element, value) => {
    if (element) {
      element.textContent = value;
    }
  };

  const formatDuration = ms => {
    if (!Number.isFinite(ms)) {
      return "--";
    }
    return `${Math.round(ms)} ms`;
  };

  const formatPercent = value => {
    if (!Number.isFinite(value)) {
      return "--";
    }
    return `${value.toFixed(1)}%`;
  };

  const formatBytes = bytes => {
    if (!Number.isFinite(bytes)) {
      return "--";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const formatThroughput = bps => {
    if (!Number.isFinite(bps)) {
      return "--";
    }
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    let size = bps;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const formatUptime = seconds => {
    if (!Number.isFinite(seconds)) {
      return "--";
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (hours > 0 || days > 0) {
      parts.push(`${hours}h`);
    }
    parts.push(`${minutes}m`);
    return parts.join(" ");
  };

  const formatAge = seconds => {
    if (!Number.isFinite(seconds)) {
      return "--";
    }
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}m ${remainder}s`;
  };

  window.StatusUtils = {
    clampPercent,
    setText,
    formatDuration,
    formatPercent,
    formatBytes,
    formatThroughput,
    formatUptime,
    formatAge
  };
})();

/* Page transition helpers. */
(() => {
  const body = document.body;
  if (!body) {
    return;
  }

  body.classList.add("page-fade");
  window.addEventListener("DOMContentLoaded", () => {
    body.classList.add("is-loaded");
  });

  document.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) {
      return;
    }
    if (link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }
    if (url.pathname === window.location.pathname && url.hash) {
      return;
    }
    event.preventDefault();
    body.classList.add("is-leaving");
    setTimeout(() => {
      window.location.href = link.href;
    }, 250);
  });
})();
