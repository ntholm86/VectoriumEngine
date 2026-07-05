# Destination — vectorium

_Operator-held. Written from confirmed Hunch run, 2026-05-02. Edit freely — this is yours, not the agent's._

_Renamed from `vision.md` on 2026-05-28 alongside the Vision→Destination skill rename (skill v2.0.0 in autonomous-agent-skills, commit e3d1577)._

---

## What this is

Vectorium is a **performance-proven WebGL2/WASM game engine** that started as a solution to a real problem (a game that needed high entity throughput) and became a benchmark proof (beat other engines on bunnymark). Both are true — it is a real engine built for real performance, not a toy, but the immediate motivation ran out when the benchmark was won.

The engine is technically capable. 6M+ bunnies at 60 FPS is not achieved by accident. The WASM physics and rendering modules represent real investment. The problem is not capability.

## Where it stopped

The benchmark goal was met. Interest in further development dropped after that. The engine is dormant (last commit December 2025) not because of a technical blocker but because the motivating question — "can I build something faster than the alternatives?" — was answered.

## What a return would mean

If development resumes, the priority is **API surface and harness robustness** — not performance work. The rendering and physics capability is there. What is missing is an API that makes the engine usable for building a game without reading source code. The WASM physics module (`assembly/physics.ts`) is not integrated into the main path; that is one concrete place the gap shows.

The original game that triggered the engine's creation is the latent test case. "Can I now build that game with vectorium?" is a concrete question that would drive the right API decisions.

## What this is not for

- Further bunnymark optimization — that question is answered.
- Publishing to npm before the API is cleaned up — `npm link vectorium-engine` is honest about where it is.

---

## Layer 2 — Revival: beat everything (operator-stated, 2026-07-05)

The engine is no longer dormant. Operator words, verbatim: "i want it to beat all the other canvas engines in performance and quality."

This supersedes the dormancy framing above and the "not for" item on bunnymark optimization. Preserved above as history: the benchmark question WAS answered once (6M+ bunnies), and the revival re-opens it as a standing pursuit, not a one-off.

**The destination now has three legs:**

1. **Performance leadership** — beat other canvas/WebGL engines on benchmarks. Bunnymark is the flagship; other benchmarks should join it (operator: "there may be other benchmarks too we should include").
2. **Quality** — not just throughput: correctness (see orientation 2026-07-05: churn/lifecycle seams), API robustness, and visual quality count toward "beat."
3. **Fun games as proof** — game-portal games ("fun games that demonstrate the capabilities and limitations of my engine") are the living demonstration layer. Games expose real-usage seams benchmarks miss — the sparse-ID rendering bug was found by a game, not the benchmark.

**Confirmed constraint carried forward:** the operator pursues performance relentlessly (git history: 260k → 6.1M bunnies through loop unrolling, branchless math, GPU rotation, vertex packing, WASM). Performance regressions are never acceptable trade-offs without explicit operator sign-off.

**Open (not asked, not confirmed):**
- Which competitor engines define the bar (PixiJS is the natural bunnymark rival; Phaser? Two.js?).
- Whether "quality" includes developer experience / docs as a competitive axis.
- Which additional benchmarks to adopt (churn benchmark? physics stress? draw-call-heavy scenes?).

**Confirmed constraint (operator-stated, 2026-07-05):** No hardcoded caps. "We are trying to push the possibilities of what is possible with this engine" — engine limits must be discovered empirically (memory, fill rate, driver behavior), never declared by a constant. Defaults may exist for allocation sizing, but no benchmark or code path may stop at an arbitrary number.

---

## Layer 3 — Historical requirements distilled from engineDocs (2026-07-05)

Read from ~41 engineDocs files at operator direction ("you should be able to get a good sense of the requirements and my destination from reading it").

**The benchmark metric, as it always was:** "what can it handle while maintaining 60 FPS" (operator, this session, matching the historical tier system: Bronze 10k → Gold 100k @ 60 FPS → Diamond 1M). The headline number is entities sustained at 60 FPS, GPU-synced. Max-count-at-any-FPS figures (e.g. 50M @ 3.6 FPS) are envelope data, never the headline.

**Original destination (MassCanvas era):** "the world's first production-grade MMO game engine built entirely for HTML5 Canvas/WebGL... 1000+ concurrent players with 60 FPS performance on both desktop and mobile." Named constraints: NO HTML (everything canvas-rendered), mobile target 30 FPS, server-authoritative multiplayer envisioned.

**Quality non-negotiables (documented as not-sacrificeable for performance):**
- Texture support (a 16-byte vertex format was rejected for dropping it)
- Text rendering, shapes, physics
- Transparent ECS — "users get professional ECS performance without learning ECS patterns"
- Zero-allocation architecture, SOLID extensibility
- Visual quality: "Reject: FPS drop > 5% OR visual quality loss"

**Historical change-acceptance rule (worth keeping):** Accept an optimization only if FPS is same/better OR time reduction > 10%; reject on FPS drop > 5% or visual quality loss.

**Verdicts expire:** GPU instancing was measured "78% slower than batching" and rejected (PERFORMANCE_LOG.md); it is now the flagship path after zero-copy/static-buffer redesign. Failed-optimization verdicts are dated facts about a design, not eternal truths about a technique.

**Best historical claim at the honest metric:** 601k entities @ 60 FPS ("Unrivalled"). Current session's synced numbers: CPU-physics 1.8M, GPU-physics 3.2M @ 60 FPS — the lineage continues on the same metric.

**Architectural boundaries (operator-stated, 2026-07-05):** DRY, KISS, YAGNI, solve-by-design ("the best way to prevent an exception is to make the bug impossible"), simplicity, clarity, consistency, transparency. **PERFORMANCE and QUALITY overrule everything else** — a quality principle is never a license to slow the hot path; a hot-path trick is never a license to hide a bug-friendly structure. These are boundaries, not aspirations: changes violating them need explicit operator sign-off.
