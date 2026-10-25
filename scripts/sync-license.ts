import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const license = readFileSync(join(rootDir, "LICENSE"), "utf8");
const packagesDir = join(rootDir, "packages");
const checkOnly = process.argv.includes("--check");

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => existsSync(join(packagesDir, entry.name, "package.json")))
  .map((entry) => entry.name);

let hasDrift = false;
for (const name of packageDirs) {
  const target = join(packagesDir, name, "LICENSE");
  const current = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (current === license) {
    continue;
  }
  if (checkOnly) {
    hasDrift = true;
    console.error(`LICENSE differs from the root LICENSE: packages/${name}/LICENSE`);
    continue;
  }
  writeFileSync(target, license);
  console.log(`Copied: packages/${name}/LICENSE`);
}

if (checkOnly && hasDrift) {
  console.error("Some packages have a LICENSE that differs from the root LICENSE. `bun run license:sync` copies the root LICENSE to them.");
  process.exit(1);
}
