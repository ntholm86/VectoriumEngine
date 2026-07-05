/**
 * Entity-churn render regression test.
 *
 * Pins the invariant behind the 2026-07-05 "invisible bullets" bug:
 * entity IDs are SPARSE after free-list recycling, so the render path must
 * iterate the allocated ID range (World.getTotalCount()), never the active
 * entity COUNT (World.getActiveCount()). Bounding the render loop by a count
 * silently skips live entities with high IDs — they keep colliding but stop
 * rendering.
 *
 * The renderer is a stub capturing the draw call; no WebGL required.
 */

import { Scene } from './Scene';
import { World } from './World';

interface CapturedDraw {
  flags: Uint32Array;
  indices: Uint32Array;
  count: number;
  flagVisible: number;
}

function makeStubRenderer(captured: CapturedDraw[]) {
  return {
    drawBulkShapesIndexed(
      _posX: Float32Array, _posY: Float32Array, _rotation: Uint16Array, _sizes: Float32Array,
      _colorR: Uint8Array, _colorG: Uint8Array, _colorB: Uint8Array, _alphas: Float32Array,
      _shapeTypes: Uint8Array, flags: Uint32Array, indices: Uint32Array,
      count: number, flagVisible: number
    ): void {
      captured.push({ flags, indices, count, flagVisible });
    },
  } as any;
}

/** IDs the draw call would actually render: in-range, indexed, and flagged visible. */
function renderedIds(draw: CapturedDraw): Set<number> {
  const ids = new Set<number>();
  for (let i = 0; i < draw.count; i++) {
    const id = draw.indices[i];
    if (draw.flags[id] & draw.flagVisible) ids.add(id);
  }
  return ids;
}

describe('Scene render under entity churn', () => {
  it('renders every live entity when IDs are sparse (count < max live ID)', () => {
    const scene = new Scene('churn-test', 1000);
    const world: World = scene.getWorld();

    // Allocate 100 shape entities (IDs 0..99)
    const ids: number[] = [];
    for (let i = 0; i < 100; i++) {
      const id = world.createEntity(i, i);
      world.setShapeType(id, 1);
      ids.push(id);
    }

    // Churn: destroy the first 60 — free list now holds 0..59,
    // live entities are IDs 60..99, activeCount = 40.
    for (let i = 0; i < 60; i++) world.destroyEntity(ids[i]);

    const live = ids.slice(60);
    expect(world.getActiveCount()).toBe(40);
    // Regression precondition: the OLD bug (bound = activeCount) would skip
    // every live entity here, because all live IDs are >= activeCount.
    expect(Math.min(...live)).toBeGreaterThanOrEqual(world.getActiveCount());

    const captured: CapturedDraw[] = [];
    scene.render(makeStubRenderer(captured));

    expect(captured).toHaveLength(1);
    const rendered = renderedIds(captured[0]);

    for (const id of live) {
      expect(rendered.has(id)).toBe(true); // every live entity renders
    }
    for (const id of ids.slice(0, 60)) {
      expect(rendered.has(id)).toBe(false); // destroyed entities do not
    }
  });

  it('renders recycled entities after destroy/create cycling', () => {
    const scene = new Scene('recycle-test', 1000);
    const world: World = scene.getWorld();

    // Waves of create/destroy to mix the free list thoroughly
    let cohort: number[] = [];
    for (let wave = 0; wave < 5; wave++) {
      for (const id of cohort) world.destroyEntity(id);
      cohort = [];
      for (let i = 0; i < 50; i++) {
        const id = world.createEntity(wave * 10 + i, 5);
        world.setShapeType(id, 2);
        cohort.push(id);
      }
    }

    expect(world.getActiveCount()).toBe(50);

    const captured: CapturedDraw[] = [];
    scene.render(makeStubRenderer(captured));
    const rendered = renderedIds(captured[0]);

    for (const id of cohort) {
      expect(rendered.has(id)).toBe(true);
    }
    expect(rendered.size).toBe(50); // and nothing else
  });
});
