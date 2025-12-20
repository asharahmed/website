const statusPill = document.getElementById("overall-status");
const statusLabel = document.getElementById("overall-label");
const statusUpdated = document.getElementById("status-updated");
const statusAlert = document.getElementById("status-alert");

const fields = {
  httpStatus: document.getElementById("http-status"),
  responseTime: document.getElementById("response-time"),
  serverTime: document.getElementById("server-time"),
  lastChecked: document.getElementById("last-checked"),
  metricsUpdated: document.getElementById("metrics-updated"),
  metricsAge: document.getElementById("metrics-age"),
  servicesOnline: document.getElementById("services-online"),
  cpuUsage: document.getElementById("cpu-usage"),
  cpuDetail: document.getElementById("cpu-detail"),
  memoryUsage: document.getElementById("memory-usage"),
  memoryDetail: document.getElementById("memory-detail"),
  diskUsage: document.getElementById("disk-usage"),
  diskDetail: document.getElementById("disk-detail"),
  diskRing: document.getElementById("disk-ring"),
  diskRingValue: document.getElementById("disk-ring-value"),
  ioRate: document.getElementById("io-rate"),
  ioDetail: document.getElementById("io-detail"),
  loadAverage: document.getElementById("load-average"),
  loadDetail: document.getElementById("load-detail"),
  uptime: document.getElementById("uptime"),
  active: document.getElementById("active-connections"),
  reading: document.getElementById("reading"),
  writing: document.getElementById("writing"),
  waiting: document.getElementById("waiting"),
  requests: document.getElementById("requests"),
  requestsRate: document.getElementById("requests-rate"),
  cpuBar: document.getElementById("cpu-bar"),
  memoryBar: document.getElementById("memory-bar"),
  diskBar: document.getElementById("disk-bar"),
  ioBar: document.getElementById("io-bar"),
  loadBar: document.getElementById("load-bar")
};

const servicePills = {
  nginx: document.getElementById("service-nginx"),
  ssh: document.getElementById("service-ssh"),
  docker: document.getElementById("service-docker"),
  "status-metrics": document.getElementById("service-status-metrics")
};

const sparklines = {
  cpu: document.getElementById("cpu-spark"),
  memory: document.getElementById("memory-spark"),
  io: document.getElementById("io-spark"),
  load: document.getElementById("load-spark")
};

const state = {
  lastRequests: null,
  lastTimestamp: null,
  lastMetricsAge: null,
  history: {
    cpu: [],
    memory: [],
    disk: [],
    io: [],
    load: []
  }
};

const MAX_POINTS = 60;
const IO_CAP_BPS = 100 * 1024 * 1024;

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setStatus(stateLabel, text) {
  if (statusPill) {
    statusPill.dataset.state = stateLabel;
  }
  setText(statusLabel, text);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  return `${Math.round(ms)} ms`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return `${value.toFixed(1)}%`;
}

function formatBytes(bytes) {
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
}

function formatThroughput(bps) {
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
}

function formatUptime(seconds) {
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
}

function formatAge(seconds) {
  if (!Number.isFinite(seconds)) {
    return "--";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function formatServiceLabel(state) {
  switch (state) {
    case "active":
      return "Online";
    case "inactive":
      return "Offline";
    case "failed":
      return "Failed";
    case "activating":
      return "Starting";
    case "deactivating":
      return "Stopping";
    case "reloading":
      return "Reloading";
    default:
      return "Unknown";
  }
}

function updateServices(services) {
  let total = 0;
  let online = 0;
  Object.entries(servicePills).forEach(([key, element]) => {
    if (!element) {
      return;
    }
    total += 1;
    const stateValue = services && typeof services[key] === "string" ? services[key] : "unknown";
    element.dataset.state = stateValue;
    setText(element, formatServiceLabel(stateValue));
    if (stateValue === "active") {
      online += 1;
    }
  });
  if (fields.servicesOnline) {
    fields.servicesOnline.textContent = total ? `${online}/${total}` : "--";
  }
}

function parseStubStatus(text) {
  const activeMatch = text.match(/Active connections:\s+(\d+)/i);
  const countsMatch = text.match(/server accepts handled requests\s+(\d+)\s+(\d+)\s+(\d+)/i);
  const rwwMatch = text.match(/Reading:\s+(\d+)\s+Writing:\s+(\d+)\s+Waiting:\s+(\d+)/i);

  return {
    active: activeMatch ? Number(activeMatch[1]) : null,
    accepts: countsMatch ? Number(countsMatch[1]) : null,
    handled: countsMatch ? Number(countsMatch[2]) : null,
    requests: countsMatch ? Number(countsMatch[3]) : null,
    reading: rwwMatch ? Number(rwwMatch[1]) : null,
    writing: rwwMatch ? Number(rwwMatch[2]) : null,
    waiting: rwwMatch ? Number(rwwMatch[3]) : null
  };
}

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function setBar(element, value) {
  if (!element) {
    return;
  }
  const percent = clampPercent(value);
  element.style.width = `${percent}%`;
}

function setDiskRing(value) {
  if (!fields.diskRing) {
    return;
  }
  const percent = clampPercent(value);
  const degrees = `${(percent / 100) * 360}deg`;
  fields.diskRing.style.setProperty("--disk-percent", degrees);
  setText(fields.diskRingValue, `${percent.toFixed(0)}%`);
}

function pushHistory(key, value) {
  const series = state.history[key];
  if (!series) {
    return;
  }
  series.push(Number.isFinite(value) ? value : null);
  if (series.length > MAX_POINTS) {
    series.shift();
  }
}

function normalizeSeries(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(value => {
    if (value === null) {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  });
}

function drawSparkline(canvas, data, options) {
  if (!canvas || !canvas.getContext) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) {
    return;
  }

  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const points = data
    .map((value, index) => ({ value, index }))
    .filter(item => Number.isFinite(item.value));

  if (!points.length) {
    return;
  }

  const values = points.map(item => item.value);
  const min = options.min ?? Math.min(...values);
  const max = options.max ?? Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);

  ctx.lineWidth = 2;
  ctx.strokeStyle = options.stroke || "rgba(59, 130, 246, 0.9)";
  ctx.beginPath();

  let started = false;
  data.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      return;
    }
    const x = index * step;
    const y = height - ((value - min) / range) * height;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = options.fill || "rgba(59, 130, 246, 0.12)";
  ctx.fill();
}

