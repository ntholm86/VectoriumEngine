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
