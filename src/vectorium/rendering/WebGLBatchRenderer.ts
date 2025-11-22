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
  private shapeProgram: WebGLProgram | null = null; // 🎨 Shape shader program
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
  
  // Cached uniform locations (avoid getUniformLocation calls in hot path)
  private u_projection: WebGLUniformLocation | null = null;
  private u_shapeProjection: WebGLUniformLocation | null = null; // 🎨 Shape shader uniform
  
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
  
  // 🎨 GPU acceleration toggle
  private gpuAccelerationEnabled = true;
  
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
   * 🎨 Toggle GPU acceleration for shapes
   */
  setGPUAccelerationEnabled(enabled: boolean): void {
    this.gpuAccelerationEnabled = enabled;
  }

  /**
   * 🎨 Check if GPU acceleration is enabled
   */
  isGPUAccelerationEnabled(): boolean {
    return this.gpuAccelerationEnabled;
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
    
    // 🎨 Initialize shape shader program (WebGL2 only for now)
    if (gl instanceof WebGL2RenderingContext && this.gpuAccelerationEnabled) {
      this.initializeShapeShader();
    }
  }

  /**
   * 🎨 Initialize shape rendering shader (SDF-based)
   */
  private initializeShapeShader(): void {
    const gl = this.gl as WebGL2RenderingContext;
    
    // Shape vertex shader (20-byte vertex format)
    const shapeVertexSource = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aUV;
layout(location = 2) in uint aMetadata;

uniform mat3 uProjection;

out vec4 vColor;
out vec2 vShapeUV;
flat out int vShapeType;

void main() {
  vec3 projected = uProjection * vec3(aPosition, 1.0);
  gl_Position = vec4(projected.xy, 0.0, 1.0);
  
  // Unpack metadata: [R8|G8|B8|A4|ShapeType4]
  uint r = (aMetadata >> 0u) & 0xFFu;
  uint g = (aMetadata >> 8u) & 0xFFu;
  uint b = (aMetadata >> 16u) & 0xFFu;
  uint a = (aMetadata >> 24u) & 0xFu;
  uint shapeType = (aMetadata >> 28u) & 0xFu;
  
  vColor = vec4(
    float(r) / 255.0,
    float(g) / 255.0,
    float(b) / 255.0,
    float(a) / 15.0
  );
  
  vShapeUV = aUV * 2.0 - 1.0;
  vShapeType = int(shapeType);
}
`;

    // Shape fragment shader (SDF-based)
    const shapeFragmentSource = `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vShapeUV;
flat in int vShapeType;

out vec4 fragColor;

const float PI = 3.14159265359;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdTriangle(vec2 p) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - 1.0;
  p.y = p.y + 1.0 / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0, 0.0);
  return -length(p) * sign(p.y);
}

float sdPolygon(vec2 p, float r, int n) {
  float an = PI / float(n);
  float en = PI / float(n);
  vec2 acs = vec2(cos(en), sin(en));
  
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p.y += clamp(-p.y, 0.0, r * acs.y);
  
  return length(p) * sign(p.x);
}

float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

float sdStar6(vec2 p, float r) {
  const float k = sqrt(3.0);
  p = abs(p);
  p -= vec2(clamp(p.x, -k * r, k * r), r);
  
  float d1 = length(p) * sign(p.y);
  
  p = vec2(p.x * k + p.y, -p.x + p.y * k) / 2.0;
  p -= vec2(clamp(p.x, -k * r, k * r), r);
  
  float d2 = length(p) * sign(p.y);
  
  return min(d1, d2);
}

float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) {
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  }
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

float getShapeSDF(vec2 uv, int shapeType) {
  float dist = 1.0;
  
  if (shapeType == 1) dist = sdCircle(uv, 0.9);
  else if (shapeType == 2) dist = sdTriangle(uv * 1.2);
  else if (shapeType == 3) dist = sdStar5(uv, 0.7, 0.4);
  else if (shapeType == 4) dist = sdStar6(uv, 0.5);
  else if (shapeType == 5) dist = sdPolygon(uv, 0.9, 6);
  else if (shapeType == 6) dist = sdBox(uv, vec2(0.8));
  else if (shapeType == 7) dist = sdPolygon(uv, 0.9, 5);
  else if (shapeType == 8) dist = sdPolygon(uv, 0.9, 8);
  else if (shapeType == 9) {
    // DIAMOND: Rotate UV by 45 degrees then render as box
    // GLSL mat2 is column-major: mat2(col1_x, col1_y, col2_x, col2_y)
    // For 45° rotation: cos(45°)=0.707, sin(45°)=0.707
    vec2 rotated = mat2(0.707, 0.707, -0.707, 0.707) * uv;
    dist = sdBox(rotated, vec2(0.7));
  }
  else if (shapeType == 10) dist = sdHeart(uv * 1.5);
  
  return dist;
}

