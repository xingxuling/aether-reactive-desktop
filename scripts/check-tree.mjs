import { access, readdir } from "node:fs/promises";

const required = [
  "package.json",
  "src/main.tsx",
  "src/app/App.tsx",
  "src/core/reactive-state/types.ts",
  "src/core/reactive-state/reducer.ts",
  "src/scenes/registry/sceneRegistry.ts",
  "src/visual/compositor/ReactiveSceneCanvas.tsx",
  "src/legacy/README.md",
  "src/legacy/dynamic-cover/DynamicCover.tsx",
  "src/legacy/music-halo/MusicHalo.tsx",
  "src/legacy/project-terrarium/ProjectTerrarium.tsx",
  "src/legacy/tree-spirit/TreeSpirit.tsx",
  "src/legacy/pocket-world/PocketWorld.tsx",
  "src-tauri/Cargo.toml",
  ".github/workflows/aether-reactive-desktop.yml",
  "docs/evidence/product-retrial-v0.2.md",
  "docs/evidence/true-wallpaper-report.md",
  "docs/evidence/wasapi-loopback-report.md",
  "docs/evidence/windows-install-report.md",
  "docs/evidence/repository-release.md",
];

for (const file of required) await access(file);
const toyFolders = await readdir("src/legacy");
const expected = ["dynamic-cover", "music-halo", "project-terrarium", "tree-spirit", "pocket-world"];
for (const folder of expected) {
  if (!toyFolders.includes(folder)) throw new Error(`Missing toy folder: ${folder}`);
}

console.log(`Aether tree check: PASS (${required.length} required files, ${expected.length} legacy modules, 5 scenes).`);
