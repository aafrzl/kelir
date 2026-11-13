---
inclusion: manual
---

# Kiroween 2026 submission checklist

Use with `#submission-checklist` (or `/submission-checklist`) near the end of the build. Go through each item, report pass/fail, and fix what you can.

## Repository
- [ ] Public GitHub repo (not GitLab/Bitbucket)
- [ ] `LICENSE` file (MIT) at root and detected in the GitHub "About" panel
- [ ] `.kiro/` at the repo root with steering, specs, hooks and agents — and **not** listed in `.gitignore`
- [ ] All source, assets and run instructions present; `npm install && npm run dev` works from a clean clone
- [ ] `ASSETS.md` lists every asset with source and licence; nothing copyrighted

## Live app
- [ ] Deployed on Vercel; URL works in a fresh browser profile
- [ ] Runs without login (if any login is ever added, put test credentials only in the Devpost form)
- [ ] WebGL2 fallback and "best on desktop" screens work

## Demo video (YouTube, public, under 3:00)
- [ ] 0:00–0:20 problem + who it's for
- [ ] 0:20–2:15 full playthrough slice: title → lamp mechanic → puppet → cutscene → Kala chase → ending
- [ ] 2:15–2:50 how Kiro built it (specs, steering, hooks, custom agents, PBT)
- [ ] English narration or English subtitles; only original/CC0 audio

## Devpost text
- [ ] Category: Costume Contest
- [ ] Feature description in English
- [ ] "How Kiro was used" write-up built from `DEVLOG.md`, covering: IDE vs CLI, custom agents, hooks, spec-driven vs vibe coding, steering strategy, MCP (if used), property-based testing, powers (if used)
- [ ] Optional bonuses: blog post (mentions Kiroween 2026) and social post starting with `#KiroweenHackathon26`, both published before the deadline

## Deadline
Friday 4 Dec 2026, 14:00 PT (Saturday 5 Dec, 05:00 WIB). Submit at least a day early.
