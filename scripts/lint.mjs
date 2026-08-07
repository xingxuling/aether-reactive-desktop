import { readFile } from "node:fs/promises";

const files = ["package.json", "tsconfig.json", "vite.config.ts"];
for (const file of files) {
  const text = await readFile(file, "utf8");
  if (!text.trim()) throw new Error(`${file} is empty`);
}

console.log("Aether lint: manifest and configuration files are readable.");