function redrawSparklines(scale) {
  drawSparkline(sparklines.cpu, state.history.cpu, { min: 0, max: 100 });
  drawSparkline(sparklines.memory, state.history.memory, { min: 0, max: 100 });
  drawSparkline(sparklines.io, state.history.io, { min: 0 });
  drawSparkline(sparklines.load, state.history.load, { min: 0, max: scale || 1 });
}

async function fetchStubStatus() {
  const started = performance.now();
  const response = await fetch("/status/nginx", { cache: "no-store" });
  const elapsed = performance.now() - started;

  setText(fields.httpStatus, `${response.status} ${response.statusText || ""}`.trim());
  setText(fields.responseTime, formatDuration(elapsed));

  const serverDate = response.headers.get("Date");
  setText(fields.serverTime, serverDate ? new Date(serverDate).toLocaleString() : "--");

  if (!response.ok) {
    throw new Error("stub_status unavailable");
  }

  const body = await response.text();
  return parseStubStatus(body);
}

async function fetchMetrics() {
  const response = await fetch("/status/metrics.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("metrics unavailable");
  }
  return response.json();
}

function updateRate(requests) {
  if (!Number.isFinite(requests)) {
    setText(fields.requestsRate, "--");
    return;
  }
  const timestamp = Date.now();
  if (state.lastRequests !== null && state.lastTimestamp !== null) {
    const deltaRequests = requests - state.lastRequests;
    const deltaSeconds = (timestamp - state.lastTimestamp) / 1000;
    const rate = deltaSeconds > 0 ? deltaRequests / deltaSeconds : null;
    setText(fields.requestsRate, Number.isFinite(rate) ? `${rate.toFixed(2)} r/s` : "--");
  } else {
    setText(fields.requestsRate, "--");
  }
  state.lastRequests = requests;
  state.lastTimestamp = timestamp;
}

