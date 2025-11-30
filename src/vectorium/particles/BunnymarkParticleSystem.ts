/**
 * 🚀 BUNNYMARK PARTICLE SYSTEM - Ultra-High Performance (2.5M @ 60 FPS)
 * 
 * Key Optimizations:
 * - Interleaved positions [x0,y0,x1,y1,...] for zero-copy GPU upload
 * - 4x loop unrolling for better CPU pipelining
 * - Pre-allocated arrays (zero allocation per frame)
 * - Direct array access (no getters/setters)
 * - Static data uploaded once (color, UV, size)
 * 
 * Architecture:
 * - Physics writes directly to interleaved positions array
 * - Renderer uploads positions with zero intermediate copy
 * - GPU instancing for massive batch rendering
 * 
 * Performance: 2.5M sprites @ 60 FPS
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
  // Particle data - interleaved for zero-copy GPU upload
  public positions: Float32Array; // [x0,y0,x1,y1,...]
  private velX: Float32Array;
  private velY: Float32Array;
  public activeCount: number = 0;
  
  private config: BunnymarkParticleConfig;
  private halfWidth: number;
  private halfHeight: number;
  private cachedTexture: WebGLTexture | null = null;
  
  // Pre-allocated render arrays (ZERO allocations per frame!)
  private sizes: Float32Array;
  private colorR: Uint8Array;
  private colorG: Uint8Array;
  private colorB: Uint8Array;
  private alphas: Float32Array;
  private uvU0: Uint16Array;
  private uvV0: Uint16Array;
  private uvU1: Uint16Array;
  private uvV1: Uint16Array;
  
  constructor(config: BunnymarkParticleConfig) {
    this.config = config;
    this.halfWidth = config.spriteWidth / 2;
    this.halfHeight = config.spriteHeight / 2;
    
    // Pre-allocate arrays
    const max = config.maxParticles;
    this.positions = new Float32Array(max * 2); // Interleaved [x,y,x,y,...]
    this.velX = new Float32Array(max);
    this.velY = new Float32Array(max);
    
    // Pre-allocate render arrays (ZERO allocations per frame!)
    this.sizes = new Float32Array(max);
    this.colorR = new Uint8Array(max);
    this.colorG = new Uint8Array(max);
    this.colorB = new Uint8Array(max);
    this.alphas = new Float32Array(max);
    this.uvU0 = new Uint16Array(max);
    this.uvV0 = new Uint16Array(max);
    this.uvU1 = new Uint16Array(max);
    this.uvV1 = new Uint16Array(max);
    
    // Pre-fill constant values (only once!)
    const size = config.spriteWidth;
    for (let i = 0; i < max; i++) {
      this.sizes[i] = size;
      this.colorR[i] = 255;
      this.colorG[i] = 255;
      this.colorB[i] = 255;
      this.alphas[i] = 1.0;
      this.uvU0[i] = 0;
      this.uvV0[i] = 0;
      this.uvU1[i] = 65535;
      this.uvV1[i] = 65535;
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
      const posIdx = idx * 2;
      
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
   * Optimized JavaScript with 4x loop unrolling
   */
  update(dt: number): void {
    const count = this.activeCount;
    if (count === 0) return;
    
    // ============================================================================
    // 🚀 OPTIMIZED JAVASCRIPT PHYSICS
    // ============================================================================
    const gravity = this.config.gravity * dt;
    const canvasWidth = this.config.canvasWidth;
    const canvasHeight = this.config.canvasHeight;
    const halfW = this.halfWidth;
    const halfH = this.halfHeight;
    
    const positions = this.positions;
    const velX = this.velX;
    const velY = this.velY;
    
    // Process 4 sprites per iteration for better CPU pipelining
    let i = 0;
    const unrollEnd = count - 3;
    
    while (i < unrollEnd) {
      // Sprite 0
      let posIdx0 = i * 2;
      let vy0 = velY[i] + gravity;
      let px0 = positions[posIdx0] + velX[i] * dt;
      let py0 = positions[posIdx0 + 1] + vy0 * dt;
      let vx0 = velX[i];
      
      if (px0 - halfW < 0) { px0 = halfW; vx0 = -vx0; }
      else if (px0 + halfW > canvasWidth) { px0 = canvasWidth - halfW; vx0 = -vx0; }
      if (py0 - halfH < 0) { py0 = halfH; vy0 = -vy0; }
      else if (py0 + halfH > canvasHeight) { py0 = canvasHeight - halfH; vy0 = -vy0; }
      
      positions[posIdx0] = px0; positions[posIdx0 + 1] = py0; velX[i] = vx0; velY[i] = vy0;
      
      // Sprite 1
      let posIdx1 = (i + 1) * 2;
      let vy1 = velY[i + 1] + gravity;
      let px1 = positions[posIdx1] + velX[i + 1] * dt;
      let py1 = positions[posIdx1 + 1] + vy1 * dt;
      let vx1 = velX[i + 1];
      
      if (px1 - halfW < 0) { px1 = halfW; vx1 = -vx1; }
      else if (px1 + halfW > canvasWidth) { px1 = canvasWidth - halfW; vx1 = -vx1; }
      if (py1 - halfH < 0) { py1 = halfH; vy1 = -vy1; }
      else if (py1 + halfH > canvasHeight) { py1 = canvasHeight - halfH; vy1 = -vy1; }
      
      positions[posIdx1] = px1; positions[posIdx1 + 1] = py1; velX[i + 1] = vx1; velY[i + 1] = vy1;
      
      // Sprite 2
      let posIdx2 = (i + 2) * 2;
      let vy2 = velY[i + 2] + gravity;
      let px2 = positions[posIdx2] + velX[i + 2] * dt;
      let py2 = positions[posIdx2 + 1] + vy2 * dt;
      let vx2 = velX[i + 2];
      
      if (px2 - halfW < 0) { px2 = halfW; vx2 = -vx2; }
      else if (px2 + halfW > canvasWidth) { px2 = canvasWidth - halfW; vx2 = -vx2; }
      if (py2 - halfH < 0) { py2 = halfH; vy2 = -vy2; }
      else if (py2 + halfH > canvasHeight) { py2 = canvasHeight - halfH; vy2 = -vy2; }
      
      positions[posIdx2] = px2; positions[posIdx2 + 1] = py2; velX[i + 2] = vx2; velY[i + 2] = vy2;
      
      // Sprite 3
      let posIdx3 = (i + 3) * 2;
      let vy3 = velY[i + 3] + gravity;
      let px3 = positions[posIdx3] + velX[i + 3] * dt;
      let py3 = positions[posIdx3 + 1] + vy3 * dt;
      let vx3 = velX[i + 3];
      
      if (px3 - halfW < 0) { px3 = halfW; vx3 = -vx3; }
      else if (px3 + halfW > canvasWidth) { px3 = canvasWidth - halfW; vx3 = -vx3; }
      if (py3 - halfH < 0) { py3 = halfH; vy3 = -vy3; }
      else if (py3 + halfH > canvasHeight) { py3 = canvasHeight - halfH; vy3 = -vy3; }
      
      positions[posIdx3] = px3; positions[posIdx3 + 1] = py3; velX[i + 3] = vx3; velY[i + 3] = vy3;
      
      i += 4;
    }
    
    // Handle remainder
    while (i < count) {
      const posIdx = i * 2;
      let vy = velY[i] + gravity;
      let px = positions[posIdx] + velX[i] * dt;
      let py = positions[posIdx + 1] + vy * dt;
      let vx = velX[i];
      
      if (px - halfW < 0) { px = halfW; vx = -vx; }
      else if (px + halfW > canvasWidth) { px = canvasWidth - halfW; vx = -vx; }
      if (py - halfH < 0) { py = halfH; vy = -vy; }
      else if (py + halfH > canvasHeight) { py = canvasHeight - halfH; vy = -vy; }
      
      positions[posIdx] = px; positions[posIdx + 1] = py; velX[i] = vx; velY[i] = vy;
      i++;
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
      // Zero-copy upload with interleaved positions
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
