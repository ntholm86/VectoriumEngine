/**
 * 🚀 BUNNYMARK PARTICLE SYSTEM - Ultra-High Performance Sprite Rendering
 * 
 * Optimized for massive sprite quantities (1M+) with minimal features:
 * - Sprite rendering with textures
 * - Boundary bouncing physics
 * - Gravity
 * - NO rotation, scale, collision detection, or complex features
 * 
 * Architecture:
 * - Zero allocation per frame
 * - Direct array access (no getters)
 * - GPU batch rendering
 * - Pre-allocated buffers
 * 
 * Performance target: 1,000,000+ sprites @ 60 FPS
 */

export interface BunnymarkParticleConfig {
  maxParticles: number;
  canvasWidth: number;
  canvasHeight: number;
  gravity: number; // pixels/sec²
  spriteWidth: number;
  spriteHeight: number;
  velocityRange: { min: number; max: number };
}

/**
 * Ultra-optimized particle system for bunnymark
 * Renders sprites with textures, handles physics and bouncing
 */
export class BunnymarkParticleSystem {
  // Particle data (interleaved positions for zero-copy upload)
  public positions: Float32Array; // [x0, y0, x1, y1, x2, y2, ...]
  public velX: Float32Array;
  public velY: Float32Array;
  public activeCount: number = 0;
  
  private config: BunnymarkParticleConfig;
  private halfWidth: number;
  private halfHeight: number;
  private cachedTexture: WebGLTexture | null = null;
  
  // Pre-allocated render arrays (ZERO allocations per frame!)
  private rotation: Uint16Array;
  private sizes: Float32Array;
  private colorR: Uint8Array;
  private colorG: Uint8Array;
  private colorB: Uint8Array;
  private alphas: Float32Array;
  private uvU0: Uint16Array;
  private uvV0: Uint16Array;
  private uvU1: Uint16Array;
  private uvV1: Uint16Array;
  private flags: Uint32Array;
  private indices: Uint32Array;
  
  constructor(config: BunnymarkParticleConfig) {
    this.config = config;
    this.halfWidth = config.spriteWidth / 2;
    this.halfHeight = config.spriteHeight / 2;
    
    // Pre-allocate arrays (zero allocation during runtime)
    const max = config.maxParticles;
    this.positions = new Float32Array(max * 2); // Interleaved: [x0, y0, x1, y1, ...]
    this.velX = new Float32Array(max);
    this.velY = new Float32Array(max);
    
    // Pre-allocate render arrays (ZERO allocations per frame!)
    this.rotation = new Uint16Array(max);
    this.sizes = new Float32Array(max);
    this.colorR = new Uint8Array(max);
    this.colorG = new Uint8Array(max);
    this.colorB = new Uint8Array(max);
    this.alphas = new Float32Array(max);
    this.uvU0 = new Uint16Array(max);
    this.uvV0 = new Uint16Array(max);
    this.uvU1 = new Uint16Array(max);
    this.uvV1 = new Uint16Array(max);
    this.flags = new Uint32Array(max);
    this.indices = new Uint32Array(max);
    
    // Pre-fill constant values (only once!)
    const size = config.spriteWidth;
    for (let i = 0; i < max; i++) {
      this.rotation[i] = 0;
      this.sizes[i] = size;
      this.colorR[i] = 255;
      this.colorG[i] = 255;
      this.colorB[i] = 255;
      this.alphas[i] = 1.0;
      this.uvU0[i] = 0;
      this.uvV0[i] = 0;
      this.uvU1[i] = 65535;
      this.uvV1[i] = 65535;
      this.flags[i] = 1; // FLAG_VISIBLE
      this.indices[i] = i;
    }
  }
  
  /**
   * Spawn particles in a burst
   */
  burst(count: number, centerX: number, centerY: number): void {
    const toSpawn = Math.min(count, this.config.maxParticles - this.activeCount);
    const { min, max } = this.config.velocityRange;
    const range = max - min;
    
    for (let i = 0; i < toSpawn; i++) {
      const idx = this.activeCount++;
      const posIdx = idx * 2; // Interleaved positions index
      
      // Random position in circle distribution
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 200;
      this.positions[posIdx] = centerX + Math.cos(angle) * radius;
      this.positions[posIdx + 1] = centerY + Math.sin(angle) * radius;
      
      // Random velocity
      const vAngle = Math.random() * Math.PI * 2;
      const vSpeed = min + Math.random() * range;
      this.velX[idx] = Math.cos(vAngle) * vSpeed;
      this.velY[idx] = Math.sin(vAngle) * vSpeed;
    }
  }
  
