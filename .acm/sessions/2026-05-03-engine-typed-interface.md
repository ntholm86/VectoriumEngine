# Session: engine-typed-interface

**Date:** 2026-05-03  
**Skill:** improve v3.7.0  
**Target:** vectorium (`C:\git\vectorium`)  
**Operator:** lkn  
**Agent:** GitHub Copilot (Claude Sonnet 4.6 / Anthropic)

---

## What was done

Replaced `protected engine: any = null;` on `Scene` with `protected engine: IEngine | null = null;`, backed by a new `IEngine` interface and a typed setter `_setEngine()`.

**Why a separate interface file?** Engine.ts imports Scene.ts. Scene.ts cannot import Engine.ts — circular. `IEngine.ts` sits between them: neither file imports the other to get the type.

**IEngine exposes:** `textureManager: TextureManager`, `config: EngineConfig`, `performanceMonitor: PerformanceMonitor` — exactly what bunnytest.ts subclass actually uses.

**`(scene as any).engine = this`** in Engine.ts → `scene._setEngine(this)` — consistent with the `_setAnimationSystem` / `_setPerformanceMonitor` pattern.

**bunnytest.ts:** `!` non-null assertions added at lifecycle call sites where engine is guaranteed set (after `registerScene()`). The existing null check in `render()` provides correct narrowing and was unchanged.

## Verified

- `tsc --noEmit` — zero errors in changed files; pre-existing errors unchanged
- `vitest run` → 30/30 passed

## Realization (carry forward)

The last `any`s in Scene.ts's injection surface: `_setTextureManager(textureManager: any)` parameter and `private _textureManager: any`. One more run closes it.
