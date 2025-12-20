import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

const SKIP_FILES = new Set(["index.nginx-debian.html"]);
const SKIP_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
  "data:"
]);

const fileCache = new Map();

const isFile = async filePath => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
};

const collectHtmlFiles = async dir => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html") && !SKIP_FILES.has(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
};

const getDocument = async filePath => {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath);
  }
  const html = await fs.readFile(filePath, "utf8");
  const $ = load(html);
  const ids = new Set();
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    if (id) {
      ids.add(id);
    }
  });
  const doc = { $, ids };
  fileCache.set(filePath, doc);
  return doc;
};

const splitTarget = raw => {
  const [beforeHash, hash] = raw.split("#");
  const [pathname] = beforeHash.split("?");
  return { pathname, hash };
};

const resolveFileTarget = async (sourceFile, rawPath) => {
  if (!rawPath || rawPath === "#") {
    return null;
  }
  if (rawPath.startsWith("//")) {
    return null;
  }
  try {
    const url = new URL(rawPath);
    if (SKIP_PROTOCOLS.has(url.protocol)) {
      return null;
    }
  } catch {
    // Not a full URL, continue.
  }

  if (rawPath.startsWith("#")) {
    return { filePath: sourceFile, anchor: rawPath.slice(1) };
  }

  const { pathname, hash } = splitTarget(rawPath);
  if (!pathname) {
    return { filePath: sourceFile, anchor: hash || null };
  }

  let resolvedPath;
  if (pathname.startsWith("/")) {
    resolvedPath = path.join(rootDir, pathname.slice(1));
  } else {
    resolvedPath = path.resolve(path.dirname(sourceFile), pathname);
  }

  if (pathname === "/") {
    resolvedPath = path.join(rootDir, "index.html");
  }

  const candidates = [];
  if (resolvedPath.endsWith(path.sep)) {
    candidates.push(path.join(resolvedPath, "index.html"));
  } else {
    candidates.push(resolvedPath);
  }

  if (!path.extname(resolvedPath)) {
    candidates.push(`${resolvedPath}.html`);
    candidates.push(path.join(resolvedPath, "index.html"));
  }

  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return { filePath: candidate, anchor: hash || null };
    }
  }

  return { filePath: candidates[0], anchor: hash || null, missing: true };
};

const checkAnchors = async (target, sourceFile, rawValue, failures) => {
  if (!target || !target.anchor) {
    return;
  }
  const { filePath, anchor } = target;
  const doc = await getDocument(filePath);
  if (!doc.ids.has(anchor)) {
    failures.push({
      source: sourceFile,
      target: rawValue,
      reason: `Missing anchor "#${anchor}" in ${path.relative(rootDir, filePath)}`
    });
  }
};

const failures = [];
const htmlFiles = await collectHtmlFiles(rootDir);

for (const file of htmlFiles) {
  const { $ } = await getDocument(file);
  const attrs = [
    { selector: "[href]", attr: "href" },
    { selector: "[src]", attr: "src" }
  ];

  for (const { selector, attr } of attrs) {
    const elements = $(selector).toArray();
    for (const el of elements) {
      const value = $(el).attr(attr);
      if (!value || value === "#") {
        continue;
      }
      if (value.startsWith("javascript:")) {
        continue;
      }
      const raw = value.trim();
      if (!raw) {
        continue;
      }
      const target = await resolveFileTarget(file, raw);
      if (!target) {
        continue;
      }
      if (target.missing) {
        failures.push({
          source: file,
          target: raw,
          reason: `Missing file target at ${target.filePath}`
        });
        continue;
      }
      await checkAnchors(target, file, raw, failures);
    }
  }
}

if (failures.length > 0) {
  console.error("Link check failed:");
  for (const failure of failures) {
    console.error(
      `- ${path.relative(rootDir, failure.source)} -> ${failure.target} (${failure.reason})`
    );
  }
  process.exit(1);
}

console.log(`Link check passed (${htmlFiles.length} HTML files).`);
