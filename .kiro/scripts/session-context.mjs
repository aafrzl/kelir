// SessionStart hook: prints a short status so a new Kiro session resumes where the last one stopped.
// Whatever this prints to stdout is added to the agent's context.
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const out = [];
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

try {
  const status = execSync("git status --short --branch", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
  if (status) out.push("## Git status", status.split("\n").slice(0, 15).join("\n"));
} catch {
  /* not a git repo yet */
}

const tasks = read(".kiro/specs/kelir-core/tasks.md");
if (tasks) {
  const open = tasks.split("\n").filter((l) => /^\s*- \[ \]/.test(l));
  const done = tasks.split("\n").filter((l) => /^\s*- \[x\]/i.test(l)).length;
  out.push(
    `## Spec progress (kelir-core): ${done} done, ${open.length} open`,
    "Next open tasks:",
    ...open.slice(0, 3).map((l) => l.trim())
  );
}

const devlog = read("DEVLOG.md");
if (devlog) {
  out.push("## Latest DEVLOG lines", devlog.trim().split("\n").slice(-12).join("\n"));
}

const days = Math.ceil((Date.parse("2026-12-04T22:00:00Z") - Date.now()) / 86_400_000);
out.push(`## Deadline: Kiroween submission closes in ${days} day(s) (Fri 4 Dec 2026, 14:00 PT).`);

console.log(out.join("\n"));
