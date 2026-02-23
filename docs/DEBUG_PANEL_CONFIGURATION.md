# Debug Panel Configuration Guide

## Overview

Vectorium provides granular control over debug UI panels. Instead of an all-or-nothing approach, you can enable specific panels individually.

## Configuration Structure

### EngineConfig Interface

```typescript
interface EngineConfig {
  // ... other settings ...
  
  debugMode: boolean;              // Console logging
  enableDebugTools: boolean;       // Master switch for debug tools
  debugPanels?: Partial<DebugPanelConfig>; // Granular panel control
}

interface DebugPanelConfig {
  performance: boolean;  // Performance monitor (Press P)
  debug: boolean;        // Config panel (Press C)
  spawner: boolean;      // Entity spawner (Press E)
}
```

## Usage Examples

### Example 1: Enable All Panels (Default)

```typescript
const engine = new VectoriumBuilder()
  .withFullscreenCanvas()
  .enableDebugTools()  // All panels enabled by default
  .build();
```

### Example 2: Only Performance Monitor

```typescript
const engine = new VectoriumBuilder()
  .withFullscreenCanvas()
  .enableDebugTools(true, { 
    performance: true,
    debug: false,
    spawner: false 
  })
  .build();
```

### Example 3: Performance + Spawner (No Config Panel)

```typescript
const engine = new VectoriumBuilder()
  .withFullscreenCanvas()
  .enableDebugTools()
  .withDebugPanels({ 
    performance: true,
    spawner: true,
    debug: false 
  })
  .build();
```

### Example 4: Production Mode with Just Performance Monitor

```typescript
const engine = new VectoriumBuilder()
  .withFullscreenCanvas()
  .withQuality('high')
  .enableDebugTools(true, { performance: true })  // Only FPS counter
  .build();
```

### Example 5: Development Mode (All Tools)

```typescript
const engine = new VectoriumBuilder()
  .withFullscreenCanvas()
  .enableDebugTools()     // All panels
  .enableDebugMode()      // Console logging
  .withExposeGlobals()    // window.vectorium access
  .build();
```

## Default Panel Behavior

When `enableDebugTools()` is called without panel configuration:
- **All panels enabled** by default
- Uses `FeatureDetector.getDefaultDebugPanels()`

```typescript
getDefaultDebugPanels(): DebugPanelConfig {
  return {
    performance: true,
    debug: true,
    spawner: true
  };
}
```

## Panel Descriptions

### Performance Monitor (Press P)
- FPS counter and frame time
- Memory usage
- Draw call statistics
- GPU metrics
- Entity counts
- Physics profiling

**Use Case:** Always show in development, optionally in production for monitoring

### Debug Panel (Press C)
- Runtime configuration controls
- Resolution settings
- Batch size adjustment
- Physics parameters
- Quality presets
- Animation controls

**Use Case:** Development and QA testing only

### Entity Spawner (Press E)
- Quick entity spawning UI
- Shape/sprite type selection
- Batch spawning tools
- Benchmark utilities

**Use Case:** Development and performance testing

## Console API

All panels can be controlled via console:

```javascript
// Show specific panel
window.vectoriumPanels.show('performance')
window.vectoriumPanels.show('debug')
window.vectoriumPanels.show('spawner')

// Hide specific panel
window.vectoriumPanels.hide('performance')

// List all registered panels
window.vectoriumPanels.list()

// Toggle panel visibility
window.vectoriumPanels.toggle('performance')

// Show/hide all panels
window.vectoriumPanels.showAll()
window.vectoriumPanels.hideAll()
```

## Keyboard Shortcuts

Each panel has a keyboard shortcut (works when panel is registered):

- **P** - Toggle Performance Monitor
- **C** - Toggle Config/Debug Panel
- **E** - Toggle Entity Spawner
- **Space** - Pause/Resume engine

## Advanced Configuration

### Custom Panel Visibility

You can programmatically control panels after engine creation:

```typescript
const engine = new VectoriumBuilder()
  .enableDebugTools()
  .build();

// Later in code
engine.panelManager.hide('spawner');  // Hide spawner dynamically
engine.panelManager.show('performance');  // Show performance panel
```

### Storage Persistence

Panel visibility is saved to localStorage:
- `vectorium-performance-visible`
- `vectorium-debug-panel-visible`
- `vectorium-entity-spawner-visible`

Panels remember their state across page reloads.

## Migration from Old System

### Before (All-or-Nothing)

```typescript
// Old: Either all panels or none
.enableDebugTools()  // All 3 panels
// OR
// No debug tools at all
```

### After (Granular Control)

```typescript
// New: Choose which panels you want
.enableDebugTools(true, { 
  performance: true,  // ✅ Keep
  debug: false,       // ❌ Remove
  spawner: false      // ❌ Remove
})
```

## Configuration Architecture

### Separation of Concerns

1. **ENGINE_CONFIG** (`config/EngineConfig.ts`)
   - Static capacity constants only
   - `maxEntities`, `instancedBatchSize`, `maxBatchSize`
   - Used for memory allocation

2. **EngineConfig Interface** (`FeatureDetector.ts`)
   - Full engine configuration
   - All settings including debug panels
   - Runtime behavior control

3. **RuntimeConfig** (`RuntimeConfig.ts`)
   - Live adjustable settings
   - Quality, physics, rendering
   - Observable changes

## Best Practices

### Development
```typescript
.enableDebugTools()  // All panels
.enableDebugMode()   // Console logging
```

### QA Testing
```typescript
.enableDebugTools(true, { 
  performance: true,
  debug: true,
  spawner: false  // Don't need spawner for QA
})
```

### Production with Monitoring
```typescript
.enableDebugTools(true, { 
  performance: true,  // Keep FPS counter
  debug: false,       // No config access
  spawner: false      // No spawner
})
```

### Production Release
```typescript
// No debug tools at all
.withQuality('high')
```

## Summary

The new system provides:
- ✅ **Granular control** - Choose specific panels
- ✅ **Cleaner config** - Single source of truth
- ✅ **Better defaults** - Sensible fallbacks
- ✅ **Console API** - Runtime panel management
- ✅ **Type safety** - Full TypeScript support
- ✅ **Persistence** - LocalStorage state saving
