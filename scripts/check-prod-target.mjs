// Fails when the shipped web build depends on a local backend.
// Runs after the web build in `npm test`, so the pre-commit hook blocks it.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const web = path.resolve(import.meta.dirname, "../web");
const problems = [];

const prod = readFileSync(path.join(web, ".env.production"), "utf8").match(/^VITE_API_BASE=(.*)$/m)?.[1]?.trim();
if (!prod || !/^https:\/\//.test(prod) || /localhost|127\.0\.0\.1|\[::1\]/.test(prod)) {
  problems.push(`web/.env.production VITE_API_BASE must be a public https URL, got "${prod ?? ""}"`);
}

for (const f of readdirSync(web).filter((n) => /^\.env.*\.local$/.test(n))) {
  problems.push(`web/${f} is a local override and changes the build target. Delete it before committing.`);
}

const assets = path.join(web, "dist/assets");
if (!existsSync(assets)) problems.push("web/dist is missing: run the build first");
else {
  const js = readdirSync(assets).filter((n) => n.endsWith(".js")).map((n) => readFileSync(path.join(assets, n), "utf8")).join("\n");
  if (prod && !js.includes(prod)) problems.push(`built bundle does not call ${prod}`);
  if (/(localhost|127\.0\.0\.1):(3000|5173|8787)/.test(js)) problems.push("built bundle references a local backend address");
}

if (problems.length) {
  console.error("Production target check FAILED:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Production target check passed: build calls ${prod}, no local backend dependency.`);
