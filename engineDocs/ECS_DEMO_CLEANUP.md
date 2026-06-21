# ECS Integration - Demo Cleanup Checklist

## Completed ✅
1. ✅ Added World import to Engine.ts
2. ✅ Added World instance to Scene class
3. ✅ Added entityToId WeakMap for tracking
4. ✅ Modified Scene.addEntity() to automatically create ECS components
5. ✅ Modified Scene.update() to run ECS systems first, then sync
6. ✅ Modified Scene.removeEntity() to destroy ECS components
7. ✅ Modified Scene.clear() to clean up ECS
8. ✅ Kept Scene.render() simple (entities render themselves with ECS data)
9. ✅ Fixed World.ts import path in ImpressiveShowcaseScene

## Pending (Demo Cleanup)

### ImpressiveShowcaseScene.ts Changes
- [ ] Remove: `import { World, EntityId } from '../vectorium/core/World'` (not needed anymore)
- [ ] Remove: `private ecsWorld: World` field
- [ ] Remove: `private ecsEntityIds: EntityId[]` field
- [ ] Remove: `private useECS = true` field
- [ ] Remove: `this.ecsWorld = new World(200000)` from constructor
- [ ] Simplify: `addStressEntities()` - remove ECS branches, just create StressEntity
- [ ] Simplify: `getTotalEntityCount()` - just return `this.entities.length`
- [ ] Simplify: `update()` - remove `ecsWorld.updatePhysics()` and `ecsWorld.updateAnimations()` calls
- [ ] Simplify: `render()` - remove ECS rendering code (engine handles it)

### StressEntity Changes
Option A (Recommended): Keep logic, let ECS accelerate
- Current approach works: StressEntity has logic, engine adds ECS optimization layer
- Entity positions get synced: ECS → Entity → Entity.update() → ECS
- Benefits: Backward compatible, entities work as before but faster

Option B: Make data-only (requires more changes)
- Remove all update logic from StressEntity
- Make update() and render() empty/minimal
- Let ECS do 100% of the work
- Problem: Need to map animationType string → number

**Decision: Go with Option A for now**
- Existing demos keep working
- ECS acceleration is transparent
- Can optimize individual entities to Option B later

## Expected Results
- ImpressiveShowcaseScene code becomes simpler (no manual ECS management)
- StressEntity keeps working exactly as before
- But now gets 3-5x speedup from ECS physics layer
- 166k entities: 35ms → 10-15ms update time (target: <10ms)
- No code changes required in other demos (ParticleSystem, TrailSprite, etc.)

## Testing Plan
1. Run impressive-demo with 166k entities
2. Verify update time is <15ms (down from 35ms)
3. Verify no rotation warnings
4. Verify FPS stays 60+
5. Verify entity count displays correctly
6. Test all demo modes (showcase, stress, effects)
7. Test particle effects still work
8. Test buttons and UI still work

## Notes
- ECS is now transparent - demos don't need to know about it
- Entities that have custom physics (TrailSprite, ParticleSystem) keep their logic
- Entities benefit from ECS physics layer automatically
- Future: Can create fully data-only entities (empty update/render) for maximum performance
