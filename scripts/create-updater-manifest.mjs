import fs from "node:fs/promises";
import path from "node:path";

const repo = process.env.GITHUB_REPOSITORY || "shimin1080/lyric-workspace";
const root = process.cwd();
const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const tag = process.env.GITHUB_REF_NAME?.startsWith("v") ? process.env.GITHUB_REF_NAME : `v${pkg.version}`;
const version = tag.replace(/^v/, "");
const bundleDir = path.join(root, "src-tauri", "target", "release", "bundle", "macos");
const files = await fs.readdir(bundleDir);
const archiveName = files.find((file) => file.endsWith(".app.tar.gz"));
const releaseAssetName = archiveName?.replaceAll(" ", ".");

if (!archiveName) {
  throw new Error(`Updater archive was not found in ${bundleDir}`);
}

const signature = (await fs.readFile(path.join(bundleDir, `${archiveName}.sig`), "utf8")).trim();
const url = `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(releaseAssetName)}`;
const manifest = {
  version,
  notes: process.env.RELEASE_NOTES || "LYRIC WORKSPACE update",
  pub_date: new Date().toISOString(),
  platforms: {
    "darwin-aarch64": {
      signature,
      url,
    },
  },
};

await fs.writeFile(path.join(bundleDir, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Created ${path.join(bundleDir, "latest.json")}`);
