# Vectorium — Evidence Trail

Append-only. One entry per substantive session. Newest at the bottom.

---

## 2026-05-02 — hunch-on-vectorium-cold-foreign-target

- target: vectorium
- operator: lkn
- agent: GitHub Copilot (Claude, vscode chat)
- skill: hunch (v1.0.0, from C:\Users\admin\.copilot\skills)
- outcome: All three hunches confirmed. First successful cold Hunch run on this target — no .trail/, no vision.md, no prior agent context. Signal derived entirely from code structure, git history, and package.json.
- delta: .trail/log.md created (this file)

### Interpretation of the ask

Operator said "Try to run the hunch skill on another repo: vectorium" immediately after confirming an earlier Hunch run was good and expressing that the skillset proves its worth. This is a deliberate test: run Hunch cold, without priming, on a repo the operator hasn't discussed in the active session. No context given. No trail exists in vectorium.

### Examination

Signal gathered:
- `README.md` — performance-first framing, leads with benchmark numbers (600k entities @ 60 FPS), "production-ready" language, npm package structure
- `git log` — last commit 2025-12-03, subject "fix". Commit history climbs: "fix gravity 5.5m bunnies" → "6.1m bunnies" → cleaning commits → silence. 5 months dormant.
- `package.json` — `npm link vectorium-engine` as install instruction (not published to npm). Repository URL set. `prepublishOnly` script. Keywords include "game-engine", "webgl2", "batch-rendering".
- `assembly/physics.ts`, `assembly/rendering.ts` — AssemblyScript WASM modules. Significant investment.
- `src/vectorium/physics/` — only `SpatialHash.ts`. WASM physics not integrated into main path.
- `src/bunnytest.ts`, `src/demo.ts` — both benchmarks/demos. No game source.

No `.trail/` directory existed. No vision.md. No compass. No prior runs.

### Decision

[!DECISION] Form hunches from code structure and git arc alone, without any operator priming. Three hunches formed and surfaced one at a time:

1. **Direction hunch** — engine is a performance showcase/technical proof, not just a game-building tool. Evidence: benchmark-led README, 6.1M bunny peak, WASM investment, npm package structure but not published.
2. **Constraint hunch** — project is stuck between "impressive benchmark" and "something people can build with." 5-month dormancy, no game built with it, npm install still local-only.
3. **Priority hunch** — WASM physics/rendering was exploratory performance testing, probably shelved. Evidence: `assembly/` has two WASM modules but main physics path only has `SpatialHash.ts`.

Prioritized question: is vectorium a showcase, a real engine for games, or for a specific game?

### Action

Surfaced all three hunches with sources and falsifiable questions. Operator confirmed:

1. **Hunch 1 confirmed** — "Both. I tried building a game with another library and ran into performance issues so i decided to build my own engine designed for performance. During the development i ran into the bunnymark standard and realized i had to use that to compare my engine against others — once i beat the others i lost interest in the engine but the experience was great."
2. **Hunch 2 confirmed** — "I THINK: a better API for the engine and harnessing its code making it easier to use and more robust."
3. **Hunch 3 confirmed** — "i was testing performance — making one single change — testing again and if something showed increased performance then it went IN. I was exploring any options for even small improvements including new ways of assembling the algorithms."

Critical finding: **Hunch 1 surfaced something the operator had not written anywhere.** "Lost interest after beating the others" does not appear in README, commits, docs, or any file. It was inferred from the arc: performance climb to peak → cleaning commits → silence.

### Reflection

**Falsifiable claim about the target's current state:**

Vectorium is a completed performance proof that has not yet become a usable engine. The gap is API design and harness robustness, not rendering capability. A motivated developer could build a game with it today but it would require reading source code to understand the API. The 5-month gap reflects motivation loss after the benchmark goal was met, not a technical blocker. If the operator returns to it, the first move is API surface work, not performance work.

**Named blind spot:**

The examination had no access to what the operator was originally trying to build (the game that hit performance issues). Knowing that game's requirements would sharpen "better API" into concrete API surface decisions. Without it, "better API" is still abstract.

**Imagined-reader pushback:**

"You got lucky — three broad hunches against a dormant creative project will almost always land because the operator fills in the gaps." Partial counter: Hunch 1's specific inference ("lost interest after beating the others") was not broad — it was derived from a specific pattern in the commit arc that is not the default assumption about a performance engine. Most performance engines are abandoned because they were too hard, not because they succeeded too well. Getting that direction right from arc-reading alone is not trivially explained by luck.
