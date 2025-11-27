/**
 * 🚀 WASM Physics Bridge
 * Loads and interfaces with WebAssembly physics module
 * 
 * Expected Performance Gains:
 * - Gravity: 5-10x faster
 * - Collision detection: 3-5x faster  
 * - Position integration: 5-8x faster
 * - Overall: 11.4ms → 2-3ms for 150K entities
 */

export class WasmPhysicsBridge {
  private wasmModule: any = null;
  private wasmMemory: WebAssembly.Memory | null = null;
  private isLoaded = false;
  
  // Typed array views into WASM memory (shared with World.ts)
  public positionXView: Float32Array | null = null;
  public positionYView: Float32Array | null = null;
  public velocityXView: Float32Array | null = null;
  public velocityYView: Float32Array | null = null;
  public sizesView: Float32Array | null = null;
  public massView: Float32Array | null = null;
  
  /**
   * Load and initialize WASM module
   */
  async initialize(entityCount: number): Promise<boolean> {
    try {
      console.log('🚀 Loading WASM physics module...');
      
      // Fetch WASM module
      const response = await fetch('/physics.wasm');
      const buffer = await response.arrayBuffer();
      
      // Instantiate WASM module
      const result = await WebAssembly.instantiate(buffer, {
        env: {
          abort: (msg: number, file: number, line: number, column: number) => {
            console.error('WASM abort:', msg, file, line, column);
          }
        }
      });
      
      this.wasmModule = result.instance.exports;
      this.wasmMemory = this.wasmModule.memory;
      
      // Initialize physics arrays in WASM
      this.wasmModule.initPhysics(entityCount);
      
      // Create typed array views into WASM memory (ZERO-COPY shared memory)
      // These views will be shared with World.ts - NO COPYING!
      this.positionXView = new Float32Array(
        this.wasmMemory!.buffer,
        this.wasmModule.getPositionXPtr(),
        entityCount
      );
      this.positionYView = new Float32Array(
        this.wasmMemory!.buffer,
        this.wasmModule.getPositionYPtr(),
        entityCount
      );
      this.velocityXView = new Float32Array(
        this.wasmMemory!.buffer,
        this.wasmModule.getVelocityXPtr(),
        entityCount
      );
      this.velocityYView = new Float32Array(
        this.wasmMemory!.buffer,
        this.wasmModule.getVelocityYPtr(),
        entityCount
      );
      this.sizesView = new Float32Array(
        this.wasmMemory!.buffer,
        this.wasmModule.getSizesPtr(),
        entityCount
      );
      this.massView = new Float32Array(
        this.wasmMemory!.buffer,
        this.wasmModule.getMassPtr(),
        entityCount
      );
      
      this.isLoaded = true;
      console.log('✅ WASM physics module loaded successfully!');
      console.log('✅ Zero-copy shared memory enabled (World.ts ↔ WASM)');
      console.log('✅ Expected 5-10x performance improvement on physics calculations');
      
      return true;
    } catch (error) {
      console.warn('⚠️ WASM physics module failed to load, falling back to JS:', error);
      this.isLoaded = false;
      return false;
    }
  }
  
  /**
   * Check if WASM is loaded and ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }
  
  /**
   * Get the WASM memory buffer (for sharing with World.ts)
   */
  getMemoryBuffer(): ArrayBuffer | null {
    return this.wasmMemory?.buffer || null;
  }
  
  /**
   * Get the WASM module exports (for advanced use cases)
   */
  getModule(): any {
    return this.wasmModule;
  }
  
  /**
   * ✅ SINGLE-PASS PHYSICS UPDATE (WASM-FIRST ARCHITECTURE)
   * 
   * ONE call per frame instead of 7 calls!
   * Eliminates 6 JS↔WASM context switches = ~600ns saved per frame
   * 
   * **ZERO-COPY MODE**: Assumes World.ts arrays already point to WASM memory
   * NO copyToWasm() or copyFromWasm() needed!
   * 
   * Expected performance gain: 54 FPS → 75-80 FPS @ 150K entities (40-50% improvement)
   * 
   * @returns Total number of collisions detected and resolved
   */
  updatePhysicsComplete(
    count: number,
    dt: number,
    gravityY: number,
    boundsWidth: number,
    boundsHeight: number,
    airDamping: number,
    groundDamping: number,
    restitution: number,
    gravityCount: number,
    collisionCount: number
  ): number {
    if (!this.isLoaded) return 0;
    
    // 🚀 ZERO-COPY: Data is already in WASM memory (shared)
    // Just call the WASM function - no copying needed!
    return this.wasmModule.updatePhysicsComplete(
      count,
      dt,
      gravityY,
      boundsWidth,
      boundsHeight,
      airDamping,
      groundDamping,
      restitution,
      gravityCount,
      collisionCount
    );
  }
  
  /**
   * Get collision pairs buffer view (for reading collision results)
   */
  getCollisionPairsView(): Int32Array | null {
    if (!this.isLoaded) return null;
    
    const ptr = this.wasmModule.getCollisionPairsPtr();
    const maxPairs = this.wasmModule.getMaxCollisionPairs();
    return new Int32Array(this.wasmMemory!.buffer, ptr, maxPairs * 2);
  }
}