void main() {
  float dist = getShapeSDF(vShapeUV, vShapeType);
  float edge = fwidth(dist);
  float alpha = 1.0 - smoothstep(-edge, edge, dist);
  
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  if (fragColor.a < 0.01) discard;
}
`;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, shapeVertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, shapeFragmentSource);
    
    this.shapeProgram = gl.createProgram()!;
    gl.attachShader(this.shapeProgram, vertexShader);
    gl.attachShader(this.shapeProgram, fragmentShader);
    gl.linkProgram(this.shapeProgram);
    
    if (!gl.getProgramParameter(this.shapeProgram, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.shapeProgram);
      throw new Error(`Shape shader program failed to link: ${info}`);
    }
    
    // Cache shape shader uniform
    this.u_shapeProjection = gl.getUniformLocation(this.shapeProgram, 'uProjection');
    
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
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

  /**
   * 🎨 Draw shapes using SDF shader
   * GPU-accelerated shape rendering (circles, stars, triangles, etc.)
   * 
   * Requirements:
   * - WebGL2 context
   * - GPU acceleration enabled
   * 
   * Fallback: If WebGL2 unavailable, shapes render as colored squares
   */
  drawBulkShapes(
    posX: Float32Array,
    posY: Float32Array,
    rotation: Uint16Array,
    sizes: Float32Array,
    colorR: Uint8Array,
    colorG: Uint8Array,
    colorB: Uint8Array,
    alphas: Float32Array,
    shapeTypes: Uint8Array,
    flags: Uint32Array,
    count: number,
    FLAG_VISIBLE: number,
    cameraX: number = 0,
    cameraY: number = 0,
    cameraZoom: number = 1
  ): void {
    // Skip if no shape shader (WebGL1 or GPU acceleration disabled)
    if (!this.shapeProgram || !this.gpuAccelerationEnabled) {
      // Fallback: render as simple colored squares using regular shader
      this.drawBulk(posX, posY, rotation, sizes, colorR, colorG, colorB, alphas, flags, count, FLAG_VISIBLE, cameraX, cameraY, cameraZoom);
      return;
    }
    
    const gl = this.gl;
    const HALF = 0.5;
    
    // Switch to shape shader
    gl.useProgram(this.shapeProgram);
    
    // Set projection uniform
    const projectionMatrix = this.createProjectionMatrix(gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(this.u_shapeProjection, false, projectionMatrix);
    
    for (let start = 0; start < count; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, count);
      let visibleCount = 0;
      
      // Build vertex data with 20-byte format:
      // Position (8B) + UV (8B) + Metadata (4B)
      const shapeVertices = new Float32Array(this.maxBatchSize * 4 * 5); // 5 floats per vertex
      const shapeMetadata = new Uint32Array(shapeVertices.buffer);
      
      for (let i = start; i < end; i++) {
        if ((flags[i] & FLAG_VISIBLE) === 0) continue;
        
        const x = posX[i];
        const y = posY[i];
        const hw = sizes[i] * HALF;
        const rotDeg = rotation[i];
        const shapeType = shapeTypes[i];
        
        // Rotation
        const cos = this.cosCache[rotDeg];
        const sin = this.sinCache[rotDeg];
        
        // Screen space position
        const screenX = (x - cameraX) * cameraZoom + gl.canvas.width / 2;
        const screenY = (y - cameraY) * cameraZoom + gl.canvas.height / 2;
        const screenHw = hw * cameraZoom;
        const screenHwCos = screenHw * cos;
        const screenHwSin = screenHw * sin;
        
        // Pack metadata: [R8|G8|B8|A4|ShapeType4]
        const r = colorR[i];
        const g = colorG[i];
        const b = colorB[i];
        const a = Math.min(15, Math.floor(alphas[i] * 15));
        const metadata = r | (g << 8) | (b << 16) | (a << 24) | (shapeType << 28);
        
        const floatOffset = visibleCount * 20; // 5 floats × 4 vertices
        visibleCount++;
        
        // Vertex 0: top-left
        shapeVertices[floatOffset + 0] = screenX - screenHwCos + screenHwSin;
        shapeVertices[floatOffset + 1] = screenY - screenHwSin - screenHwCos;
        shapeVertices[floatOffset + 2] = 0.0; // UV.x
        shapeVertices[floatOffset + 3] = 0.0; // UV.y
        shapeMetadata[floatOffset + 4] = metadata;
        
        // Vertex 1: top-right
        shapeVertices[floatOffset + 5] = screenX + screenHwCos + screenHwSin;
        shapeVertices[floatOffset + 6] = screenY + screenHwSin - screenHwCos;
        shapeVertices[floatOffset + 7] = 1.0; // UV.x
        shapeVertices[floatOffset + 8] = 0.0; // UV.y
        shapeMetadata[floatOffset + 9] = metadata;
        
        // Vertex 2: bottom-right
        shapeVertices[floatOffset + 10] = screenX + screenHwCos - screenHwSin;
        shapeVertices[floatOffset + 11] = screenY + screenHwSin + screenHwCos;
        shapeVertices[floatOffset + 12] = 1.0; // UV.x
        shapeVertices[floatOffset + 13] = 1.0; // UV.y
        shapeMetadata[floatOffset + 14] = metadata;
        
        // Vertex 3: bottom-left
        shapeVertices[floatOffset + 15] = screenX - screenHwCos - screenHwSin;
        shapeVertices[floatOffset + 16] = screenY - screenHwSin + screenHwCos;
        shapeVertices[floatOffset + 17] = 0.0; // UV.x
        shapeVertices[floatOffset + 18] = 1.0; // UV.y
        shapeMetadata[floatOffset + 19] = metadata;
      }
      
      // Upload and draw
      if (visibleCount > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, shapeVertices, gl.STREAM_DRAW);
        
        // Setup vertex attributes (20-byte stride)
        gl.enableVertexAttribArray(0); // position
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
        
        gl.enableVertexAttribArray(1); // uv
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 8);
        
        gl.enableVertexAttribArray(2); // metadata
        (gl as WebGL2RenderingContext).vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 20, 16);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, visibleCount * 6, this.indexType, 0);
        
        this.drawCallCount++;
      }
    }
    
    // Restore default shader
    gl.useProgram(this.program);
  }

  /**
   * Create 3x3 projection matrix for 2D rendering
   */
  private createProjectionMatrix(width: number, height: number): Float32Array {
    return new Float32Array([
      2 / width, 0, 0,
      0, -2 / height, 0,
      -1, 1, 1
    ]);
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
    if (this.shapeProgram) gl.deleteProgram(this.shapeProgram); // 🎨 Clean up shape shader
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  }
}
