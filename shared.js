/* Shared helpers for status UI. */
(() => {
  const BYTES_PER_UNIT = 1024;
  const PAGE_TRANSITION_MS = 140;
  const CONFETTI_PIECES = 140;
  const safeStorage = (() => {
    try {
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (error) {
      return null;
    }
  })();
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
    while (size >= BYTES_PER_UNIT && unitIndex < units.length - 1) {
      size /= BYTES_PER_UNIT;
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
    while (size >= BYTES_PER_UNIT && unitIndex < units.length - 1) {
      size /= BYTES_PER_UNIT;
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

  const getStoredTheme = () => (safeStorage ? safeStorage.getItem("theme") : null);
  const setStoredTheme = value => {
    if (safeStorage) {
      safeStorage.setItem("theme", value);
    }
  };

  const createPoller = (task, intervalMs) => {
    let timer = null;
    let running = false;
    let inflight = false;

    const run = async () => {
      if (document.hidden || inflight) {
        return;
      }
      inflight = true;
      try {
        await task();
      } finally {
        inflight = false;
      }
    };

    const start = () => {
      if (running) {
        return;
      }
      running = true;
      if (!document.hidden) {
        run();
      }
      timer = window.setInterval(run, intervalMs);
    };

    const stop = () => {
      running = false;
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && running) {
        run();
      }
    });

    return { start, stop, trigger: run };
  };

  window.SiteUtils = {
    getStoredTheme,
    setStoredTheme,
    createPoller
  };
})();

/* Page transition helpers. */
(() => {
  const body = document.body;
  const root = document.documentElement;
  if (!body || !root) {
    return;
  }

  const host = window.location.hostname.toLowerCase();
  if (host === "asharahmed.com" || host === "www.asharahmed.com") {
    body.classList.add("is-prod");
    root.classList.add("is-prod");
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
    if (link.closest(".nav, .mobile-nav")) {
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
    }, PAGE_TRANSITION_MS);
  });
})();

/* Speculative prefetch on hover/touch. */
(() => {
  const prefetched = new Set();
  const addPrefetch = href => {
    if (!href || prefetched.has(href)) {
      return;
    }
    prefetched.add(href);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.as = "document";
    document.head.appendChild(link);
  };

  const handler = event => {
    const target = event.target.closest("a");
    if (!target) {
      return;
    }
    if (target.target === "_blank" || target.hasAttribute("download")) {
      return;
    }
    const href = target.getAttribute("href") || "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    const url = new URL(target.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }
    addPrefetch(url.href);
  };

  document.addEventListener("pointerover", handler, { passive: true });
  document.addEventListener("touchstart", handler, { passive: true });
})();

/* Advanced hero parallax with inertial layers + device orientation. */
(() => {
  const header = document.querySelector("header");
  const hero = document.querySelector(".hero-content");
  const grid = document.querySelector(".grid-pattern");
  const particles = document.getElementById("particles-canvas");
  if (!header || !hero || !grid) {
    return;
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) {
    return;
  }

  const state = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    scrollOffset: 0,
    rafId: null,
    active: true,
    orientationEnabled: false,
    lastTime: null
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const applyTransforms = (x, y, driftX, driftY) => {
    const heroX = x * 26;
    const heroY = y * 20;
    const heroRotX = y * -7;
    const heroRotY = x * 7;
    hero.style.transform = `translate3d(${heroX}px, ${heroY}px, 0) rotateX(${heroRotX}deg) rotateY(${heroRotY}deg)`;
    grid.style.transform = `translate3d(${x * 14 + driftX * 18}px, ${y * 12 + driftY * 10}px, 0) scale(1.02)`;
    if (particles) {
      particles.style.transform = `translate3d(${x * 8 + driftX * 30}px, ${y * 6 + driftY * 16}px, 0)`;
    }
  };

  const tick = now => {
    if (!state.active) {
      state.rafId = null;
      return;
    }
    if (state.lastTime === null) {
      state.lastTime = now;
    }
    const delta = Math.min(0.05, (now - state.lastTime) / 1000);
    state.lastTime = now;
    const smoothing = 1 - Math.pow(0.001, delta);
    state.currentX += (state.targetX - state.currentX) * smoothing;
    state.currentY += (state.targetY - state.currentY) * smoothing;
    const driftX = Math.sin(now / 4200) * 0.02;
    const driftY = Math.cos(now / 5200) * 0.02;
    const combinedX = state.currentX + driftX;
    const combinedY = state.currentY + driftY + state.scrollOffset;
    applyTransforms(combinedX, combinedY, driftX, driftY);
    state.rafId = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (state.rafId === null) {
      state.lastTime = null;
      state.rafId = window.requestAnimationFrame(tick);
    }
  };

  const setTarget = (x, y) => {
    state.targetX = clamp(x, -0.5, 0.5);
    state.targetY = clamp(y, -0.5, 0.5);
    start();
  };

  const getNormalizedPoint = (clientX, clientY) => {
    const rect = header.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    return { x, y };
  };

  const onPointerMove = event => {
    if (event.pointerType === "touch") {
      return;
    }
    const point = getNormalizedPoint(event.clientX, event.clientY);
    setTarget(point.x, point.y);
  };

  const onTouchMove = event => {
    if (!event.touches || !event.touches[0]) {
      return;
    }
    const touch = event.touches[0];
    const point = getNormalizedPoint(touch.clientX, touch.clientY);
    setTarget(point.x, point.y);
  };

  const reset = () => {
    setTarget(0, 0);
  };

  const handleOrientation = event => {
    if (event.beta === null && event.gamma === null) {
      return;
    }
    const x = clamp((event.gamma || 0) / 50, -0.5, 0.5);
    const y = clamp((event.beta || 0) / 50, -0.5, 0.5);
    setTarget(x, y);
  };

  const enableOrientation = () => {
    if (state.orientationEnabled || !("DeviceOrientationEvent" in window)) {
      return;
    }
    state.orientationEnabled = true;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then(result => {
          if (result === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          }
        })
        .catch(error => {
          state.orientationEnabled = false;
          console.error("Device orientation permission failed:", error);
        });
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  };

  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry) {
      return;
    }
    state.active = entry.isIntersecting;
    if (!state.active) {
      reset();
      state.currentX = 0;
      state.currentY = 0;
      state.scrollOffset = 0;
      applyTransforms(0, 0, 0, 0);
    } else {
      start();
    }
  }, { threshold: 0.2 });

  observer.observe(header);

  header.addEventListener("pointermove", onPointerMove, { passive: true });
  header.addEventListener("touchstart", enableOrientation, { passive: true });
  header.addEventListener("touchmove", onTouchMove, { passive: true });
  header.addEventListener("mouseleave", reset);
  header.addEventListener("touchend", reset);
  window.addEventListener("scroll", () => {
    const rect = header.getBoundingClientRect();
    const offset = clamp(rect.top * -0.002, -0.2, 0.2);
    state.scrollOffset = offset;
    start();
  }, { passive: true });
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
    const pieces = Array.from({ length: CONFETTI_PIECES }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.2,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
      speed: 1.5 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 1.2
    }));

    let start = null;
    const duration = 3200;

    const animate = timestamp => {
      if (!start) {
        start = timestamp;
      }
      const elapsed = timestamp - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allBelow = true;
      pieces.forEach(p => {
        p.y += p.speed;
        p.x += p.drift;
        p.rotation += 0.06;
        if (p.y < canvas.height + 40) {
          allBelow = false;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < duration || !allBelow) {
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
