import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.env.GITHUB_REPOSITORY || "shimin1080/lyric-workspace";
const tag = process.argv[2] || process.env.GITHUB_REF_NAME || "v1.0.1";
const root = process.cwd();
const files = [
  "src-tauri/target/release/bundle/dmg/LYRIC WORKSPACE_1.0.1_aarch64.dmg",
  "src-tauri/target/release/bundle/macos/LYRIC WORKSPACE.app.tar.gz",
  "src-tauri/target/release/bundle/macos/LYRIC WORKSPACE.app.tar.gz.sig",
  "src-tauri/target/release/bundle/macos/latest.json",
];

function credentialToken() {
  const input = "protocol=https\nhost=github.com\n\n";
  const output = execFileSync("git", ["credential", "fill"], { input, encoding: "utf8" });
  const parsed = Object.fromEntries(output.trim().split("\n").map((line) => {
    const idx = line.indexOf("=");
    return [line.slice(0, idx), line.slice(idx + 1)];
  }));
  return parsed.password;
}

const token = process.env.GITHUB_TOKEN || credentialToken();
if (!token) throw new Error("GitHub token was not found in git credentials or GITHUB_TOKEN.");

async function github(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${json?.message || text}`);
  return json;
}

async function releaseForTag() {
  const releaseUrl = `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  try {
    return await github(releaseUrl);
  } catch (e) {
    if (!String(e.message).startsWith("404 ")) throw e;
  }
  return github(`https://api.github.com/repos/${repo}/releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: tag,
      name: `LYRIC WORKSPACE ${tag}`,
      body: "Native auto-updater enabled build.",
      draft: false,
      prerelease: false,
    }),
  });
}

const release = await releaseForTag();
const uploadBase = release.upload_url.replace(/\{.*$/, "");

for (const relPath of files) {
  const file = path.join(root, relPath);
  const name = path.basename(file);
  const existing = (release.assets || []).find((asset) => asset.name === name);
  if (existing) await github(existing.url, { method: "DELETE" });
  const bytes = await fs.readFile(file);
  await github(`${uploadBase}?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": name.endsWith(".json") ? "application/json" : "application/octet-stream" },
    body: bytes,
  });
  console.log(`uploaded ${name}`);
}

console.log(release.html_url);
