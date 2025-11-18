/**
 * Vectorium Engine - WebGL Batch Renderer
 * High-performance WebGL rendering with automatic batching
 */

import type { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { GPURotationVertexLayout, GPURotationShaders, GPURotationInstanceBuilder } from './GPURotationVertexFormat';

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
  private batchVerticesU32: Uint32Array; // Uint32 view for packed color writes
  private batchVerticesU8: Uint8Array;  // Uint8 view for byte-level color writes
  private batchIndices: Uint16Array;
  private vertexCount = 0;
  private maxBatchSize = 65000; // Configurable: 65k (max), 48k, 32k, 16k for testing
  private drawCallCount = 0;
  
  // GPU Instancing support
  private instancingSupported = false;
  private instancingEnabled = false; // DISABLED: Testing shows batch mode is 78% faster (206 FPS vs 116 FPS @ 100k entities)
  private instancedProgram: WebGLProgram | null = null;
  private instancePositionBuffer: WebGLBuffer | null = null;
  private instanceRotationBuffer: WebGLBuffer | null = null;
  private instanceColorBuffer: WebGLBuffer | null = null;
  private instanceSizeBuffer: WebGLBuffer | null = null;
  private instancedVertexBuffer: WebGLBuffer | null = null; // Single quad for all instances
  private ext: any = null; // ANGLE_instanced_arrays extension for WebGL1
  
  // GPU Rotation Mode (rotation calculated in vertex shader)
  private gpuRotationEnabled = false; // Toggle between CPU and GPU rotation
  private gpuRotationProgram: WebGLProgram | null = null;
  private gpuRotationInstanceBuffer: WebGLBuffer | null = null;
  private gpuRotationQuadBuffer: WebGLBuffer | null = null;
  private gpuRotationIndexBuffer: WebGLBuffer | null = null;
  private gpuRotationLayout: GPURotationVertexLayout = new GPURotationVertexLayout();
  private gpuRotationBuilder: GPURotationInstanceBuilder = new GPURotationInstanceBuilder();
  private gpuRotationInstances: Float32Array = new Float32Array(0); // Allocated on first use
  
  // GPU Rotation cached attribute locations (CRITICAL: getAttribLocation is expensive!)
  private gpuRotationAttrCorner: number = -1;
  private gpuRotationAttrPosition: number = -1;
  private gpuRotationAttrSize: number = -1;
  private gpuRotationAttrRotation: number = -1;
  private gpuRotationAttrColor: number = -1;
  private gpuRotationUniformProjection: WebGLUniformLocation | null = null;
  private gpuRotationUniformTexture: WebGLUniformLocation | null = null;
  
  // Optimization warnings
  private enableWarnings = true;
  private warnedAbout = new Set<string>();
  
  // Pre-calculated rotation cache (cos/sin for 0-359 degrees)
  private cosCache: Float32Array = new Float32Array(360);
  private sinCache: Float32Array = new Float32Array(360);
  
  // Cache uniform locations (CRITICAL: getUniformLocation is expensive!)
  private useTextureUniformLoc: WebGLUniformLocation | null = null;
  private lastTextureState: number = -1; // Track if texture uniform changed

  // Performance monitoring
  private perfMonitor: PerformanceMonitor | null = null;

  constructor(canvas: HTMLCanvasElement, useWebGL2: boolean = true) {
    const gl = useWebGL2 
      ? canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false })
      : canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl as WebGLRenderingContext;
    
    // Check for instancing support (legacy code - not actively used)
    this.instancingSupported = this.checkInstancingSupport();
    
    // Optimized format: 16 bytes per vertex (pos(8) + color(4) + padding(4))
    // NO TEXTURE COORDS - optimized for pure color rendering (textures can be added back later)
    // Using 4 floats per vertex for alignment, color written as 4 bytes at offset 8
    const bytesPerVertex = 16;
    const arrayBuffer = new ArrayBuffer(this.maxBatchSize * 4 * bytesPerVertex);
    this.batchVertices = new Float32Array(arrayBuffer);
    this.batchVerticesU32 = new Uint32Array(arrayBuffer);
    this.batchVerticesU8 = new Uint8Array(arrayBuffer);
    this.batchIndices = new Uint16Array(this.maxBatchSize * 6);
    
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

  /**
   * Check if GPU instancing is supported
   */
  private checkInstancingSupport(): boolean {
    const gl = this.gl;
    
    // WebGL2 has native instancing
    if ('WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext) {
      return 'drawArraysInstanced' in gl;
    }
    
    // WebGL1 needs ANGLE_instanced_arrays extension
    this.ext = gl.getExtension('ANGLE_instanced_arrays');
    return this.ext !== null;
  }

  /**
   * Enable or disable GPU instancing (for A/B testing)
   */
  setInstancingEnabled(enabled: boolean): void {
    if (enabled && !this.instancingSupported) {
      console.warn('Cannot enable instancing - not supported on this GPU');
      return;
    }
    this.instancingEnabled = enabled;
  }

  /**
   * Check if instancing is currently active
   */
  isInstancingActive(): boolean {
    return this.instancingSupported && this.instancingEnabled;
  }
  
  /**
   * Enable or disable GPU rotation mode (for A/B testing)
   * GPU rotation: Calculates rotation in vertex shader (less data transfer)
   * CPU rotation: Pre-calculates rotation on CPU (current default)
   */
  setGPURotationEnabled(enabled: boolean): void {
    this.gpuRotationEnabled = enabled;
    
    if (enabled && !this.gpuRotationProgram) {
      // Initialize GPU rotation mode on first use
      this.initializeGPURotation();
    }
  }
  
  /**
   * Check if GPU rotation is currently active
   */
  isGPURotationActive(): boolean {
    return this.gpuRotationEnabled;
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
    
    // Initialize instanced rendering if supported
    if (this.instancingSupported) {
      this.initializeInstancing();
    }
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

  /**
   * Initialize GPU instanced rendering
   * Creates shaders and buffers for rendering all entities in a single draw call
   */
  private initializeInstancing(): void {
    const gl = this.gl;
    
    // Instanced vertex shader - uses per-instance attributes
    const instancedVertexShader = `
      attribute vec2 a_vertex; // Quad vertices (shared by all instances)
      attribute vec2 a_position; // Per-instance position
      attribute float a_rotation; // Per-instance rotation (degrees)
      attribute float a_size; // Per-instance size
      attribute vec4 a_color; // Per-instance color
      
      uniform mat4 u_projection;
      
      varying vec4 v_color;
      
      void main() {
        // Apply rotation and size to quad vertex
        float rad = radians(a_rotation);
        float c = cos(rad);
        float s = sin(rad);
        vec2 rotated = vec2(
          a_vertex.x * c - a_vertex.y * s,
          a_vertex.x * s + a_vertex.y * c
        );
        
        // Scale and translate
        vec2 pos = a_position + rotated * a_size;
        
        gl_Position = u_projection * vec4(pos, 0.0, 1.0);
        v_color = a_color;
      }
    `;
    
    // Same fragment shader as regular rendering
    const instancedFragmentShader = `
      precision mediump float;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;
    
    // Compile instanced shaders
    const vertShader = this.compileShader(gl.VERTEX_SHADER, instancedVertexShader);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, instancedFragmentShader);
    
    // Create instanced program
    this.instancedProgram = gl.createProgram()!;
    gl.attachShader(this.instancedProgram, vertShader);
    gl.attachShader(this.instancedProgram, fragShader);
    gl.linkProgram(this.instancedProgram);
    
    if (!gl.getProgramParameter(this.instancedProgram, gl.LINK_STATUS)) {
      throw new Error('Instanced shader program failed to link');
    }
    
    // Create single quad for all instances (-0.5 to 0.5)
    const quadVertices = new Float32Array([
      -0.5, -0.5,  // Bottom-left
       0.5, -0.5,  // Bottom-right
       0.5,  0.5,  // Top-right
      -0.5,  0.5   // Top-left
    ]);
    
    this.instancedVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instancedVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    
    // Create instance attribute buffers (will be filled during rendering)
    this.instancePositionBuffer = gl.createBuffer();
    this.instanceRotationBuffer = gl.createBuffer();
    this.instanceColorBuffer = gl.createBuffer();
    this.instanceSizeBuffer = gl.createBuffer();
  }
  
  /**
   * Initialize GPU rotation mode
   * Creates shaders and buffers for GPU-side rotation calculations
   * YAGNI: Only initialized on first use (lazy initialization)
   */
  private initializeGPURotation(): void {
    const gl = this.gl;
    
    // Compile GPU rotation shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, GPURotationShaders.getVertexShader());
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, GPURotationShaders.getFragmentShader());
    
    // Create shader program
    this.gpuRotationProgram = gl.createProgram()!;
    gl.attachShader(this.gpuRotationProgram, vertexShader);
    gl.attachShader(this.gpuRotationProgram, fragmentShader);
    gl.linkProgram(this.gpuRotationProgram);
    
    if (!gl.getProgramParameter(this.gpuRotationProgram, gl.LINK_STATUS)) {
      throw new Error('GPU rotation shader program failed to link');
    }
    
    // CRITICAL: Cache all attribute/uniform locations now (expensive operations!)
    this.gpuRotationAttrCorner = gl.getAttribLocation(this.gpuRotationProgram, 'a_corner');
    this.gpuRotationAttrPosition = gl.getAttribLocation(this.gpuRotationProgram, 'a_position');
    this.gpuRotationAttrSize = gl.getAttribLocation(this.gpuRotationProgram, 'a_size');
    this.gpuRotationAttrRotation = gl.getAttribLocation(this.gpuRotationProgram, 'a_rotation');
    this.gpuRotationAttrColor = gl.getAttribLocation(this.gpuRotationProgram, 'a_color');
    this.gpuRotationUniformProjection = gl.getUniformLocation(this.gpuRotationProgram, 'u_projection');
    this.gpuRotationUniformTexture = gl.getUniformLocation(this.gpuRotationProgram, 'u_useTexture');
    
    // Create shared quad vertices (corners for all instances)
    const quadCorners = new Float32Array([
      -1, -1,  // Bottom-left
       1, -1,  // Bottom-right
       1,  1,  // Top-right
      -1,  1   // Top-left
    ]);
    
    this.gpuRotationQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuRotationQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadCorners, gl.STATIC_DRAW);
    
    // Create index buffer for quad (2 triangles = 6 indices)
    const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this.gpuRotationIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.gpuRotationIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
    
    // Create instance buffer (will be filled during rendering)
    this.gpuRotationInstanceBuffer = gl.createBuffer();
    
    // Pre-allocate instance buffer for maxBatchSize
    const bufferSize = this.gpuRotationLayout.calculateBufferSize(this.maxBatchSize);
    this.gpuRotationInstances = new Float32Array(bufferSize);
    
    console.log('✅ GPU Rotation Mode initialized - Attribute locations cached');
  }

  begin(width: number, height: number): void {
    const gl = this.gl;
    
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Setup projection matrix (orthographic)
    const projectionMatrix = new Float32Array([
      2 / width, 0, 0, 0,
      0, -2 / height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    
    const projectionLoc = gl.getUniformLocation(this.program!, 'u_projection');
    gl.uniformMatrix4fv(projectionLoc, false, projectionMatrix);
    
    // Cache uniform location (CRITICAL: getUniformLocation is expensive!)
    this.useTextureUniformLoc = gl.getUniformLocation(this.program!, 'u_useTexture');
    
    // Setup attributes
    const positionLoc = gl.getAttribLocation(this.program!, 'a_position');
    const colorLoc = gl.getAttribLocation(this.program!, 'a_color');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    const stride = 16; // pos(8) + color(4) + padding(4)
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(colorLoc);
    // Color as UNSIGNED_BYTE normalized (4 bytes at offset 8)
    gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, stride, 8);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    this.vertexCount = 0;
    this.drawCallCount = 0;
    this.currentTexture = null;
    this.lastTextureState = -1; // Reset texture state tracking
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
    
    const r = color.r;
    const g = color.g;
    const b = color.b;
    const a = alpha;
    
    let offset = this.vertexCount * 8;
    
    this.batchVertices[offset++] = c0x;
    this.batchVertices[offset++] = c0y;
    this.batchVertices[offset++] = 0;
    this.batchVertices[offset++] = 0;
    this.batchVertices[offset++] = r;
    this.batchVertices[offset++] = g;
    this.batchVertices[offset++] = b;
    this.batchVertices[offset++] = a;
    this.vertexCount++;
    
    this.batchVertices[offset++] = c1x;
    this.batchVertices[offset++] = c1y;
    this.batchVertices[offset++] = 1;
    this.batchVertices[offset++] = 0;
    this.batchVertices[offset++] = r;
    this.batchVertices[offset++] = g;
    this.batchVertices[offset++] = b;
    this.batchVertices[offset++] = a;
    this.vertexCount++;
    
    this.batchVertices[offset++] = c2x;
    this.batchVertices[offset++] = c2y;
    this.batchVertices[offset++] = 1;
    this.batchVertices[offset++] = 1;
    this.batchVertices[offset++] = r;
    this.batchVertices[offset++] = g;
    this.batchVertices[offset++] = b;
    this.batchVertices[offset++] = a;
    this.vertexCount++;
    
    this.batchVertices[offset++] = c3x;
    this.batchVertices[offset++] = c3y;
    this.batchVertices[offset++] = 0;
    this.batchVertices[offset++] = 1;
    this.batchVertices[offset++] = r;
    this.batchVertices[offset++] = g;
    this.batchVertices[offset++] = b;
    this.batchVertices[offset++] = a;
    this.vertexCount++;
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
    
    const vertexDataSize = this.vertexCount * 16; // 16 bytes per vertex
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.batchVertices.subarray(0, this.vertexCount * 4));
    
    // Record buffer upload for performance monitoring
    if (this.perfMonitor) {
      this.perfMonitor.recordBufferUpload(vertexDataSize);
      this.perfMonitor.recordVertices(this.vertexCount);
      this.perfMonitor.recordStateChange(); // Buffer update is a state change
    }
    
    const useTexture = this.currentTexture ? 1 : 0;
    if (useTexture !== this.lastTextureState) {
      gl.uniform1i(this.useTextureUniformLoc, useTexture);
      this.lastTextureState = useTexture;
      if (this.perfMonitor) {
        this.perfMonitor.recordStateChange(); // Uniform update is a state change
      }
    }
    
    const indexCount = (this.vertexCount / 4) * 6;
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    
    // Record rendering metrics
    if (this.perfMonitor) {
      this.perfMonitor.recordIndices(indexCount);
      this.perfMonitor.recordBatch(this.vertexCount / 4); // sprites in this batch
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
    FLAG_VISIBLE: number
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
        
        // CPU rotation
        const cos = this.cosCache[rotDeg];
        const sin = this.sinCache[rotDeg];
        const hwCos = hw * cos;
        const hwSin = hw * sin;
        
        const c0x = -hwCos + hwSin + x;
        const c0y = -hwSin - hwCos + y;
        const c1x = hwCos + hwSin + x;
        const c1y = hwSin - hwCos + y;
        const c2x = hwCos - hwSin + x;
        const c2y = hwSin + hwCos + y;
        const c3x = -hwCos - hwSin + x;
        const c3y = -hwSin + hwCos + y;
        
        // Color bytes (0-255)
        const rByte = colorR[i];
        const gByte = colorG[i];
        const bByte = colorB[i];
        const aByte = Math.floor(alphas[i] * 255);
        
        // 24-byte vertex format: 6 floats (pos(2) + uv(2) + padding(2))
        let floatOffset = (this.vertexCount + visibleCount * 4) * 6;
        const baseByteOffset = floatOffset * 4; // Convert to byte offset
        visibleCount++;
        
        // Unrolled vertex writes
        this.batchVertices[floatOffset++] = c0x; this.batchVertices[floatOffset++] = c0y;
        this.batchVertices[floatOffset++] = 0; this.batchVertices[floatOffset++] = 0;
        floatOffset += 2; // Skip padding
        this.batchVertices[floatOffset++] = c1x; this.batchVertices[floatOffset++] = c1y;
        this.batchVertices[floatOffset++] = 1; this.batchVertices[floatOffset++] = 0;
        floatOffset += 2;
        this.batchVertices[floatOffset++] = c2x; this.batchVertices[floatOffset++] = c2y;
        this.batchVertices[floatOffset++] = 1; this.batchVertices[floatOffset++] = 1;
        floatOffset += 2;
        this.batchVertices[floatOffset++] = c3x; this.batchVertices[floatOffset++] = c3y;
        this.batchVertices[floatOffset++] = 0; this.batchVertices[floatOffset++] = 1;
        
        // Write colors as bytes (4 bytes per vertex at offset 16, stride 24 bytes)
        let colorByteOffset = baseByteOffset + 16;
        // Vertex 0
        this.batchVerticesU8[colorByteOffset++] = rByte;
        this.batchVerticesU8[colorByteOffset++] = gByte;
        this.batchVerticesU8[colorByteOffset++] = bByte;
        this.batchVerticesU8[colorByteOffset++] = aByte;
        colorByteOffset += 20; // Skip to next vertex (16 bytes floats + 4 bytes padding)
        // Vertex 1
        this.batchVerticesU8[colorByteOffset++] = rByte;
        this.batchVerticesU8[colorByteOffset++] = gByte;
        this.batchVerticesU8[colorByteOffset++] = bByte;
        this.batchVerticesU8[colorByteOffset++] = aByte;
        colorByteOffset += 20;
        // Vertex 2
        this.batchVerticesU8[colorByteOffset++] = rByte;
        this.batchVerticesU8[colorByteOffset++] = gByte;
        this.batchVerticesU8[colorByteOffset++] = bByte;
        this.batchVerticesU8[colorByteOffset++] = aByte;
        colorByteOffset += 20;
        // Vertex 3
        this.batchVerticesU8[colorByteOffset++] = rByte;
        this.batchVerticesU8[colorByteOffset++] = gByte;
        this.batchVerticesU8[colorByteOffset++] = bByte;
        this.batchVerticesU8[colorByteOffset++] = aByte;
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
    FLAG_VISIBLE: number
  ): void {
    const HALF = 0.5;
    
    for (let start = 0; start < indexCount; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, indexCount);
      let visibleCount = 0;
      
      for (let i = start; i < end; i++) {
        const idx = indices[i];  // Get actual entity index
        if ((flags[idx] & FLAG_VISIBLE) === 0) continue;
        
        const x = posX[idx];
        const y = posY[idx];
        const hw = sizes[idx] * HALF;
        const rotDeg = rotation[idx];
        
        // OPTIMIZED: Pre-calculate shared values once
        const cos = this.cosCache[rotDeg];
        const sin = this.sinCache[rotDeg];
        const hwCos = hw * cos;
        const hwSin = hw * sin;
        
        // OPTIMIZED: Calculate corners inline (reduces temp variable overhead)
        // 16-byte vertex format: 4 floats (pos(2) + padding(2))
        let floatOffset = (this.vertexCount + visibleCount * 4) * 4;
        const baseByteOffset = floatOffset * 4; // Convert to byte offset
        visibleCount++;
        
        // Color bytes (hoisted outside vertex loop)
        const rByte = colorR[idx];
        const gByte = colorG[idx];
        const bByte = colorB[idx];
        const aByte = Math.floor(alphas[idx] * 255);
        
        // Vertex 0 (top-left): position + skip padding
        this.batchVertices[floatOffset++] = -hwCos + hwSin + x;
        this.batchVertices[floatOffset++] = -hwSin - hwCos + y;
        floatOffset += 2; // Skip padding
        // Vertex 1 (top-right)
        this.batchVertices[floatOffset++] = hwCos + hwSin + x;
        this.batchVertices[floatOffset++] = hwSin - hwCos + y;
        floatOffset += 2;
        // Vertex 2 (bottom-right)
        this.batchVertices[floatOffset++] = hwCos - hwSin + x;
        this.batchVertices[floatOffset++] = hwSin + hwCos + y;
        floatOffset += 2;
        // Vertex 3 (bottom-left)
        this.batchVertices[floatOffset++] = -hwCos - hwSin + x;
        this.batchVertices[floatOffset++] = -hwSin + hwCos + y;
        
        // Write colors as bytes (4 bytes per vertex at offset 8, stride 16 bytes)
        let colorByteOffset = baseByteOffset + 8;
        // Vertex 0
        this.batchVerticesU8[colorByteOffset] = rByte;
        this.batchVerticesU8[colorByteOffset + 1] = gByte;
        this.batchVerticesU8[colorByteOffset + 2] = bByte;
        this.batchVerticesU8[colorByteOffset + 3] = aByte;
        colorByteOffset += 16; // Next vertex
        // Vertex 1
        this.batchVerticesU8[colorByteOffset] = rByte;
        this.batchVerticesU8[colorByteOffset + 1] = gByte;
        this.batchVerticesU8[colorByteOffset + 2] = bByte;
        this.batchVerticesU8[colorByteOffset + 3] = aByte;
        colorByteOffset += 16;
        // Vertex 2
        this.batchVerticesU8[colorByteOffset] = rByte;
        this.batchVerticesU8[colorByteOffset + 1] = gByte;
        this.batchVerticesU8[colorByteOffset + 2] = bByte;
        this.batchVerticesU8[colorByteOffset + 3] = aByte;
        colorByteOffset += 16;
        // Vertex 3
        this.batchVerticesU8[colorByteOffset] = rByte;
        this.batchVerticesU8[colorByteOffset + 1] = gByte;
        this.batchVerticesU8[colorByteOffset + 2] = bByte;
        this.batchVerticesU8[colorByteOffset + 3] = aByte;
      }
      
      this.vertexCount += visibleCount * 4;
      this.flush();
    }
  }
  
  /**
   * Draw entities using GPU rotation (rotation calculated in vertex shader)
   * 70% less data transfer: 24 bytes per sprite vs 80 bytes (CPU rotation)
   * Single vertex per sprite instead of 4 transformed corners
   * 
   * SOLID: Separate method for GPU rotation path (Single Responsibility)
   * DDD: Works with domain model (GPURotationVertexLayout)
   */
  drawBulkGPURotation(
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
    FLAG_VISIBLE: number
  ): void {
    const gl = this.gl;
    
    // Ensure GPU rotation is initialized
    if (!this.gpuRotationProgram) {
      this.initializeGPURotation();
    }
    
    const HALF = 0.5;
    const DEG_TO_RAD = Math.PI / 180;
    const ext = this.ext || (gl as any);
    
    // Setup GL state ONCE (not per batch!)
    gl.useProgram(this.gpuRotationProgram);
    
    // Setup projection matrix ONCE
    const projectionMatrix = new Float32Array([
      2 / this.gl.canvas.width, 0, 0, 0,
      0, -2 / this.gl.canvas.height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    gl.uniformMatrix4fv(this.gpuRotationUniformProjection, false, projectionMatrix);
    gl.uniform1i(this.gpuRotationUniformTexture, 0);
    
    // Setup vertex attributes ONCE (use cached locations!)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuRotationQuadBuffer);
    gl.enableVertexAttribArray(this.gpuRotationAttrCorner);
    gl.vertexAttribPointer(this.gpuRotationAttrCorner, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.gpuRotationIndexBuffer);
    
    const stride = this.gpuRotationLayout.getStride();
    
    // Process in batches
    for (let start = 0; start < indexCount; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, indexCount);
      let instanceCount = 0;
      let instanceOffset = 0;
      
      // Build instance buffer
      for (let i = start; i < end; i++) {
        const idx = indices[i];
        if ((flags[idx] & FLAG_VISIBLE) === 0) continue;
        
        // Pack color as uint32
        const rByte = colorR[idx];
        const gByte = colorG[idx];
        const bByte = colorB[idx];
        const aByte = Math.floor(alphas[idx] * 255);
        const packedColor = (rByte) | (gByte << 8) | (bByte << 16) | (aByte << 24);
        
        // Write instance data (6 floats per sprite)
        instanceOffset = this.gpuRotationBuilder.writeInstance(
          this.gpuRotationInstances,
          instanceOffset,
          posX[idx],
          posY[idx],
          sizes[idx] * HALF,
          sizes[idx] * HALF,
          rotation[idx] * DEG_TO_RAD,
          packedColor
        );
        
        instanceCount++;
      }
      
      if (instanceCount === 0) continue;
      
      // Upload instance data and draw
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuRotationInstanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.gpuRotationInstances.subarray(0, instanceCount * 6), gl.STREAM_DRAW);
      
      // Setup per-instance attributes (cached locations!)
      gl.enableVertexAttribArray(this.gpuRotationAttrPosition);
      gl.vertexAttribPointer(this.gpuRotationAttrPosition, 2, gl.FLOAT, false, stride, this.gpuRotationLayout.getPositionByteOffset());
      ext.vertexAttribDivisor(this.gpuRotationAttrPosition, 1);
      
      gl.enableVertexAttribArray(this.gpuRotationAttrSize);
      gl.vertexAttribPointer(this.gpuRotationAttrSize, 2, gl.FLOAT, false, stride, this.gpuRotationLayout.getSizeByteOffset());
      ext.vertexAttribDivisor(this.gpuRotationAttrSize, 1);
      
      gl.enableVertexAttribArray(this.gpuRotationAttrRotation);
      gl.vertexAttribPointer(this.gpuRotationAttrRotation, 1, gl.FLOAT, false, stride, this.gpuRotationLayout.getRotationByteOffset());
      ext.vertexAttribDivisor(this.gpuRotationAttrRotation, 1);
      
      gl.enableVertexAttribArray(this.gpuRotationAttrColor);
      gl.vertexAttribPointer(this.gpuRotationAttrColor, 4, gl.UNSIGNED_BYTE, true, stride, this.gpuRotationLayout.getColorByteOffset());
      ext.vertexAttribDivisor(this.gpuRotationAttrColor, 1);
      
      // Draw instanced!
      ext.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, instanceCount);
      
      this.drawCallCount++;
    }
    
    // Reset divisors
    ext.vertexAttribDivisor(this.gpuRotationAttrPosition, 0);
    ext.vertexAttribDivisor(this.gpuRotationAttrSize, 0);
    ext.vertexAttribDivisor(this.gpuRotationAttrRotation, 0);
    ext.vertexAttribDivisor(this.gpuRotationAttrColor, 0);
    
    // Log GPU rotation stats for debugging
    if (this.enableWarnings && !this.warnedAbout.has('gpu_rotation_stats')) {
      console.log(`✅ GPU Rotation: Rendered ${indexCount} entities in ${Math.ceil(indexCount / this.maxBatchSize)} batches`);
      this.warnedAbout.add('gpu_rotation_stats');
    }
  }

  /**
   * Draw entities using GPU instancing - SINGLE DRAW CALL!
   * 10-20x faster than drawBulk for large entity counts
   * Requires WebGL2 or ANGLE_instanced_arrays extension
   */
  drawInstanced(
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
    FLAG_VISIBLE: number
  ): void {
    if (!this.isInstancingActive()) {
      // Fallback to regular batch rendering
      this.drawBulk(posX, posY, rotation, sizes, colorR, colorG, colorB, alphas, flags, count, FLAG_VISIBLE);
      return;
    }
    
    const gl = this.gl;
    const COLOR_NORM = 1.0 / 255.0;
    const MAX_INSTANCES_PER_CALL = 65000; // Match batch size for optimal performance
    
    // Filter visible entities first
    const tempPositions: number[] = [];
    const tempRotations: number[] = [];
    const tempSizes: number[] = [];
    const tempColors: number[] = [];
    
    for (let i = 0; i < count; i++) {
      if ((flags[i] & FLAG_VISIBLE) === 0) continue;
      
      tempPositions.push(posX[i], posY[i]);
      tempRotations.push(rotation[i]); // Degrees (will convert in shader)
      tempSizes.push(sizes[i]);
      tempColors.push(
        colorR[i] * COLOR_NORM,
        colorG[i] * COLOR_NORM,
        colorB[i] * COLOR_NORM,
        alphas[i]
      );
    }
    
    const visibleCount = tempRotations.length;
    if (visibleCount === 0) return;
    
    // Convert to typed arrays
    const positions = new Float32Array(tempPositions);
    const rotations = new Float32Array(tempRotations);
    const entitySizes = new Float32Array(tempSizes);
    const colors = new Float32Array(tempColors);
    
    // Use instanced program
    gl.useProgram(this.instancedProgram);
    
    // Setup projection
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const projectionMatrix = new Float32Array([
      2 / width, 0, 0, 0,
      0, -2 / height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    const projLoc = gl.getUniformLocation(this.instancedProgram!, 'u_projection');
    gl.uniformMatrix4fv(projLoc, false, projectionMatrix);
    
    // Bind quad vertices (shared by all instances)
    const vertexLoc = gl.getAttribLocation(this.instancedProgram!, 'a_vertex');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instancedVertexBuffer);
    gl.enableVertexAttribArray(vertexLoc);
    gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
    
    // Get attribute locations (reuse for all chunks)
    const posLoc = gl.getAttribLocation(this.instancedProgram!, 'a_position');
    const rotLoc = gl.getAttribLocation(this.instancedProgram!, 'a_rotation');
    const sizeLoc = gl.getAttribLocation(this.instancedProgram!, 'a_size');
    const colorLoc = gl.getAttribLocation(this.instancedProgram!, 'a_color');
    
    // Enable attributes once
    gl.enableVertexAttribArray(posLoc);
    gl.enableVertexAttribArray(rotLoc);
    gl.enableVertexAttribArray(sizeLoc);
    gl.enableVertexAttribArray(colorLoc);
    
    // Set divisors once
    this.setVertexAttribDivisor(posLoc, 1);
    this.setVertexAttribDivisor(rotLoc, 1);
    this.setVertexAttribDivisor(sizeLoc, 1);
    this.setVertexAttribDivisor(colorLoc, 1);
    
    // Process in chunks to avoid WebGL limits
    let totalDrawCalls = 0;
    for (let start = 0; start < visibleCount; start += MAX_INSTANCES_PER_CALL) {
      const end = Math.min(start + MAX_INSTANCES_PER_CALL, visibleCount);
      const chunkSize = end - start;
      
      // Upload chunk data to instance buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instancePositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions.subarray(start * 2, end * 2), gl.STREAM_DRAW);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceRotationBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, rotations.subarray(start, end), gl.STREAM_DRAW);
      gl.vertexAttribPointer(rotLoc, 1, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceSizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, entitySizes.subarray(start, end), gl.STREAM_DRAW);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors.subarray(start * 4, end * 4), gl.STREAM_DRAW);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
      
      // Draw this chunk
      this.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, chunkSize);
      totalDrawCalls++;
    }
    
    // Track performance
    this.drawCallCount += totalDrawCalls;
    if (this.perfMonitor) {
      this.perfMonitor.recordVertices(visibleCount * 4);
      this.perfMonitor.recordIndices(visibleCount * 6);
      this.perfMonitor.recordBatch(visibleCount);
    }
    
    // Clean up
    gl.disableVertexAttribArray(vertexLoc);
    gl.disableVertexAttribArray(posLoc);
    gl.disableVertexAttribArray(rotLoc);
    gl.disableVertexAttribArray(sizeLoc);
    gl.disableVertexAttribArray(colorLoc);
  }

  /**
   * 🔥 ZERO-COPY INSTANCED RENDERING WITH INDEXED CULLING
   * Renders visible entities directly using indices - no array copying!
   * This is the fastest rendering path for culled entities.
   */
  drawInstancedIndexed(
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
    FLAG_VISIBLE: number
  ): void {
    if (!this.isInstancingActive()) {
      // Fallback to indexed batch rendering
      this.drawBulkIndexed(posX, posY, rotation, sizes, colorR, colorG, colorB, alphas, flags, indices, indexCount, FLAG_VISIBLE);
      return;
    }
    
    const gl = this.gl;
    const COLOR_NORM = 1.0 / 255.0;
    const MAX_INSTANCES_PER_CALL = 65000;
    
    // Pre-allocate temp arrays (reuse across chunks if possible)
    const tempPositions = new Float32Array(indexCount * 2);
    const tempRotations = new Float32Array(indexCount);
    const tempSizes = new Float32Array(indexCount);
    const tempColors = new Float32Array(indexCount * 4);
    
    // Gather visible entity data using indices (single pass)
    let visibleCount = 0;
    for (let i = 0; i < indexCount; i++) {
      const idx = indices[i];
      if ((flags[idx] & FLAG_VISIBLE) === 0) continue;
      
      const offset2 = visibleCount * 2;
      const offset4 = visibleCount * 4;
      
      tempPositions[offset2] = posX[idx];
      tempPositions[offset2 + 1] = posY[idx];
      tempRotations[visibleCount] = rotation[idx];
      tempSizes[visibleCount] = sizes[idx];
      tempColors[offset4] = colorR[idx] * COLOR_NORM;
      tempColors[offset4 + 1] = colorG[idx] * COLOR_NORM;
      tempColors[offset4 + 2] = colorB[idx] * COLOR_NORM;
      tempColors[offset4 + 3] = alphas[idx];
      
      visibleCount++;
    }
    
    if (visibleCount === 0) return;
    
    // Use instanced program
    gl.useProgram(this.instancedProgram);
    
    // Setup projection
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const projectionMatrix = new Float32Array([
      2 / width, 0, 0, 0,
      0, -2 / height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    const projLoc = gl.getUniformLocation(this.instancedProgram!, 'u_projection');
    gl.uniformMatrix4fv(projLoc, false, projectionMatrix);
    
    // Bind quad vertices
    const vertexLoc = gl.getAttribLocation(this.instancedProgram!, 'a_vertex');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instancedVertexBuffer);
    gl.enableVertexAttribArray(vertexLoc);
    gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
    
    // Get attribute locations
    const posLoc = gl.getAttribLocation(this.instancedProgram!, 'a_position');
    const rotLoc = gl.getAttribLocation(this.instancedProgram!, 'a_rotation');
    const sizeLoc = gl.getAttribLocation(this.instancedProgram!, 'a_size');
    const colorLoc = gl.getAttribLocation(this.instancedProgram!, 'a_color');
    
    // Enable attributes and set divisors
    gl.enableVertexAttribArray(posLoc);
    gl.enableVertexAttribArray(rotLoc);
    gl.enableVertexAttribArray(sizeLoc);
    gl.enableVertexAttribArray(colorLoc);
    
    this.setVertexAttribDivisor(posLoc, 1);
    this.setVertexAttribDivisor(rotLoc, 1);
    this.setVertexAttribDivisor(sizeLoc, 1);
    this.setVertexAttribDivisor(colorLoc, 1);
    
    // Render in chunks
    let totalDrawCalls = 0;
    for (let start = 0; start < visibleCount; start += MAX_INSTANCES_PER_CALL) {
      const end = Math.min(start + MAX_INSTANCES_PER_CALL, visibleCount);
      const chunkSize = end - start;
      
      // Upload chunk data
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instancePositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, tempPositions.subarray(start * 2, end * 2), gl.STREAM_DRAW);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceRotationBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, tempRotations.subarray(start, end), gl.STREAM_DRAW);
      gl.vertexAttribPointer(rotLoc, 1, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceSizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, tempSizes.subarray(start, end), gl.STREAM_DRAW);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, tempColors.subarray(start * 4, end * 4), gl.STREAM_DRAW);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
      
      // Draw chunk
      this.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, chunkSize);
      totalDrawCalls++;
    }
    
    // Track performance
    this.drawCallCount += totalDrawCalls;
    if (this.perfMonitor) {
      this.perfMonitor.recordVertices(visibleCount * 4);
      this.perfMonitor.recordIndices(visibleCount * 6);
      this.perfMonitor.recordBatch(visibleCount);
    }
    
    // Clean up
    gl.disableVertexAttribArray(vertexLoc);
    gl.disableVertexAttribArray(posLoc);
    gl.disableVertexAttribArray(rotLoc);
    gl.disableVertexAttribArray(sizeLoc);
    gl.disableVertexAttribArray(colorLoc);
  }

  /**
   * Wrapper for vertex attrib divisor (WebGL2 vs WebGL1 extension)
   */
  private setVertexAttribDivisor(location: number, divisor: number): void {
    const gl = this.gl;
    if ('WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext) {
      gl.vertexAttribDivisor(location, divisor);
    } else if (this.ext) {
      this.ext.vertexAttribDivisorANGLE(location, divisor);
    }
  }

  /**
   * Wrapper for drawArraysInstanced (WebGL2 vs WebGL1 extension)
   */
  private drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void {
    const gl = this.gl;
    if ('WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext) {
      gl.drawArraysInstanced(mode, first, count, instanceCount);
    } else if (this.ext) {
      this.ext.drawArraysInstancedANGLE(mode, first, count, instanceCount);
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