function updateMetrics(data) {
  if (!data) {
    setText(fields.metricsUpdated, "--");
    setText(fields.metricsAge, "--");
    setText(fields.loadDetail, "--");
    setText(fields.ioDetail, "--");
    setDiskRing(null);
    updateServices(null);
    return { loadScale: 1 };
  }

  const updated = data.generated_at ? new Date(data.generated_at) : null;
  setText(fields.metricsUpdated, updated ? updated.toLocaleTimeString() : "--");
  const metricsAge = updated ? (Date.now() - updated.getTime()) / 1000 : null;
  state.lastMetricsAge = metricsAge;
  setText(fields.metricsAge, formatAge(metricsAge));

  setText(fields.cpuUsage, formatPercent(data.cpu?.usage_percent));
  setText(fields.cpuDetail, data.cpu?.cores ? `${data.cpu.cores} cores` : "--");
  setBar(fields.cpuBar, data.cpu?.usage_percent);

  setText(fields.memoryUsage, formatPercent(data.memory?.usage_percent));
  if (Number.isFinite(data.memory?.used_bytes) && Number.isFinite(data.memory?.total_bytes)) {
    setText(fields.memoryDetail, `${formatBytes(data.memory.used_bytes)} / ${formatBytes(data.memory.total_bytes)}`);
  } else {
    setText(fields.memoryDetail, "--");
  }
  setBar(fields.memoryBar, data.memory?.usage_percent);

  setText(fields.diskUsage, formatPercent(data.disk?.usage_percent));
  if (Number.isFinite(data.disk?.used_bytes) && Number.isFinite(data.disk?.total_bytes)) {
    setText(fields.diskDetail, `${formatBytes(data.disk.used_bytes)} / ${formatBytes(data.disk.total_bytes)}`);
  } else {
    setText(fields.diskDetail, "--");
  }
  setBar(fields.diskBar, data.disk?.usage_percent);
  setDiskRing(data.disk?.usage_percent);

  const readBps = Number(data.io?.read_bps);
  const writeBps = Number(data.io?.write_bps);
  const totalBps = Number.isFinite(readBps) || Number.isFinite(writeBps)
    ? (Number.isFinite(readBps) ? readBps : 0) + (Number.isFinite(writeBps) ? writeBps : 0)
    : null;

  setText(fields.ioRate, formatThroughput(totalBps));
  if (Number.isFinite(readBps) || Number.isFinite(writeBps)) {
    setText(
      fields.ioDetail,
      `R ${formatThroughput(readBps)} | W ${formatThroughput(writeBps)}`
    );
  } else {
    setText(fields.ioDetail, "--");
  }
  setBar(fields.ioBar, totalBps !== null ? (totalBps / IO_CAP_BPS) * 100 : null);

  let loadScale = 1;
  if (Array.isArray(data.load_average)) {
    setText(fields.loadAverage, data.load_average.map(val => Number(val).toFixed(2)).join(" / "));
    const cores = Number(data.cpu?.cores) || 1;
    const load1 = Number(data.load_average[0]);
    if (Number.isFinite(load1)) {
      loadScale = Math.max(1, cores);
      const loadPercent = (load1 / loadScale) * 100;
      setText(fields.loadDetail, `${load1.toFixed(2)} of ${loadScale} cores`);
      setBar(fields.loadBar, loadPercent);
    } else {
      setText(fields.loadDetail, "--");
      setBar(fields.loadBar, null);
    }
  } else {
    setText(fields.loadAverage, "--");
    setText(fields.loadDetail, "--");
    setBar(fields.loadBar, null);
  }

  setText(fields.uptime, formatUptime(Number(data.uptime_seconds)));
  updateServices(data.services);

  if (data.history) {
    state.history = {
      cpu: normalizeSeries(data.history.cpu),
      memory: normalizeSeries(data.history.memory),
      disk: normalizeSeries(data.history.disk),
      io: normalizeSeries(data.history.io),
      load: normalizeSeries(data.history.load)
    };
  } else {
    pushHistory("cpu", data.cpu?.usage_percent);
    pushHistory("memory", data.memory?.usage_percent);
    pushHistory("disk", data.disk?.usage_percent);
    pushHistory("io", totalBps);
    if (Array.isArray(data.load_average)) {
      pushHistory("load", Number(data.load_average[0]));
    } else {
      pushHistory("load", null);
    }
  }

  return { loadScale };
}

async function checkStatus() {
  const now = new Date();
  setText(fields.lastChecked, now.toLocaleTimeString());

  const results = await Promise.allSettled([fetchStubStatus(), fetchMetrics()]);
  const [stubResult, metricsResult] = results;

  let stubOk = false;
  let metricsOk = false;
  let loadScale = 1;

  if (stubResult.status === "fulfilled") {
    const metrics = stubResult.value;
    stubOk = true;
    setText(fields.active, metrics.active ?? "--");
    setText(fields.reading, metrics.reading ?? "--");
    setText(fields.writing, metrics.writing ?? "--");
    setText(fields.waiting, metrics.waiting ?? "--");
    setText(fields.requests, metrics.requests ?? "--");
    updateRate(metrics.requests);
  } else {
    setText(fields.httpStatus, "--");
    setText(fields.responseTime, "--");
    setText(fields.serverTime, "--");
    setText(fields.active, "--");
    setText(fields.reading, "--");
    setText(fields.writing, "--");
    setText(fields.waiting, "--");
    setText(fields.requests, "--");
    setText(fields.requestsRate, "--");
  }

  if (metricsResult.status === "fulfilled") {
    metricsOk = true;
    const updated = updateMetrics(metricsResult.value);
    loadScale = updated.loadScale;
  } else {
    updateMetrics(null);
  }

  redrawSparklines(loadScale);

  if (stubOk && metricsOk) {
    setStatus("up", "Online");
  } else if (stubOk) {
    setStatus("partial", "Partial");
  } else {
    setStatus("down", navigator.onLine ? "Offline" : "No Network");
  }

  if (statusUpdated) {
    statusUpdated.textContent = `Last update: ${now.toLocaleTimeString()}`;
  }

  if (statusAlert) {
    const alerts = [];
    let alertState = "ok";
    if (state.lastMetricsAge !== null && state.lastMetricsAge > 30) {
      alerts.push(`Metrics stale (${formatAge(state.lastMetricsAge)})`);
      alertState = "warn";
    }
    const serviceIssues = Object.entries(servicePills)
      .map(([key, element]) => ({ key, state: element ? element.dataset.state : "unknown" }))
      .filter(item => item.state !== "active");
    if (serviceIssues.length) {
      alerts.push(`Service issues: ${serviceIssues.map(item => item.key).join(", ")}`);
      alertState = "error";
    }
    statusAlert.dataset.state = alertState === "ok" ? "ok" : alertState;
    statusAlert.textContent = alerts.length ? alerts.join(" | ") : "All systems nominal";
  }
}

window.addEventListener("resize", () => {
  redrawSparklines();
});

checkStatus();
setInterval(checkStatus, 10000);

window.addEventListener("focus", () => {
  checkStatus();
});
