// PreToolUse guard: blocks any write that would add `.kiro` to a .gitignore file.
// Kiro passes the hook event as JSON on stdin. Exit code 2 blocks the tool call.
import { readFileSync } from "node:fs";

let event = {};
try {
  event = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // never block on unreadable input
}

// Collect every string inside tool_input, whatever the tool's field names are.
const strings = [];
(function walk(value) {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) value.forEach(walk);
  else if (value && typeof value === "object") Object.values(value).forEach(walk);
})(event.tool_input ?? {});

const touchesGitignore = strings.some((s) => /(^|[\\/])\.gitignore$/.test(s.trim()));
const ignoresKiro = strings.some((s) =>
  s.split(/\r?\n/).some((line) => /^\s*\/?\.kiro(\/.*)?\s*$/.test(line))
);

if (touchesGitignore && ignoresKiro) {
  console.error(
    "Blocked: .kiro must stay committed. Adding it to .gitignore can disqualify the Kiroween submission."
  );
  process.exit(2);
}
process.exit(0);
