import { danger, warn } from "danger";
import micromatch from "micromatch";
import fs from "fs";

// Configuration shape
interface Config {
  attributeNames?: string[];
  includeGlobs?: string[];
  excludeGlobs?: string[];
  tagTeam?: string;
}

function loadConfig(): Partial<Config> {
  try {
    const raw = fs.readFileSync(".danger/config.json", "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const defaults: Required<Config> = {
  attributeNames: ["data-testid", "data-test-id"],
  includeGlobs: ["src/**/*.{tsx,jsx,ts,js,html}"],
  excludeGlobs: [
    "node_modules/**",
    "dist/**",
    "build/**",
    "**/__tests__/**",
    "**/__mocks__/**",
    "**/__fixtures__/**",
    "**/__snapshots__/**",
    "**/*.spec.*",
    "**/*.test.*",
    "**/*.stories.*",
    "storybook-static/**"
  ],
  tagTeam: "@tmbtech"
};

const cfgFromFile = loadConfig();
const cfg: Required<Config> = {
  attributeNames: (process.env.DANGER_TESTID_ATTRS
    ? process.env.DANGER_TESTID_ATTRS.split(",").map((s) => s.trim()).filter(Boolean)
    : (cfgFromFile.attributeNames || defaults.attributeNames)) as string[],
  includeGlobs: cfgFromFile.includeGlobs || defaults.includeGlobs,
  excludeGlobs: cfgFromFile.excludeGlobs || defaults.excludeGlobs,
  tagTeam: cfgFromFile.tagTeam || defaults.tagTeam
};

function extractAttrValueFromLine(attr: string, line: string): { present: boolean; value: string | null } {
  const attrEq = new RegExp(`${attr}\\s*=`, "i");
  if (!attrEq.test(line)) return { present: false, value: null };

  const quoted = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  const inBracesQuoted = new RegExp(`${attr}\\s*=\\s*{\\s*["']([^"']+)["']\\s*}`, "i");
  const inBracesTemplate = new RegExp(`${attr}\\s*=\\s*{\\s*\\` + "`" + `([^\\` + "`" + `]*)\\` + "`" + `\\s*}`, "i");

  const m1 = line.match(quoted);
  if (m1) return { present: true, value: m1[1] };

  const m2 = line.match(inBracesQuoted);
  if (m2) return { present: true, value: m2[1] };

  const m3 = line.match(inBracesTemplate);
  if (m3) return { present: true, value: m3[1] };

  // attribute present but not a simple literal (likely an expression)
  return { present: true, value: "(non-literal expression)" };
}

async function run() {
  const modified = danger.git.modified_files || [];
  const candidates = micromatch(modified, cfg.includeGlobs, { ignore: cfg.excludeGlobs });

  const report: Array<{
    file: string;
    changes: Array<{ attr: string; from: string; to: string }>;
    removals: Array<{ attr: string; from: string }>;
  }> = [];

  for (const file of candidates) {
    const diff: any = await danger.git.diffForFile(file);
    if (!diff) continue;

    const addedRaw = (diff as any).added;
    const removedRaw = (diff as any).removed;
    const addedLines: string[] = Array.isArray(addedRaw) ? addedRaw : String(addedRaw || "").split("\n");
    const removedLines: string[] = Array.isArray(removedRaw) ? removedRaw : String(removedRaw || "").split("\n");

    const fileChanges: Array<{ attr: string; from: string; to: string }> = [];
    const fileRemovals: Array<{ attr: string; from: string }> = [];

    for (const attr of cfg.attributeNames) {
      const removedVals: Array<string> = [];
      const addedVals: Array<string> = [];

      // Collect removed attr mentions
      for (const line of removedLines) {
        const { present, value } = extractAttrValueFromLine(attr, line);
        if (present) removedVals.push(value ?? "(unknown)");
      }

      // Collect added attr mentions
      for (const line of addedLines) {
        const { present, value } = extractAttrValueFromLine(attr, line);
        if (present) addedVals.push(value ?? "(unknown)");
      }

      // Pair removals and additions within the file to infer changes
      while (removedVals.length > 0 && addedVals.length > 0) {
        const from = removedVals.shift() as string;
        const to = addedVals.shift() as string;
        if (from !== to) {
          fileChanges.push({ attr, from, to });
        }
        // If from === to, that likely indicates a move or unrelated diff; ignore
      }

      // Remaining removals are pure deletions
      for (const from of removedVals) {
        fileRemovals.push({ attr, from });
      }
      // We intentionally ignore pure additions for this policy
    }

    if (fileChanges.length || fileRemovals.length) {
      report.push({ file, changes: fileChanges, removals: fileRemovals });
    }
  }

  if (report.length === 0) {
    // No issues to report
    return;
  }

  const lines: string[] = [];
  lines.push(`Heads up ${cfg.tagTeam} — data test-id attribute changes detected in this PR.`);
  lines.push("");
  for (const entry of report) {
    lines.push(`• ${entry.file}`);
    for (const c of entry.changes) {
      lines.push(`  - ${c.attr} changed: "${c.from}" -> "${c.to}"`);
    }
    for (const r of entry.removals) {
      lines.push(`  - ${r.attr} removed: "${r.from}"`);
    }
  }
  lines.push("");
  lines.push("If these changes are intentional, please coordinate with QA automation to update selectors.");

  // Non-blocking, sticky-style warning (Danger updates a single comment per run)
  warn(lines.join("\n"));
}

run().catch((e) => {
  warn(`Dangerfile execution error: ${e?.message || e}`);
});