  /**
   * Update physics and boundary bouncing
   * ZERO allocations, pure array operations with 4x loop unrolling
   */
  update(dt: number): void {
    const gravity = this.config.gravity * dt;
    const canvasWidth = this.config.canvasWidth;
    const canvasHeight = this.config.canvasHeight;
    const halfW = this.halfWidth;
    const halfH = this.halfHeight;
    
    const pos = this.positions;
    const velX = this.velX;
    const velY = this.velY;
    const count = this.activeCount;
    
    // Process 4 sprites per iteration for better CPU pipelining
    let i = 0;
    let j = 0; // Index into positions array (2 per sprite)
    const unrollEnd = count - 3;
    
    while (i < unrollEnd) {
      // Sprite 0 - process inline
      let vy0 = velY[i] + gravity;
      let px0 = pos[j] + velX[i] * dt;
      let py0 = pos[j + 1] + vy0 * dt;
      let vx0 = velX[i];
      
      if (px0 - halfW < 0) { px0 = halfW; vx0 = -vx0; }
      else if (px0 + halfW > canvasWidth) { px0 = canvasWidth - halfW; vx0 = -vx0; }
      if (py0 - halfH < 0) { py0 = halfH; vy0 = -vy0; }
      else if (py0 + halfH > canvasHeight) { py0 = canvasHeight - halfH; vy0 = -vy0; }
      
      pos[j] = px0; pos[j + 1] = py0; velX[i] = vx0; velY[i] = vy0;
      
      // Sprite 1 - process inline
      let vy1 = velY[i + 1] + gravity;
      let px1 = pos[j + 2] + velX[i + 1] * dt;
      let py1 = pos[j + 3] + vy1 * dt;
      let vx1 = velX[i + 1];
      
      if (px1 - halfW < 0) { px1 = halfW; vx1 = -vx1; }
      else if (px1 + halfW > canvasWidth) { px1 = canvasWidth - halfW; vx1 = -vx1; }
      if (py1 - halfH < 0) { py1 = halfH; vy1 = -vy1; }
      else if (py1 + halfH > canvasHeight) { py1 = canvasHeight - halfH; vy1 = -vy1; }
      
      pos[j + 2] = px1; pos[j + 3] = py1; velX[i + 1] = vx1; velY[i + 1] = vy1;
      
      // Sprite 2 - process inline
      let vy2 = velY[i + 2] + gravity;
      let px2 = pos[j + 4] + velX[i + 2] * dt;
      let py2 = pos[j + 5] + vy2 * dt;
      let vx2 = velX[i + 2];
      
      if (px2 - halfW < 0) { px2 = halfW; vx2 = -vx2; }
      else if (px2 + halfW > canvasWidth) { px2 = canvasWidth - halfW; vx2 = -vx2; }
      if (py2 - halfH < 0) { py2 = halfH; vy2 = -vy2; }
      else if (py2 + halfH > canvasHeight) { py2 = canvasHeight - halfH; vy2 = -vy2; }
      
      pos[j + 4] = px2; pos[j + 5] = py2; velX[i + 2] = vx2; velY[i + 2] = vy2;
      
      // Sprite 3 - process inline
      let vy3 = velY[i + 3] + gravity;
      let px3 = pos[j + 6] + velX[i + 3] * dt;
      let py3 = pos[j + 7] + vy3 * dt;
      let vx3 = velX[i + 3];
      
      if (px3 - halfW < 0) { px3 = halfW; vx3 = -vx3; }
      else if (px3 + halfW > canvasWidth) { px3 = canvasWidth - halfW; vx3 = -vx3; }
      if (py3 - halfH < 0) { py3 = halfH; vy3 = -vy3; }
      else if (py3 + halfH > canvasHeight) { py3 = canvasHeight - halfH; vy3 = -vy3; }
      
      pos[j + 6] = px3; pos[j + 7] = py3; velX[i + 3] = vx3; velY[i + 3] = vy3;
      
      i += 4;
      j += 8; // 4 sprites * 2 floats each
    }
    
    // Handle remainder
    while (i < count) {
      let vy = velY[i] + gravity;
      let px = pos[j] + velX[i] * dt;
      let py = pos[j + 1] + vy * dt;
      let vx = velX[i];
      
      if (px - halfW < 0) { px = halfW; vx = -vx; }
      else if (px + halfW > canvasWidth) { px = canvasWidth - halfW; vx = -vx; }
      if (py - halfH < 0) { py = halfH; vy = -vy; }
      else if (py + halfH > canvasHeight) { py = canvasHeight - halfH; vy = -vy; }
      
      pos[j] = px; pos[j + 1] = py; velX[i] = vx; velY[i] = vy;
      i++;
      j += 2;
    }
  }
  
  /**
   * Render sprites using WebGL instanced rendering (1M+ sprites!)
   */
  render(renderer: any, textureManager: any, _cameraX: number = 0, _cameraY: number = 0, _cameraZoom: number = 1): void {
    const count = this.activeCount;
    if (count === 0) return;
    
    // Get and cache the bunny texture (extract glTexture from Texture object)
    if (!this.cachedTexture && textureManager) {
      const texture = textureManager.getTexture('/bunny.png');
      if (texture) {
        this.cachedTexture = texture.glTexture;
      }
    }
    
    // Use instanced rendering for massive sprite counts
    if (typeof renderer.drawInstancedSprites === 'function' && this.cachedTexture) {
      renderer.drawInstancedSprites(
        this.positions,
        this.sizes,
        this.colorR,
        this.colorG,
        this.colorB,
        this.alphas,
        this.uvU0,
        this.uvV0,
        this.uvU1,
        this.uvV1,
        count,
        this.cachedTexture,
        this.config.canvasWidth,
        this.config.canvasHeight
      );
    } else {
      console.warn('Instanced sprite rendering not available');
    }
  }
  
  /**
   * Clear all particles
   */
  clear(): void {
    this.activeCount = 0;
  }
  
  /**
   * Get current particle count
   */
  getActiveCount(): number {
    return this.activeCount;
  }
}
