/**
 * Vectorium Engine - WebGL Batch Renderer
 * High-performance WebGL rendering with automatic batching
 */

import type { PerformanceMonitor } from '../performance/PerformanceMonitor';

export interface Sprite {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  texture: WebGLTexture | null;
  color: { r: number; g: number; b: number };
}

export class WebGLBatchRenderer {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private currentTexture: WebGLTexture | null = null;
  private batchVertices: Float32Array;
  private batchVerticesU8: Uint8Array;  // Uint8 view for byte-level color writes
  private batchVerticesU32: Uint32Array;  // Uint32 view for packed color writes
  private batchIndices: Uint16Array | Uint32Array;
  private indexType: number;  // GL_UNSIGNED_SHORT or GL_UNSIGNED_INT
  private vertexCount = 0;
  private maxBatchSize = 65000; // 65k quads maximum (Uint16 limit)
  private drawCallCount = 0;
  
  // Cached uniform location (avoid getUniformLocation calls in hot path)
  private u_projection: WebGLUniformLocation | null = null;
  
  // Performance test toggle
  private useUint16 = false;  // Set to true to test Uint16 performance (16k limit)
  
  // Optimization warnings
  private enableWarnings = true;
  private warnedAbout = new Set<string>();
  
  // Pre-calculated rotation cache (cos/sin for 0-359 degrees)
  private cosCache: Float32Array = new Float32Array(360);
  private sinCache: Float32Array = new Float32Array(360);
  
  
  // Performance monitoring
  private perfMonitor: PerformanceMonitor | null = null;
  
  // Clear color (RGBA 0-1)
  private clearColor: [number, number, number, number] = [0, 0, 0, 1];
  
  // Pre-allocated buffers (zero allocation during rendering)

