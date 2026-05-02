# Compass — vectorium

_Last updated: 2026-05-02 (run: retrospect-after-hunch-and-improve)_  
_Derived from: full arc read of both runs (hunch-on-vectorium-cold-foreign-target + statemachine-test-import-fix), read against vision.md._

---

## Current claims

**1. The loop has confirmed the diagnosis from two independent angles; neither has been acted on at depth.**  
Hunch surfaced "stuck between showcase and usable engine" from commit-arc reading alone — no code examined. Improve reached the same conclusion from code examination — `(this as any)` injection in Engine.ts, no typed API contract for scene subclass authors. Two runs, same root problem, different entry points. The diagnosis is reliable. The actual fix (typed service exposure on Scene) has been named but not made.

**2. Harness robustness has had one shallow fix; the structural fix is one step away.**  
The StateMachine import correction was the correct first move — a prerequisite. The test still cannot run without a test runner (vitest is the natural fit given the vite/ESM setup). The import fix + test runner together close the "tests exist but can't run" gap. Without both, harness robustness remains aspirational.

**3. The WASM physics integration gap has been flagged twice but never examined.**  
Hunch noted it. Improve noted it. `assembly/physics.ts` is not wired into the main rendering path; the main physics path is `SpatialHash.ts` only. Neither run determined whether this is a feature gap (should be integrated), a deliberate deferral (performance tradeoff not worth it), or effectively dead code. Until examined, it is an unknown that could be significant or irrelevant — and it cannot stay unknown if the API surface work begins.

**4. The original game's requirements are the missing design input for all API surface work.**  
Vision names it explicitly: "can I now build that game with vectorium?" is the concrete question that would drive the right API decisions. No run has examined what that game requires. Without it, "better API" remains abstract — the loop can improve discoverability and reduce `any`-casts, but cannot validate that the result is actually usable for the intended purpose.

**5. The engine's capability is proven; the evidence of usability does not yet exist.**  
Six million bunnies at 60 FPS is documented. No complete game, no external consumer, no API usage example beyond the bunnymark demo (which accesses services via `(this as any)` and has a dead benchmark path). The performance proof and the usability proof are not the same thing. The loop has inherited a strong capability baseline; it has not yet produced any usability evidence.

---

## What the next runs should test

1. **Add vitest test runner** — closes the harness gap the StateMachine import fix opened. Without it, "harness robustness" has one fixed import and no ability to run. Vitest is the correct choice (vite ecosystem, ESM-native, TypeScript-first).
2. **Expose injected services as typed `protected` properties on `Scene`** — closes the root API discovery gap. The `(this as any)` pattern in Engine.ts's `loadScene()` is the structural problem. `ServiceAwareBase` was introduced to fix it but was never connected to `Scene`. Making `performanceMonitor`, `spawnService`, and the other injected services available as typed properties on the base class is the single highest-leverage API surface change.
3. **Determine WASM physics integration status** — read `assembly/physics.ts` and the `WasmPhysics`/`WasmPhysicsBridge` classes against the main update loop. Classify: feature gap, deliberate deferral, or dead code. This is a one-run examination that forecloses a large unknown.
4. **Name the original game's API requirements** — even a short list of what the original game needed (entity types, physics behavior, scene structure) would make "API surface work" concrete. This is a Hunch question, not a code question.

---

## Loop-effectiveness notes

Two runs is a thin arc — not enough to evaluate structural loop-effectiveness trends. What can be said: both runs found genuine findings (not manufactured); the one-change discipline held in the Improve run; the diagnosis has converged from two directions, which is a positive signal. The loop is at the beginning of a real arc. The most important observation is that the target has an unusually clear vision (the original game as the test) that no run has yet operationalized. That gap — between "API surface work" as an abstraction and "can I build that game?" as a concrete test — is where the loop's attention should move next.
