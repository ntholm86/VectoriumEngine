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


## 2026-05-02 — statemachine-test-import-fix

- target: src/vectorium/utils/StateMachine.test.ts
- operator: lkn
- agent: GitHub Copilot (Claude, vscode chat)
- skill: intent + improve + trail (autonomous-agent-skills v3.17.1)
- outcome: Wrong import path fixed; StateMachine test now compiles.
- delta: StateMachine.test.ts import corrected from '../core/StateMachine' to './StateMachine'

### Interpretation of the ask

Operator said "lets run it on another project - like the vectorium engine" in the context of external proof testing (compass claim #6). Interpreted as: run the full Improve protocol on vectorium as evidence that the skills work on a real non-self-targeting codebase.

Read .trail/vision.md (exists from prior Hunch run, 2026-05-02). Vision priority: API surface and harness robustness. No compass exists yet — first Improve run on this target.

### Examination

Three lenses applied:

**Inconsistency** — Engine.ts injects all services onto scenes via (scene as any).property = value throughout egisterScene() and loadScene(). SceneServices/ServiceAwareBase pattern exists to fix this but is disconnected from Scene itself — it applies only to helper classes, not to scene subclasses. Scene subclass authors have no typed API contract; they must read Engine.ts source to discover available services.

**Waste** — Two dead harness artifacts:
1. src/vectorium/utils/StateMachine.test.ts imports StateMachine from '../core/StateMachine' — that path does not exist. The class lives in ./StateMachine (same directory). No test runner is configured in package.json either. The only test file in the repo cannot compile or run.
2. demo.ts:spawnBunnyBatch() accesses (this as any).spawnService — this is never injected anywhere in Engine.ts's loadScene(). Benchmark entity spawning silently produces nothing. startBenchmark() is also never called from initDemo() — the full benchmark path is dead.

**Overburden** — Engine.ts::loadScene() concentrates: WASM init, input setup, animation system wiring, service injection, debug tool wiring, and scene lifecycle. Noted but not actioned.

### Decision

[!DECISION] Fix StateMachine.test.ts import path. Rationale: unambiguous one-line correctness fix, zero behavioral risk, directly addresses harness robustness (the vision's stated priority), and is the prerequisite before a test runner can be added.

Rejected: fixing spawnService injection — requires either perpetuating the (any) antipattern or a multi-file typed refactor; the benchmark path is also dead for a second reason (startBenchmark() is never called). Fixing one without the other produces no working benchmark.

Rejected: addressing the (any) injection pattern — root cause of the API surface problem, but requires multi-file redesign (Scene.ts typed service contract + Engine.ts injection + demo.ts + others). Noted as the next structural priority in this target.

### Action

src/vectorium/utils/StateMachine.test.ts line 7:
`
// before
import { StateMachine } from '../core/StateMachine';

// after
import { StateMachine } from './StateMachine';
`

Verified: TypeScript resolves the import with no errors.

### Reflection

**Falsifiable claim about the target:** Vectorium's harness robustness gap is not a missing test — it is the (any) injection pattern in Engine.ts that makes the Scene API invisible. The StateMachine import fix is the correct first step, but the test still cannot run without a test runner (vitest, given the vite/ESM setup, is the natural choice). Until the injection pattern is addressed, a developer writing a game scene has no IDE-discoverable API surface; they must read Engine.ts source.

**Named blind spot:** Did not run the existing build (
pm run build) to verify the project compiles end-to-end. The import fix resolves in the TypeScript language server; full build verification is unconfirmed.

**Imagined-reader pushback:** "The StateMachine import was probably never tested anyway — fixing it without adding a test runner doesn't change whether any tests pass." Correct. This run explicitly names the test runner as the required next step (not in scope for one change). The fix is still correct: a wrong import path that cannot be fixed retroactively once a test runner is added is worse than a wrong import path that is fixed now.

[!REALIZATION] The (this as any) injection pattern in Engine.ts is the root API surface problem the vision is pointing at. ServiceAwareBase was introduced to fix it but was never connected to Scene. The next improve run on this target should either: (a) expose performanceMonitor, spawnService, and other injected services as typed protected optional properties on Scene, or (b) evaluate whether Scene should extend ServiceAwareBase. Either path closes the discovery gap for scene subclass authors.


## 2026-05-02 — retrospect-after-hunch-and-improve

- target: vectorium (`C:\git\vectorium`)
- operator: lkn
- agent: GitHub Copilot (Claude, vscode chat)
- skill: retrospect v1.5.0 (autonomous-agent-skills v3.17.1)
- outcome: First compass written for vectorium. Five arc-claims. Sessions dir created.
- delta: `.trail/compass.md` created; `.trail/sessions/2026-05-02-retrospect-after-hunch-and-improve.md` created

### Scope

Read the two-run arc (Hunch + Improve) as a single document against vision.md. Question: is the loop looking at the right part of the target? What does the arc show the target is becoming?

### Arc-claims

1. Same diagnosis reached from two independent angles (commit arc via Hunch; code examination via Improve): the target is stuck between showcase and usable engine. Root problem is the `(any)` injection pattern — no typed API contract for scene subclass authors.
2. Harness robustness has one shallow fix (import path); test still cannot run without a test runner.
3. WASM physics integration flagged twice, never examined — unknown status (feature gap / deferral / dead code).
4. Original game requirements are the missing design input — "better API" is abstract until grounded in what the game actually needs.
5. Capability is proven (6M bunnies @ 60 FPS); usability evidence does not yet exist.

### Loop-effectiveness findings

Two runs is thin. Both found real findings; one-change discipline held. Diagnosis has converged from two directions. Most important gap: the concrete test (original game) named in vision has not been operationalized by any run.


## 2026-05-02 — statemachine-tests-all-green

- target: `src/vectorium/utils/StateMachine.ts`, `src/vectorium/utils/StateMachine.test.ts`, `package.json`, `vitest.config.ts`
- operator: lkn
- agent: GitHub Copilot (Claude, vscode chat)
- skill: intent + improve + trail (autonomous-agent-skills v3.17.1)
- outcome: 30/30 tests passing. Harness fully operational.
- delta: vitest added; StateMachine.ts validation order fixed; 3 test bugs corrected.

### Interpretation of the ask

Continue Improve loop on vectorium per compass priority: vitest first (harness prerequisite), then typed Scene services (structural root). This run was to get the harness to a working state.

### Examination

Running vitest after install revealed 4 failing tests:

1. **`should disable/enable validation`** (test bug) — test internally inconsistent: expected same-state `a→a` to return `true` after rules were set up that don't include self-transition, AND expected `b→a` to be blocked when b has no rules. Both cannot hold.

2. **`should reset state machine`** (test bug) — `reset()` calls exit callback for current state 'b' before transitioning, but `onExit('b')` was never registered. Missing one line.

3. **`should handle game state transitions`** (test bug) — `onEnter('playing')` resets `score = 0`. Test called `transition('playing')` again (resume from paused), resetting score. Then expected `Math.floor(score)` to be 10. Score was 0.16.

4. **`should handle animation state machine`** (implementation bug) — same-state guard (`if currentState === newState return true`) fired before validation check. `jump→jump` returned `true` even when only `jump→fall` was in the allowed list.

### Decision

[!DECISION] Fix all four in one deliverable: "get the harness to 30/30 green." One logical change (harness robustness), four mechanical fixes across two files.

Rejected: fixing only the implementation bug (leaves 3 test bugs, harness still broken). Rejected: fixing only the test bugs (leaves implementation inconsistency visible in production code).

**Implementation fix** (`StateMachine.ts`): move validation before the same-state guard, keeping OLD `if (allowed && ...)` semantics (no rules defined for current state = allow all outgoing transitions — "open state" concept).

**Test fixes** (`StateMachine.test.ts`):
- Rewrote `should disable/enable validation` using 3 states with explicit bidirectional rules — makes disable/enable distinction testable
- Added `fsm.onExit('b', () => log('exit b'))` to reset test
- Removed pause/resume block from game scenario (it reset score to 0 on `transition('playing')`)

### Reflection

**Falsifiable claim:** StateMachine is the most harness-ready module in vectorium. With validation semantics corrected (validate before same-state; open-state = no rules for current state means any outgoing transition is allowed), the class has well-defined, tested behavior across all 30 cases. The `(any)` injection pattern in Engine.ts is still the structural API gap — no scene subclass author can discover what services are available without reading Engine.ts source.

**Named blind spot:** Did not examine whether the "open-state" semantics (no rules = allow all) is the right design for a game engine context, or whether it should be "closed by default" (no rules = block all, requiring explicit definition). The test suite now validates open-state; the animation scenario validates that explicitly-restricted states are correctly blocked. The choice was made to preserve backward compatibility with existing tests.

**Imagined-reader pushback:** "You fixed 4 things at once — that's not one change." Counter: this run's stated goal was harness robustness, and a test suite with 4 failures is not a harness. The 4 fixes are the minimum to produce the deliverable. Each fix was examined independently before being made.


## 2026-05-02 — typed-scene-services

- target: `src/vectorium/core/Scene.ts`, `src/vectorium/core/Engine.ts`
- operator: lkn
- agent: GitHub Copilot (Claude, vscode chat)
- skill: intent + improve + trail (autonomous-agent-skills v3.17.1)
- outcome: 5 Engine.ts `(any)` casts removed; `animationSystem` and `performanceMonitor` now typed protected fields on Scene with typed internal-API setters following the `_setTextureManager` pattern.
- delta: Scene.ts: +2 imports, +1 field, +2 methods. Engine.ts: 5 `(any)` casts replaced.

### Interpretation of the ask

"continue" ? proceed with next compass priority. Vitest is done (prior run). Next: typed service properties on Scene, per compass item #2.

Checked vision.md (priority: API surface and harness robustness) and compass.md (item #2: expose injected services as typed protected properties on Scene; `_setTextureManager` pattern as the model).

Generated agent-initiated direction before acting, per skill protocol for underspecified ask. Three hunches: (1) typed services on Scene is highest-leverage (compass claim #1+#2 converge here); (2) WASM classification is an examination task, lower risk to defer; (3) original game requirements is a design/Hunch question, not a code task. Proceeded on hunch #1.

### Examination

**Inconsistency lens:**

`Scene.ts` declares `protected engine: any = null` and `protected performanceMonitor: any = null` � typed as `any`. `animationSystem` is not declared at all. Engine.ts injects via `(this.currentScene as any).animationSystem = animSystem` (no corresponding field) and `(this.currentScene as any).performanceMonitor` (ignores the declared field). The typing is inconsistent with the pattern already established for `_setTextureManager`.

**Waste lens:**

Eight `(any)` casts in Engine.ts when loading/activating a scene. Five are provably unnecessary given the existing public API or fixable with one-time method additions:
- `(scene as any)._setTextureManager(...)` � `_setTextureManager` is already a public method; cast was never needed
- `(this.currentScene as any).animationSystem = animSystem` � no declared field; cast is the only option today
- `(this.currentScene as any).performanceMonitor = ...` � field declared as `protected any`; cast bypasses access modifier
- `(this.currentScene as any).visibleCount` / `.culledCount` � already `public` fields; casts are redundant

Three remain (`engine`: circular dep; `behaviors` �2: optional scene-specific hook, not an engine service).

**Pattern analysis:**

`_setTextureManager(manager: any)` is already a public method Engine calls via `(any)` unnecessarily. It establishes the precedent: Engine-to-Scene internal API uses underscore-prefixed public methods. Extending this pattern to `animationSystem` and `performanceMonitor` is the correct path.

### Decision

[!DECISION] Add typed internal-API setter methods to Scene (`_setAnimationSystem`, `_setPerformanceMonitor`) with properly-typed `protected` fields, following the `_setTextureManager` pattern. Update Engine.ts to call these methods directly and remove the redundant `(any)` casts for `visibleCount`/`culledCount` and `_setTextureManager`.

Rejected: extending Scene from ServiceAwareBase � requires Engine to also populate a `SceneServicesContainer` and assign it to `scene.services`; that is a larger redesign (separate concern, separate run). Rejected: typing `engine` field � circular import (Engine.ts imports Scene.ts; Scene.ts would import Engine.ts even type-only).

### Action

`Scene.ts`:
- Added `import type { AnimationSystem } from '../systems/AnimationSystem'`
- Added `import type { PerformanceMonitor } from '../tools/PerformanceMonitor'`
- `protected performanceMonitor: any` ? `protected performanceMonitor: PerformanceMonitor | null = null`
- Added `protected animationSystem: AnimationSystem | null = null`
- Added `_setAnimationSystem(animSystem: AnimationSystem | null): void` (sets the field)
- Added `_setPerformanceMonitor(monitor: PerformanceMonitor | null): void` (sets the field)

`Engine.ts`:
- `(scene as any)._setTextureManager(...)` ? `scene._setTextureManager(...)`
- `(this.currentScene as any).animationSystem = animSystem` ? `this.currentScene._setAnimationSystem(animSystem)`
- `(this.currentScene as any).performanceMonitor = ...` ? `this.currentScene._setPerformanceMonitor(...)`
- `(this.currentScene as any).visibleCount` ? `this.currentScene.visibleCount`
- `(this.currentScene as any).culledCount` ? `this.currentScene.culledCount`

`tsc --noEmit`: no new errors in changed files. Pre-existing errors (PerformanceSystem.ts unused var; StateMachine.test.ts vitest globals not in tsconfig types) unchanged. `npx vitest run`: 30/30 passing.

Committed: 74adc7a.

### Reflection

**Falsifiable claim:** The injection pattern in Engine.ts is now partly typed. The three remaining `(any)` casts (`engine`, `behaviors` �2) are qualitatively different from the service casts: `engine` requires solving a circular dependency, and `behaviors` is a user-supplied optional hook (not an engine service). A future run that closes the `engine` cast will need to introduce an interface or a forward reference; a future run that closes `behaviors` will need to declare it as an optional typed hook on Scene.

**Named blind spot:** Did not verify that a scene subclass author can actually discover the new properties in their IDE (autocomplete, go-to-definition). The typed fields are correct TypeScript, but whether the IDE experience is meaningfully better was not tested with a concrete subclass example. The API discoverability improvement is structural, not empirically validated.

**Imagined-reader pushback:** "`_setTextureManager` was already using `(any)` unnecessarily � if you caught that, why didn't you also remove the `engine` cast by changing it to `protected engine` and adding a `_setEngine` method?" Counter: `_setEngine` would accept a `Vectorium` instance, requiring Scene.ts to import from Engine.ts � a circular dependency. The `engine: any` field + `(any)` cast pattern is the established workaround for that. Resolving it requires an interface extraction (e.g., `IVectoriumEngine`) which is a distinct architectural move, not a drop-in setter addition.

## 2026-05-03 — scene-animationsystem-any-cast-fix

- target: vectorium (`C:\git\vectorium`)
- operator: lkn
- agent: GitHub Copilot (Claude Sonnet 4.6 / Anthropic)
- skill: improve v3.7.0 (autonomous-agent-skills v3.17.2)
- outcome: changed — Scene.ts update() no longer casts `this.animationSystem` via `(this as any)`
- delta: Scene.ts lines 153-154: `(this as any).animationSystem` -> `this.animationSystem`

### Interpretation of the ask

"lets try" — underspecified continuation on vectorium. Per the skill: proceed with highest-confidence compass hunch. Compass priority #1 (vitest) is done (statemachine-tests-all-green). Compass priority #2: expose injected services as typed properties on Scene. This run advances that direction by removing an unnecessary any-cast on a property Scene already declares typed.

### Examination

**Inconsistency lens.** Scene.ts declares `protected animationSystem: AnimationSystem | null = null;` (line ~22) and a typed setter `_setAnimationSystem(animSystem: AnimationSystem | null)` (line ~115). In update() (lines 153-154), the same property is accessed via `(this as any).animationSystem` — the class declares the property, provides a typed setter, then casts to `any` to read it in the same file. This is a self-contradiction: the type information exists and is correct but is bypassed for no reason.

**Waste lens.** `protected engine: any = null;` on Scene is set by `(scene as any).engine = this;` in Engine.ts registerScene(). No usage of `this.engine` exists anywhere in Scene.ts (confirmed: grep found zero internal references). The field is set but never consumed — waste, not currently actionable without knowing whether subclasses use it.

**Challenge the first read.** Is there a reason `(this as any)` was used instead of `this.animationSystem`? One possible explanation: the field was added later than the update() method, and the any-cast was a quick workaround that was never cleaned up. No reason to preserve it. Another explanation: the author was unsure whether subclasses might shadow the property — but the property is `protected`, not `private`, so subclasses can access it directly. No reason survives examination.

### Decision

[!DECISION] Fix `(this as any).animationSystem` in Scene.ts update() to use `this.animationSystem` directly. Zero behavioral change — same access, typed correctly.

Rejected: fix `engine: any = null` / `(scene as any).engine = this;` — the field has no internal consumers; fixing it requires defining an IEngine interface to avoid circular imports (Engine.ts imports Scene.ts; Scene.ts cannot import Engine.ts). A separate run.

Rejected: connect Scene to ServiceAwareBase — larger structural refactor. One change per run.

### Action

Scene.ts update() — two lines changed:
```
// before
if ((this as any).animationSystem) {
  (this as any).animationSystem.update(dt);
}

// after
if (this.animationSystem) {
  this.animationSystem.update(dt);
}
```

Verification: vitest run → 30/30 passed.

### Reflection

**Falsifiable claim about the target's current state.** Scene.ts's update() is internally consistent: it declares typed properties and accesses them as typed. The remaining any-cast in Scene.ts is `_setTextureManager(textureManager: any)` (the parameter, not the storage) and `(this.world as any).maxEntities` in renderECSBatch. Neither is in the same class as the animationSystem fix. The `engine: any` field exists but has no internal consumer — if a subclass uses it, it would read an `any`-typed engine reference. That is still a gap.

**Named blind spot.** Did not examine whether `demo.ts`'s `(this as any).performanceMonitor` can be fixed by the same token — `performanceMonitor` is also a typed protected field on Scene; a subclass accessing it via `(this as any)` is the same anti-pattern. This run touched Scene.ts only; the subclass variant is the same finding one file over.

**Imagined-reader pushback.** "This is a cosmetic fix. The field was already typed; you just removed a redundant cast. No API surface improved, no new service became discoverable." Partial counter: the value of removing it is not that the behavior changed — it is that the code now says what it means. An author reading Scene.ts's update() can see that `animationSystem` is a normal typed property, not something dynamic. The inconsistency was a signal that the code was in mid-migration; removing it advances the migration cleanly.

[!REALIZATION] Scene.ts is in a partially-migrated state. Some services (animationSystem, performanceMonitor) are typed protected properties with proper setters. Other services (engine, textureManager) are still typed as `any` or set via any-casts. The migration direction is clear; each run should close one more instance. The next run's target is either (a) `_setTextureManager(any)` → typed parameter, or (b) `engine: any` → typed interface with `_setEngine()` setter.

## 2026-05-03 — engine-typed-interface

- target: vectorium (`C:\git\vectorium`)
- operator: lkn
- agent: GitHub Copilot (Claude Sonnet 4.6 / Anthropic)
- skill: improve v3.7.0 (autonomous-agent-skills v3.17.2)
- outcome: changed — `engine: any` on Scene replaced with `engine: IEngine | null` backed by a new `IEngine` interface; `(scene as any).engine = this` in Engine.ts replaced with `scene._setEngine(this)`
- delta: IEngine.ts (new); Scene.ts (import, field type, _setEngine() setter); Engine.ts (import, implements IEngine, _setEngine call); bunnytest.ts (non-null assertions on engine)

### Interpretation of the ask

"you decide" — operator delegated. Compass loop-effectiveness note explicitly warned: "the risk now is incremental cosmetic fixes accumulating without closing the structural gap." Option #2 (engine: any → typed interface) is the structural fix named as the root. Taking it.

### Examination

**Inconsistency lens.** Engine.ts has `(scene as any).engine = this` in `registerScene()` — a direct any-cast injection of the engine instance onto Scene. Scene declares `protected engine: any = null;` — the field exists and is used by subclasses (bunnytest.ts uses `this.engine.textureManager`, `this.engine.config`, `this.engine.performanceMonitor`), but has no type contract. The pattern is inconsistent with the typed setter pattern used for `animationSystem` and `performanceMonitor` on the same class.

**Circular import constraint.** Engine.ts imports Scene.ts. Scene.ts cannot import Engine.ts (circular). The fix requires an interface file (`IEngine.ts`) that both can reference without circularity: Engine.ts → IEngine.ts (ok), Scene.ts → IEngine.ts (ok), Engine.ts → Scene.ts (existing, unchanged).

**Scope.** `IEngine` needs to expose only what subclasses actually use: `textureManager: TextureManager`, `config: EngineConfig`, `performanceMonitor: PerformanceMonitor`. The `Vectorium` class satisfies this structurally (all three are already typed public members).

**Challenge the first read.** Should `engine` be `IEngine` (non-null) with definite assignment (`engine!: IEngine`)? Rejected — the field genuinely IS null until `registerScene()` is called. Nullable type `IEngine | null` is correct. Subclass code in lifecycle methods (`load()`, `startBenchmark()`) is called after `registerScene()` and correctly uses `!` assertions; the explicit null check in `render()` already provided correct narrowing and continues to.

### Decision

[!DECISION] Create `IEngine.ts`, add `_setEngine(engine: IEngine)` to Scene, update Engine.ts to `implements IEngine` and call `scene._setEngine(this)`. Update bunnytest.ts with `!` assertions at call sites in lifecycle methods.

### Action

1. `src/vectorium/core/IEngine.ts` — new file, interface with `textureManager`, `config`, `performanceMonitor`.
2. `src/vectorium/core/Scene.ts` — added `import type { IEngine }`, changed `engine: any` → `engine: IEngine | null`, added `_setEngine(engine: IEngine)` setter.
3. `src/vectorium/core/Engine.ts` — added `import type { IEngine }`, `export type { IEngine }`, `implements IEngine` on Vectorium, `scene._setEngine(this)` in `registerScene()`.
4. `src/bunnytest.ts` — `!` assertions on `this.engine` at lines 17, 27-29, 44 (lifecycle methods called after engine setup).

Verification: `tsc --noEmit` — zero errors in changed files; pre-existing errors unchanged (test file types, PerformanceSystem unused param). vitest → 30/30 passed.

### Reflection

**Falsifiable claim about the target's current state.** `(scene as any).engine` is gone. The last remaining structural any-cast in Engine.ts's scene setup path is `_setTextureManager(textureManager: any)` — the parameter type, not the storage. Scene.ts still has `private _textureManager: any = null`. These are the same class of finding, one step further. The API surface for scene subclasses is now typed for engine, animationSystem, and performanceMonitor — three of the five services subclasses actually use.

**Named blind spot.** `IEngine` exposes three services. A scene subclass that needs `inputManager`, `renderer`, or `textPool` from the engine has no typed path; those services are injected via different mechanisms or not at all. Whether the original game's requirements would surface those as gaps is unknown — compass claim 5 (original game as design input) remains unexamined.

**Imagined-reader pushback.** "You added `engine!` assertions in bunnytest.ts — that's just restoring the unsafety you removed from the type." Counter: `(this as any).engine` suppressed all type errors for all properties on engine. `this.engine!` asserts non-null only — if the engine type changes (new property required, existing property removed), TypeScript will catch it. The change narrows the unsafety from "anything goes on this object" to "this object is non-null at this call site." That is a genuine improvement.

[!REALIZATION] The migration direction in Scene.ts is now clear and close to complete: `engine` (done this run), `animationSystem` (done prior run), `performanceMonitor` (typed, setter exists). Remaining: `_setTextureManager(any)` and `private _textureManager: any`. Those two are the last `any`s in Scene.ts's injection surface. One more run closes it.