  constructor(canvas: HTMLCanvasElement, useWebGL2: boolean = true) {
    const gl = useWebGL2 
      ? canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false })
      : canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl as WebGLRenderingContext;
    
    // Toggle: Use Uint16 (faster, 16k limit) or Uint32 (slower, unlimited)
    const useUint32Indices = useWebGL2 && !this.useUint16;
    this.indexType = useUint32Indices ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    
    // If using Uint16, limit batch size to 16k
    if (!useUint32Indices && this.maxBatchSize > 16383) {
      console.warn(`⚠️ Uint16 indices limit batch to 16383 quads (was ${this.maxBatchSize})`);
      this.maxBatchSize = 16383;
    }
    
    // Optimized format: 12 bytes per vertex (pos 8 + color 4, no padding)
    const bytesPerVertex = 12;
    const arrayBuffer = new ArrayBuffer(this.maxBatchSize * 4 * bytesPerVertex);
    this.batchVertices = new Float32Array(arrayBuffer);
    this.batchVerticesU32 = new Uint32Array(arrayBuffer);
    this.batchVerticesU8 = new Uint8Array(arrayBuffer);
    
    // Use Uint32 or Uint16 based on toggle
    this.batchIndices = useUint32Indices 
      ? new Uint32Array(this.maxBatchSize * 6)
      : new Uint16Array(this.maxBatchSize * 6);
    
    console.log(`🎯 Renderer using ${useUint32Indices ? 'Uint32' : 'Uint16'} indices, batch size: ${this.maxBatchSize}`);
    
    // Pre-fill indices (never changes)
    for (let i = 0; i < this.maxBatchSize; i++) {
      const offset = i * 6;
      const vertexOffset = i * 4;
      this.batchIndices[offset] = vertexOffset;
      this.batchIndices[offset + 1] = vertexOffset + 1;
      this.batchIndices[offset + 2] = vertexOffset + 2;
      this.batchIndices[offset + 3] = vertexOffset;
      this.batchIndices[offset + 4] = vertexOffset + 2;
      this.batchIndices[offset + 5] = vertexOffset + 3;
    }
    
    // Initialize rotation cache for optimal performance
    this.initializeRotationCache();
    
    this.initialize();
  }

  setPerformanceMonitor(monitor: PerformanceMonitor | null): void {
    this.perfMonitor = monitor;
    if (monitor) {
      monitor.setMaxBatchSize(this.maxBatchSize);
    }
  }

  /**
   * Pre-calculate cos/sin for all integer degrees (0-359)
   * Eliminates expensive Math.cos/sin calls during rendering
   */
  private initializeRotationCache(): void {
    for (let deg = 0; deg < 360; deg++) {
      const rad = (deg * Math.PI) / 180;
      this.cosCache[deg] = Math.cos(rad);
      this.sinCache[deg] = Math.sin(rad);
    }
  }

  private initialize(): void {
    const gl = this.gl;
    
    // Vertex shader (optimized for color-only rendering)
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      
      uniform mat4 u_projection;
      
      varying vec4 v_color;
      
      void main() {
        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
        v_color = a_color;
      }
    `;
    
    // Fragment shader (optimized for color-only rendering)
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;
    
    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    // Create program
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Shader program failed to link');
    }
    
    // Create buffers
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    
    // Setup buffers (use STREAM_DRAW for better performance with frequently updated data)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.batchVertices.byteLength, gl.STREAM_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.batchIndices, gl.STATIC_DRAW);
    
    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Cache projection uniform location
    this.u_projection = gl.getUniformLocation(this.program, 'u_projection');
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }
    
    return shader;
  }

  begin(width: number, height: number): void {
    const gl = this.gl;
    
    gl.viewport(0, 0, width, height);
    gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Setup projection matrix (orthographic)
    const projectionMatrix = new Float32Array([
      2 / width, 0, 0, 0,
      0, -2 / height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    
    gl.uniformMatrix4fv(this.u_projection, false, projectionMatrix);
    
    // Setup attributes
    const positionLoc = gl.getAttribLocation(this.program!, 'a_position');
    const colorLoc = gl.getAttribLocation(this.program!, 'a_color');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    const stride = 12; // pos(8) + color(4)
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, stride, 8);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    this.vertexCount = 0;
    this.drawCallCount = 0;
    this.currentTexture = null;
  }

  drawSprite(sprite: Sprite): void {
    // Flush if texture changes or batch is full
    if ((sprite.texture && sprite.texture !== this.currentTexture) || 
        this.vertexCount >= this.maxBatchSize * 4 - 4) {
      this.flush();
      this.currentTexture = sprite.texture;
      
      // OPTIMIZATION WARNING: Check for texture switching
      if (this.enableWarnings && sprite.texture && sprite.texture !== this.currentTexture) {
        if (!this.warnedAbout.has('texture_switch')) {
          console.warn('⚠️ VECTORIUM OPTIMIZATION: Texture switching detected. Batch sprites by texture to minimize draw calls.');
          this.warnedAbout.add('texture_switch');
        }
      }
    }
    
    const { x, y, width, height, rotation, scaleX, scaleY, alpha, color } = sprite;
    
    // OPTIMIZATION: Use pre-calculated rotation cache for instant lookups
    let cos: number, sin: number;
    
    if (rotation === 0) {
      // Fast path: no rotation
      cos = 1;
      sin = 0;
    } else {
      // Convert radians to degrees and normalize to 0-359
      const degrees = Math.round((rotation * 180 / Math.PI) % 360);
      const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
      
      // Check if we can use the cache (integer degrees only)
      if (Number.isInteger(normalizedDegrees) && normalizedDegrees >= 0 && normalizedDegrees < 360) {
        // Use cached values - zero Math.cos/sin overhead!
        cos = this.cosCache[normalizedDegrees];
        sin = this.sinCache[normalizedDegrees];
      } else {
        // Fallback for non-integer degrees (should be rare)
        cos = Math.cos(rotation);
        sin = Math.sin(rotation);
        
        // OPTIMIZATION WARNING: Non-cached rotation
        if (this.enableWarnings && !this.warnedAbout.has('rotation_non_cached')) {
          console.warn('⚠️ VECTORIUM OPTIMIZATION: Non-integer degree rotation detected. For best performance, use integer degree rotations (0-359°).');
          this.warnedAbout.add('rotation_non_cached');
        }
      }
    }
    
    const w = width * scaleX;
    const h = height * scaleY;
    
    const hw = w * 0.5;
    const hh = h * 0.5;
    
    const hwCos = hw * cos;
    const hwSin = hw * sin;
    const hhCos = hh * cos;
    const hhSin = hh * sin;
    
    const c0x = -hwCos + hhSin + x;
    const c0y = -hwSin - hhCos + y;
    const c1x = hwCos + hhSin + x;
    const c1y = hwSin - hhCos + y;
    const c2x = hwCos - hhSin + x;
    const c2y = hwSin + hhCos + y;
    const c3x = -hwCos - hhSin + x;
    const c3y = -hwSin + hhCos + y;
    
    // Use bitwise OR for fast int conversion
    const r = color.r | 0;
    const g = color.g | 0;
    const b = color.b | 0;
    const a = (alpha * 255) | 0;
    
    // 24-byte vertex format: 6 floats (pos(2) + uv(2) + padding(2))
    let offset = this.vertexCount * 6;
    const baseByteOffset = this.vertexCount * 24;
    
    // Vertex 0
    this.batchVertices[offset++] = c0x;
    this.batchVertices[offset++] = c0y;
    this.batchVertices[offset++] = 0;
    this.batchVertices[offset++] = 0;
    offset += 2; // Skip padding
    this.vertexCount++;
    
    // Vertex 1
    this.batchVertices[offset++] = c1x;
    this.batchVertices[offset++] = c1y;
    this.batchVertices[offset++] = 1;
    this.batchVertices[offset++] = 0;
    offset += 2;
    this.vertexCount++;
    
    // Vertex 2
    this.batchVertices[offset++] = c2x;
    this.batchVertices[offset++] = c2y;
    this.batchVertices[offset++] = 1;
    this.batchVertices[offset++] = 1;
    offset += 2;
    this.vertexCount++;
    
    // Vertex 3
    this.batchVertices[offset++] = c3x;
    this.batchVertices[offset++] = c3y;
    this.batchVertices[offset++] = 0;
    this.batchVertices[offset++] = 1;
    offset += 2;
    this.vertexCount++;
    
    // Write colors as packed bytes
    this.batchVerticesU8[baseByteOffset + 16] = r;
    this.batchVerticesU8[baseByteOffset + 17] = g;
    this.batchVerticesU8[baseByteOffset + 18] = b;
    this.batchVerticesU8[baseByteOffset + 19] = a;
    
    this.batchVerticesU8[baseByteOffset + 24 + 16] = r;
    this.batchVerticesU8[baseByteOffset + 24 + 17] = g;
    this.batchVerticesU8[baseByteOffset + 24 + 18] = b;
    this.batchVerticesU8[baseByteOffset + 24 + 19] = a;
    
    this.batchVerticesU8[baseByteOffset + 48 + 16] = r;
    this.batchVerticesU8[baseByteOffset + 48 + 17] = g;
    this.batchVerticesU8[baseByteOffset + 48 + 18] = b;
    this.batchVerticesU8[baseByteOffset + 48 + 19] = a;
    
    this.batchVerticesU8[baseByteOffset + 72 + 16] = r;
    this.batchVerticesU8[baseByteOffset + 72 + 17] = g;
    this.batchVerticesU8[baseByteOffset + 72 + 18] = b;
    this.batchVerticesU8[baseByteOffset + 72 + 19] = a;
  }

  drawRect(x: number, y: number, width: number, height: number, color: { r: number; g: number; b: number }, alpha: number = 1): void {
    this.drawSprite({
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      alpha,
      texture: null,
      color
    });
  }

  flush(): void {
    if (this.vertexCount === 0) return;
    
    const gl = this.gl;
    
    // Upload vertex data (3 floats per vertex = 12 bytes)
    const vertexDataSize = this.vertexCount * 3 * 4;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.batchVertices.subarray(0, this.vertexCount * 3));
    
    // Record buffer upload for performance monitoring
    if (this.perfMonitor) {
      this.perfMonitor.recordBufferUpload(vertexDataSize);
      this.perfMonitor.recordVertices(this.vertexCount);
      this.perfMonitor.recordStateChange();
    }
    
    // Calculate index count (bit shift is faster than division: x/4 = x>>2, then *6)
    const indexCount = (this.vertexCount >> 2) * 6;
    gl.drawElements(gl.TRIANGLES, indexCount, this.indexType, 0);
    
    // Record rendering metrics
    if (this.perfMonitor) {
      this.perfMonitor.recordIndices(indexCount);
      this.perfMonitor.recordBatch(this.vertexCount >> 2);
    }
    
    this.drawCallCount++;
    this.vertexCount = 0;
  }

  end(): void {
    this.flush();
  }

  getDrawCallCount(): number {
    return this.drawCallCount;
  }
  
  setWarningsEnabled(enabled: boolean): void {
    this.enableWarnings = enabled;
  }
  
  /**
   * Set batch size for performance tuning
   * @param size Batch size (max 65535 for Uint16Array indices)
   * Common values: 16000, 32000, 48000, 65000
   * Smaller = more draw calls but better GPU pipelining
   * Larger = fewer draw calls but more stalling
   */
  setBatchSize(size: number): void {
    const clampedSize = Math.min(65535, Math.max(1000, Math.floor(size)));
    if (clampedSize !== this.maxBatchSize) {
      console.log(`🔧 Batch size changed: ${this.maxBatchSize} → ${clampedSize}`);
      this.maxBatchSize = clampedSize;
      // Note: Buffer reallocation would be needed for smaller sizes
      // Current implementation allows reducing size without realloc
    }
  }
  
  setClearColor(r: number, g: number, b: number, a: number = 1): void {
    this.clearColor = [r, g, b, a];
  }
  
  getBatchSize(): number {
    return this.maxBatchSize;
  }
  
  clearWarnings(): void {
    this.warnedAbout.clear();
  }
  
  getOptimizationReport(): { warnings: string[]; drawCalls: number; batchEfficiency: number } {
    return {
      warnings: Array.from(this.warnedAbout),
      drawCalls: this.drawCallCount,
      batchEfficiency: this.vertexCount > 0 ? (this.vertexCount / 4) / this.drawCallCount : 0
    };
  }

  /**
   * CRITICAL OPTIMIZATION: Bulk render from ECS arrays
   * Eliminates 100k+ function calls by processing arrays directly
   * This is 10-20x faster than calling drawSprite() for each entity
   * 
   * 🔥 OPTIMIZED: Hoisted constants and reduced calculations per sprite
   */
  drawBulk(
    posX: Float32Array,
    posY: Float32Array,
    rotation: Uint16Array,
    sizes: Float32Array,
    colorR: Uint8Array,
    colorG: Uint8Array,
    colorB: Uint8Array,
    alphas: Float32Array,
    flags: Uint32Array,
    count: number,
    FLAG_VISIBLE: number,
    cameraX: number = 0,
    cameraY: number = 0,
    cameraZoom: number = 1
  ): void {
    const HALF = 0.5;  // Hoist constant
    
    for (let start = 0; start < count; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, count);
      let visibleCount = 0;  // Track actual visible entities
      
      for (let i = start; i < end; i++) {
        if ((flags[i] & FLAG_VISIBLE) === 0) continue;
        
        const x = posX[i];
        const y = posY[i];
        const hw = sizes[i] * HALF;
        const rotDeg = rotation[i];
        
        // Lookup rotation from cache
        const cos = this.cosCache[rotDeg];
        const sin = this.sinCache[rotDeg];
        const hwCos = hw * cos;
        const hwSin = hw * sin;
        
        // Color bytes
        const rByte = colorR[i];
        const gByte = colorG[i];
        const bByte = colorB[i];
        const aByte = (alphas[i] * 255) | 0;
        
        // Calculate offsets (12 bytes per vertex = 3 floats)
        const floatOffset = (this.vertexCount + visibleCount * 4) * 3;
        visibleCount++;
        
        // Apply camera transformation: camera is CENTER of viewport
        // (world - camera) * zoom + viewport_center
        const screenX = (x - cameraX) * cameraZoom + this.gl.canvas.width / 2;
        const screenY = (y - cameraY) * cameraZoom + this.gl.canvas.height / 2;
        const screenHw = hw * cameraZoom;
        const screenHwCos = screenHw * cos;
        const screenHwSin = screenHw * sin;
        
        // Write vertex positions directly with inline math
        // Vertex 0 (floats at 0, 1)
        this.batchVertices[floatOffset] = screenX - screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 1] = screenY - screenHwSin - screenHwCos;
        
        // Vertex 1 (floats at 3, 4)
        this.batchVertices[floatOffset + 3] = screenX + screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 4] = screenY + screenHwSin - screenHwCos;
        
        // Vertex 2 (floats at 6, 7)
        this.batchVertices[floatOffset + 6] = screenX + screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 7] = screenY + screenHwSin + screenHwCos;
        
        // Vertex 3 (floats at 9, 10)
        this.batchVertices[floatOffset + 9] = screenX - screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 10] = screenY - screenHwSin + screenHwCos;
        
        // Pack color as single 32-bit RGBA (at float offset 2, 5, 8, 11)
        const packedColor = aByte << 24 | bByte << 16 | gByte << 8 | rByte;
        this.batchVerticesU32[floatOffset + 2] = packedColor;
        this.batchVerticesU32[floatOffset + 5] = packedColor;
        this.batchVerticesU32[floatOffset + 8] = packedColor;
        this.batchVerticesU32[floatOffset + 11] = packedColor;
      }
      
      this.vertexCount += visibleCount * 4;  // Use actual visible count, not chunk size
      this.flush();
    }
  }

  /**
   * 🚀 ULTRA-OPTIMIZED: Draw from indexed arrays (zero copy!)
   * Renders only visible entities directly from source arrays using indices
   * Eliminates the expensive copy loop in frustum culling
   */
  drawBulkIndexed(
    posX: Float32Array,
    posY: Float32Array,
    rotation: Uint16Array,
    sizes: Float32Array,
    colorR: Uint8Array,
    colorG: Uint8Array,
    colorB: Uint8Array,
    alphas: Float32Array,
    flags: Uint32Array,
    indices: Uint32Array,
    indexCount: number,
    FLAG_VISIBLE: number,
    cameraX: number = 0,
    cameraY: number = 0,
    cameraZoom: number = 1
  ): void {
    const HALF = 0.5;
    
    for (let start = 0; start < indexCount; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, indexCount);
      let visibleCount = 0;
      
      for (let i = start; i < end; i++) {
        const idx = indices[i];
        if ((flags[idx] & FLAG_VISIBLE) === 0) continue;
        
        const x = posX[idx];
        const y = posY[idx];
        const hw = sizes[idx] * HALF;
        const rotDeg = rotation[idx];
        
        // Lookup rotation from cache
        const cos = this.cosCache[rotDeg];
        const sin = this.sinCache[rotDeg];
        const hwCos = hw * cos;
        const hwSin = hw * sin;
        
        // Color bytes
        const rByte = colorR[idx];
        const gByte = colorG[idx];
        const bByte = colorB[idx];
        const aByte = (alphas[idx] * 255) | 0;
        
        // Calculate offsets (12 bytes per vertex = 3 floats)
        const floatOffset = (this.vertexCount + visibleCount * 4) * 3;
        visibleCount++;
        
        // Apply camera transformation: camera is CENTER of viewport
        // (world - camera) * zoom + viewport_center
        const screenX = (x - cameraX) * cameraZoom + this.gl.canvas.width / 2;
        const screenY = (y - cameraY) * cameraZoom + this.gl.canvas.height / 2;
        const screenHw = hw * cameraZoom;
        const screenHwCos = screenHw * cos;
        const screenHwSin = screenHw * sin;
        
        // Write vertex positions directly with inline math
        // Vertex 0 (floats at 0, 1)
        this.batchVertices[floatOffset] = screenX - screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 1] = screenY - screenHwSin - screenHwCos;
        
        // Vertex 1 (floats at 3, 4)
        this.batchVertices[floatOffset + 3] = screenX + screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 4] = screenY + screenHwSin - screenHwCos;
        
        // Vertex 2 (floats at 6, 7)
        this.batchVertices[floatOffset + 6] = screenX + screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 7] = screenY + screenHwSin + screenHwCos;
        
        // Vertex 3 (floats at 9, 10)
        this.batchVertices[floatOffset + 9] = screenX - screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 10] = screenY - screenHwSin + screenHwCos;
        
        // Pack color as single 32-bit RGBA (at float offset 2, 5, 8, 11)
        const packedColor = aByte << 24 | bByte << 16 | gByte << 8 | rByte;
        this.batchVerticesU32[floatOffset + 2] = packedColor;
        this.batchVerticesU32[floatOffset + 5] = packedColor;
        this.batchVerticesU32[floatOffset + 8] = packedColor;
        this.batchVerticesU32[floatOffset + 11] = packedColor;
      }
      
      this.vertexCount += visibleCount * 4;
      this.flush();
    }
  }

  createTexture(image: ImageBitmap | HTMLImageElement): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return texture;
  }

  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }

  getContext(): WebGLRenderingContext | WebGL2RenderingContext {
    return this.gl;
  }

  destroy(): void {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  }
}
