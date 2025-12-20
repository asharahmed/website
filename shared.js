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

/* Easter egg: rapid beta tag clicks trigger confetti. */
(() => {
  const trigger = document.getElementById("betaEasterEgg");
  if (!trigger) {
    return;
  }
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    return;
  }

  let clicks = 0;
  let timer = null;

  const reset = () => {
    clicks = 0;
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const launchConfetti = () => {
    const canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const colors = ["#60a5fa", "#fbbf24", "#34d399", "#f472b6", "#a78bfa"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.2,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
      speed: 1.5 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 1.2
    }));

    let start = null;
    const duration = 2200;

    const animate = timestamp => {
      if (!start) {
        start = timestamp;
      }
      const elapsed = timestamp - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.speed;
        p.x += p.drift;
        p.rotation += 0.06;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < duration) {
        window.requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };

    window.requestAnimationFrame(animate);
  };

  trigger.addEventListener("click", () => {
    clicks += 1;
    if (!timer) {
      timer = window.setTimeout(reset, 1800);
    }
    if (clicks >= 7) {
      reset();
      launchConfetti();
    }
  });
})();
