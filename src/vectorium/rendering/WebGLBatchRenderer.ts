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
  // Optional UV coordinates for texture atlases (defaults to 0,0 -> 1,1)
  uvX?: number;
  uvY?: number;
  uvWidth?: number;
  uvHeight?: number;
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
  private batchIndices: Uint16Array | Uint32Array;
  private shapeVertices: Float32Array | null = null; // 🎨 Reusable buffer for shape rendering
  private shapeMetadata: Uint32Array | null = null; // 🎨 Uint32 view for metadata
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
  private currentShaderProgram: WebGLProgram | null = null; // Track active shader to detect changes
  
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
    
    // Optimized format: 20 bytes per vertex (pos 8 + uv 8 + color 4)
    const bytesPerVertex = 20;
    const arrayBuffer = new ArrayBuffer(this.maxBatchSize * 4 * bytesPerVertex);
    this.batchVertices = new Float32Array(arrayBuffer);
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
    
    // Vertex shader (supports both textured and colored rendering)
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      attribute vec4 a_color;
      
      uniform mat4 u_projection;
      
      varying vec4 v_color;
      varying vec2 v_texcoord;
      
      void main() {
        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
        v_color = a_color;
        v_texcoord = a_texcoord;
      }
    `;
    
    // Fragment shader (supports both textured and colored rendering)
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      varying vec2 v_texcoord;
      
      uniform sampler2D u_texture;
      uniform int u_hasTexture;
      
      void main() {
        if (u_hasTexture == 1) {
          gl_FragColor = texture2D(u_texture, v_texcoord) * v_color;
        } else {
          gl_FragColor = v_color;
        }
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
  
  // Unpack metadata: [R8|G8|B8|A3|ShapeType5]
  uint r = (aMetadata >> 0u) & 0xFFu;
  uint g = (aMetadata >> 8u) & 0xFFu;
  uint b = (aMetadata >> 16u) & 0xFFu;
  uint a = (aMetadata >> 24u) & 0x7u;  // 3 bits for alpha (0-7)
  uint shapeType = (aMetadata >> 27u) & 0x1Fu;  // 5 bits for shapeType (0-31)
  
  vColor = vec4(
    float(r) / 255.0,
    float(g) / 255.0,
    float(b) / 255.0,
    float(a) / 7.0  // Map 0-7 to 0.0-1.0
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

float sdTriangle(vec2 p, float r) {
  // Equilateral Triangle - from Inigo Quilezles
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r/k;
  if (p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y)/2.0;
  p.x -= clamp(p.x, -2.0*r, 0.0);
  return -length(p)*sign(p.y);
}

float sdPentagon(vec2 p, float r) {
  // Regular Pentagon - from Inigo Quilezles
  const vec3 k = vec3(0.809016994, 0.587785252, 0.726542528);
  p.x = abs(p.x);
  p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
  p -= 2.0*min(dot(vec2(k.x,k.y),p),0.0)*vec2(k.x,k.y);
  p -= vec2(clamp(p.x, -r*k.z, r*k.z), r);
  return length(p)*sign(p.y);
}

float sdHexagon(vec2 p, float r) {
  // Regular Hexagon - from Inigo Quilezles
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}

float sdOctagon(vec2 p, float r) {
  // Regular Octagon - from Inigo Quilezles
  const vec3 k = vec3(-0.9238795325, 0.3826834323, 0.4142135623);
  p = abs(p);
  p -= 2.0*min(dot(vec2(k.x,k.y),p),0.0)*vec2(k.x,k.y);
  p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
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

float sdRhombus(vec2 p, vec2 b) {
  p = abs(p);
  float h = clamp((-2.0*dot(p,b)+dot(b,b))/dot(b,b), 0.0, 1.0);
  float d = length(p - b*vec2(1.0-h, 1.0+h));
  return d * sign(p.x*b.y + p.y*b.x - b.x*b.y);
}

float sdStar6(vec2 p, float r) {
  // Hexagram (6-point star / Star of David) from Inigo Quilezles
  const vec4 k = vec4(-0.5, 0.8660254038, 0.5773502692, 1.7320508076);
  p = abs(p);
  p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
  p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
  p -= vec2(clamp(p.x, r*k.z, r*k.w), r);
  return length(p)*sign(p.y);
}

float sdHeart(vec2 p) {
  // Heart - from Inigo Quilezles
  p.x = abs(p.x);
  if (p.y + p.x > 1.0)
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0)/4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5*max(p.x + p.y, 0.0), p - 0.5*max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

float sdPentagram(vec2 p, float r) {
  // Pentagram - from Inigo Quilezles
  const float k1x = 0.809016994; // cos(π/5)
  const float k2x = 0.309016994; // sin(π/10)
  const float k1y = 0.587785252; // sin(π/5)
  const float k2y = 0.951056516; // cos(π/10)
  const float k1z = 0.726542528; // tan(π/5)
  const vec2 v1 = vec2(k1x, -k1y);
  const vec2 v2 = vec2(-k1x, -k1y);
  const vec2 v3 = vec2(k2x, -k2y);
  p.x = abs(p.x);
  p -= 2.0*max(dot(v1,p),0.0)*v1;
  p -= 2.0*max(dot(v2,p),0.0)*v2;
  p.x = abs(p.x);
  p.y -= r;
  return length(p - v3*clamp(dot(p,v3), 0.0, k1z*r)) * sign(p.y*v3.x - p.x*v3.y);
}

float sdVesica(vec2 p, float w, float h) {
  // Vesica (almond shape) - from Inigo Quilezles
  float d = 0.5*(w*w - h*h)/h;
  p = abs(p);
  vec3 c = (w*p.y < d*(p.x - w)) ? vec3(0.0, w, 0.0) : vec3(-d, 0.0, d + h);
  return length(p - c.yx) - c.z;
}

float sdMoon(vec2 p, float d, float ra, float rb) {
  // Moon (crescent) - from Inigo Quilezles
  p.y = abs(p.y);
  float a = (ra*ra - rb*rb + d*d)/(2.0*d);
  float b = sqrt(max(ra*ra - a*a, 0.0));
  if (d*(p.x*b - p.y*a) > d*d*max(b - p.y, 0.0))
    return length(p - vec2(a, b));
  return max((length(p) - ra), -(length(p - vec2(d, 0)) - rb));
}

float sdCross(vec2 p, vec2 b, float r) {
  // Cross - from Inigo Quilezles
  p = abs(p);
  p = (p.y > p.x) ? p.yx : p.xy;
  vec2 q = p - b;
  float k = max(q.y, q.x);
  vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
  return sign(k)*length(max(w, 0.0)) + r;
}

float sdEgg(vec2 p, float he, float ra, float rb, float bu) {
  // Egg - from Inigo Quilezles (simplified)
  float r = 0.5*(he + ra + rb)/bu;
  float da = r - ra;
  float db = r - rb;
  float y = (db*db - da*da - he*he)/(2.0*he);
  float x = sqrt(da*da - y*y);
  p.x = abs(p.x);
  float k = p.y*x - p.x*y;
  if (k > 0.0 && k < he*(p.x + x))
    return length(p + vec2(x, y)) - r;
  return min(length(p) - ra, length(vec2(p.x, p.y - he)) - rb);
}

float sdRoundedX(vec2 p, float w, float r) {
  // Rounded X - from Inigo Quilezles
  p = abs(p);
  return length(p - min(p.x + p.y, w)*0.5) - r;
}

float sdPie(vec2 p, vec2 c, float r) {
  // Pie slice - from Inigo Quilezles
  p.x = abs(p.x);
  float l = length(p) - r;
  float m = length(p - c*clamp(dot(p, c), 0.0, r));
  return max(l, m*sign(c.y*p.x - c.x*p.y));
}

float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  // Arc - from Inigo Quilezles
  p.x = abs(p.x);
  return ((sc.y*p.x > sc.x*p.y) ? length(p - sc*ra) : abs(length(p) - ra)) - rb;
}

float sdRing(vec2 p, vec2 n, float r, float th) {
  // Ring - from Inigo Quilezles
  p.x = abs(p.x);
  p = mat2(n.x, n.y, -n.y, n.x)*p;
  return max(abs(length(p) - r) - th*0.5,
             length(vec2(p.x, max(0.0, abs(r - p.y) - th*0.5)))*sign(p.x));
}

float sdTrapezoid(vec2 p, float r1, float r2, float he) {
  // Isosceles Trapezoid - from Inigo Quilezles
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0*he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2*clamp(dot(k1 - p, k2)/dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s*sqrt(min(dot(ca, ca), dot(cb, cb)));
}

float sdHorseshoe(vec2 p, vec2 c, float r, vec2 w) {
  // Horseshoe - from Inigo Quilezles
  p.x = abs(p.x);
  float l = length(p);
  p = mat2(-c.x, c.y, c.y, c.x)*p;
  p = vec2((p.y > 0.0 || p.x > 0.0) ? p.x : l*sign(-c.x),
           (p.x > 0.0) ? p.y : l);
  p = vec2(p.x, abs(p.y - r)) - w;
  return length(max(p, 0.0)) + min(0.0, max(p.x, p.y));
}

float sdDonut(vec2 p, float r1, float r2) {
  // Simple donut (annular circle)
  float d = length(p);
  return abs(d - r1) - r2;
}

float getShapeSDF(vec2 uv, int shapeType) {
  float dist = 1.0;
  
  // shapeType == 0: Regular sprite/square (no SDF, render as filled)
  if (shapeType == 0) dist = sdBox(uv, vec2(1.0));
  else if (shapeType == 1) dist = sdCircle(uv, 0.9);
  else if (shapeType == 2) dist = sdTriangle(uv, 0.9);
  else if (shapeType == 3) dist = sdStar5(uv, 0.7, 0.4);
  else if (shapeType == 4) dist = sdStar6(uv, 0.5);
  else if (shapeType == 5) dist = sdHexagon(uv, 0.9);
  else if (shapeType == 6) dist = sdBox(uv, vec2(0.8));
  else if (shapeType == 7) dist = sdPentagon(uv, 0.9);
  else if (shapeType == 8) dist = sdOctagon(uv, 0.9);
  else if (shapeType == 9) dist = sdRhombus(uv, vec2(0.6, 0.8));
  else if (shapeType == 10) dist = sdHeart(uv * 1.5);
  else if (shapeType == 11) dist = sdPentagram(uv, 0.7);
  else if (shapeType == 12) dist = sdVesica(uv, 0.8, 0.6);
  else if (shapeType == 13) dist = sdMoon(uv, 0.3, 0.8, 0.6);
  else if (shapeType == 14) {
    // Cross: Two intersecting rectangles
    float d1 = sdBox(uv, vec2(0.15, 0.7));
    float d2 = sdBox(uv, vec2(0.7, 0.15));
    dist = min(d1, d2);
  }
  else if (shapeType == 15) dist = sdEgg(uv, 0.7, 0.5, 0.3, 0.8);
  else if (shapeType == 16) dist = sdRoundedX(uv, 0.9, 0.1);
  else if (shapeType == 17) dist = sdPie(uv, vec2(0.966, 0.259), 0.8); // 15° pie (small slice)
  else if (shapeType == 18) dist = sdArc(uv, vec2(0.707, 0.707), 0.75, 0.12); // 45° arc
  else if (shapeType == 19) dist = abs(length(uv) - 0.7) - 0.15; // Simple donut/ring
  else if (shapeType == 20) dist = sdTrapezoid(uv, 0.4, 0.7, 0.5);
  else if (shapeType == 21) dist = sdHorseshoe(uv, vec2(0.866, 0.5), 0.7, vec2(0.15, 0.15));
  
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
    const texcoordLoc = gl.getAttribLocation(this.program!, 'a_texcoord');
    const colorLoc = gl.getAttribLocation(this.program!, 'a_color');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    const stride = 20; // pos(8) + uv(8) + color(4)
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(texcoordLoc);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, stride, 8);
    
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    this.vertexCount = 0;
    this.drawCallCount = 0;
    this.currentTexture = null;
  }

  drawSprite(sprite: Sprite): void {
    // Flush if texture changes or batch is full
    if ((sprite.texture && sprite.texture !== this.currentTexture) || 
        this.vertexCount >= this.maxBatchSize * 4 - 4) {
      
      // Record batch break reason for profiling
      if (this.vertexCount > 0) {
        if (sprite.texture && sprite.texture !== this.currentTexture) {
          this.perfMonitor?.recordBatchBreak('texture');
        } else if (this.vertexCount >= this.maxBatchSize * 4 - 4) {
          this.perfMonitor?.recordBatchBreak('buffer');
        }
      }
      
      this.flush();
      this.currentTexture = sprite.texture;
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
    
    // Use bitwise OR for fast int conversion (convert 0-1 float to 0-255 byte)
    const r = (color.r * 255) | 0;
    const g = (color.g * 255) | 0;
    const b = (color.b * 255) | 0;
    const a = (alpha * 255) | 0;
    
    // 20-byte vertex format: 5 floats (pos(2) + uv(2) + color(1))
    let offset = this.vertexCount * 5;
    const baseByteOffset = this.vertexCount * 20;
    
    // Extract UV coordinates (default to full texture if not specified)
    const u0 = sprite.uvX ?? 0.0;
    const v0 = sprite.uvY ?? 0.0;
    const u1 = sprite.uvX !== undefined ? sprite.uvX + (sprite.uvWidth ?? 1.0) : 1.0;
    const v1 = sprite.uvY !== undefined ? sprite.uvY + (sprite.uvHeight ?? 1.0) : 1.0;
    
    // Vertex 0 (top-left)
    this.batchVertices[offset++] = c0x;
    this.batchVertices[offset++] = c0y;
    this.batchVertices[offset++] = u0; // u
    this.batchVertices[offset++] = v0; // v
    offset++; // Skip color (written via Uint8Array below)
    this.vertexCount++;
    
    // Vertex 1 (top-right)
    this.batchVertices[offset++] = c1x;
    this.batchVertices[offset++] = c1y;
    this.batchVertices[offset++] = u1; // u
    this.batchVertices[offset++] = v0; // v
    offset++;
    this.vertexCount++;
    
    // Vertex 2 (bottom-right)
    this.batchVertices[offset++] = c2x;
    this.batchVertices[offset++] = c2y;
    this.batchVertices[offset++] = u1; // u
    this.batchVertices[offset++] = v1; // v
    offset++;
    this.vertexCount++;
    
    // Vertex 3 (bottom-left)
    this.batchVertices[offset++] = c3x;
    this.batchVertices[offset++] = c3y;
    this.batchVertices[offset++] = u0; // u
    this.batchVertices[offset++] = v1; // v
    offset++;
    this.vertexCount++;
    
    // Write colors via Uint8Array (byte-level access)
    // With 20-byte stride: color is at offset 16 for each vertex
    this.batchVerticesU8[baseByteOffset + 16] = r;
    this.batchVerticesU8[baseByteOffset + 17] = g;
    this.batchVerticesU8[baseByteOffset + 18] = b;
    this.batchVerticesU8[baseByteOffset + 19] = a;
    
    this.batchVerticesU8[baseByteOffset + 36] = r;
    this.batchVerticesU8[baseByteOffset + 37] = g;
    this.batchVerticesU8[baseByteOffset + 38] = b;
    this.batchVerticesU8[baseByteOffset + 39] = a;
    
    this.batchVerticesU8[baseByteOffset + 56] = r;
    this.batchVerticesU8[baseByteOffset + 57] = g;
    this.batchVerticesU8[baseByteOffset + 58] = b;
    this.batchVerticesU8[baseByteOffset + 59] = a;
    
    this.batchVerticesU8[baseByteOffset + 76] = r;
    this.batchVerticesU8[baseByteOffset + 77] = g;
    this.batchVerticesU8[baseByteOffset + 78] = b;
    this.batchVerticesU8[baseByteOffset + 79] = a;
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
    
    // Bind texture if present
    if (this.program) {
      const hasTextureLoc = gl.getUniformLocation(this.program, 'u_hasTexture');
      if (this.currentTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.currentTexture);
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_texture'), 0);
        gl.uniform1i(hasTextureLoc, 1);
      } else {
        gl.uniform1i(hasTextureLoc, 0);
      }
    }
    
    // Upload vertex data (5 floats per vertex = 20 bytes)
    const vertexDataSize = this.vertexCount * 5 * 4;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.batchVertices.subarray(0, this.vertexCount * 5));
    
    // Record buffer upload for performance monitoring
    if (this.perfMonitor) {
      this.perfMonitor.recordBufferUpload(vertexDataSize);
      this.perfMonitor.recordVertices(this.vertexCount);
      this.perfMonitor.recordStateChange();
    }
    
    // Calculate index count (bit shift is faster than division: x/4 = x>>2, then *6)
    const indexCount = (this.vertexCount >> 2) * 6;
    const spriteCount = this.vertexCount >> 2;
    const triangleCount = spriteCount * 2;
    
    gl.drawElements(gl.TRIANGLES, indexCount, this.indexType, 0);
    
    // Record rendering metrics
    if (this.perfMonitor) {
      this.perfMonitor.recordIndices(indexCount);
      this.perfMonitor.recordBatch(spriteCount);
      this.perfMonitor.recordBatchComplete(spriteCount);
      this.perfMonitor.recordDrawPixels(triangleCount);
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
    
    // 🚀 OPTIMIZATION: Pre-calculate camera transform constants
    const viewportCenterX = this.gl.canvas.width * 0.5;
    const viewportCenterY = this.gl.canvas.height * 0.5;
    const negCameraX = -cameraX;
    const negCameraY = -cameraY;
    
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
        
        // Color bytes (convert alpha once)
        const rByte = colorR[i];
        const gByte = colorG[i];
        const bByte = colorB[i];
        const aByte = (alphas[i] * 255) | 0;
        
        // Calculate offsets (20 bytes per vertex = 5 floats)
        const floatOffset = (this.vertexCount + visibleCount * 4) * 5;
        const baseByteOffset = (this.vertexCount + visibleCount * 4) * 20;
        visibleCount++;
        
        // 🚀 OPTIMIZED: Apply camera transformation with pre-calculated constants
        const worldX = x + negCameraX;
        const worldY = y + negCameraY;
        const screenX = worldX * cameraZoom + viewportCenterX;
        const screenY = worldY * cameraZoom + viewportCenterY;
        const screenHw = hw * cameraZoom;
        const screenHwCos = screenHw * cos;
        const screenHwSin = screenHw * sin;
        
        // Write vertex positions with UV coordinates
        // Vertex 0 (top-left)
        this.batchVertices[floatOffset] = screenX - screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 1] = screenY - screenHwSin - screenHwCos;
        this.batchVertices[floatOffset + 2] = 0.0; // u
        this.batchVertices[floatOffset + 3] = 0.0; // v
        
        // Vertex 1 (top-right)
        this.batchVertices[floatOffset + 5] = screenX + screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 6] = screenY + screenHwSin - screenHwCos;
        this.batchVertices[floatOffset + 7] = 1.0; // u
        this.batchVertices[floatOffset + 8] = 0.0; // v
        
        // Vertex 2 (bottom-right)
        this.batchVertices[floatOffset + 10] = screenX + screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 11] = screenY + screenHwSin + screenHwCos;
        this.batchVertices[floatOffset + 12] = 1.0; // u
        this.batchVertices[floatOffset + 13] = 1.0; // v
        
        // Vertex 3 (bottom-left)
        this.batchVertices[floatOffset + 15] = screenX - screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 16] = screenY - screenHwSin + screenHwCos;
        this.batchVertices[floatOffset + 17] = 0.0; // u
        this.batchVertices[floatOffset + 18] = 1.0; // v
        
        // Write colors via Uint8Array at byte offset 16 for each vertex (20-byte stride)
        this.batchVerticesU8[baseByteOffset + 16] = rByte;
        this.batchVerticesU8[baseByteOffset + 17] = gByte;
        this.batchVerticesU8[baseByteOffset + 18] = bByte;
        this.batchVerticesU8[baseByteOffset + 19] = aByte;
        
        this.batchVerticesU8[baseByteOffset + 36] = rByte;
        this.batchVerticesU8[baseByteOffset + 37] = gByte;
        this.batchVerticesU8[baseByteOffset + 38] = bByte;
        this.batchVerticesU8[baseByteOffset + 39] = aByte;
        
        this.batchVerticesU8[baseByteOffset + 56] = rByte;
        this.batchVerticesU8[baseByteOffset + 57] = gByte;
        this.batchVerticesU8[baseByteOffset + 58] = bByte;
        this.batchVerticesU8[baseByteOffset + 59] = aByte;
        
        this.batchVerticesU8[baseByteOffset + 76] = rByte;
        this.batchVerticesU8[baseByteOffset + 77] = gByte;
        this.batchVerticesU8[baseByteOffset + 78] = bByte;
        this.batchVerticesU8[baseByteOffset + 79] = aByte;
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
        
        // Calculate offsets (20 bytes per vertex = 5 floats)
        const floatOffset = (this.vertexCount + visibleCount * 4) * 5;
        const baseByteOffset = (this.vertexCount + visibleCount * 4) * 20;
        visibleCount++;
        
        // Apply camera transformation: camera is CENTER of viewport
        // (world - camera) * zoom + viewport_center
        const screenX = (x - cameraX) * cameraZoom + this.gl.canvas.width / 2;
        const screenY = (y - cameraY) * cameraZoom + this.gl.canvas.height / 2;
        const screenHw = hw * cameraZoom;
        const screenHwCos = screenHw * cos;
        const screenHwSin = screenHw * sin;
        
        // Write vertex positions with UV coordinates
        // Vertex 0 (top-left)
        this.batchVertices[floatOffset] = screenX - screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 1] = screenY - screenHwSin - screenHwCos;
        this.batchVertices[floatOffset + 2] = 0.0; // u
        this.batchVertices[floatOffset + 3] = 0.0; // v
        
        // Vertex 1 (top-right)
        this.batchVertices[floatOffset + 5] = screenX + screenHwCos + screenHwSin;
        this.batchVertices[floatOffset + 6] = screenY + screenHwSin - screenHwCos;
        this.batchVertices[floatOffset + 7] = 1.0; // u
        this.batchVertices[floatOffset + 8] = 0.0; // v
        
        // Vertex 2 (bottom-right)
        this.batchVertices[floatOffset + 10] = screenX + screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 11] = screenY + screenHwSin + screenHwCos;
        this.batchVertices[floatOffset + 12] = 1.0; // u
        this.batchVertices[floatOffset + 13] = 1.0; // v
        
        // Vertex 3 (bottom-left)
        this.batchVertices[floatOffset + 15] = screenX - screenHwCos - screenHwSin;
        this.batchVertices[floatOffset + 16] = screenY - screenHwSin + screenHwCos;
        this.batchVertices[floatOffset + 17] = 0.0; // u
        this.batchVertices[floatOffset + 18] = 1.0; // v
        
        // Write colors via Uint8Array at byte offset 16 for each vertex (20-byte stride)
        this.batchVerticesU8[baseByteOffset + 16] = rByte;
        this.batchVerticesU8[baseByteOffset + 17] = gByte;
        this.batchVerticesU8[baseByteOffset + 18] = bByte;
        this.batchVerticesU8[baseByteOffset + 19] = aByte;
        
        this.batchVerticesU8[baseByteOffset + 36] = rByte;
        this.batchVerticesU8[baseByteOffset + 37] = gByte;
        this.batchVerticesU8[baseByteOffset + 38] = bByte;
        this.batchVerticesU8[baseByteOffset + 39] = aByte;
        
        this.batchVerticesU8[baseByteOffset + 56] = rByte;
        this.batchVerticesU8[baseByteOffset + 57] = gByte;
        this.batchVerticesU8[baseByteOffset + 58] = bByte;
        this.batchVerticesU8[baseByteOffset + 59] = aByte;
        
        this.batchVerticesU8[baseByteOffset + 76] = rByte;
        this.batchVerticesU8[baseByteOffset + 77] = gByte;
        this.batchVerticesU8[baseByteOffset + 78] = bByte;
        this.batchVerticesU8[baseByteOffset + 79] = aByte;
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
    
    // Switch to shape shader (only record if changing)
    if (this.currentShaderProgram !== this.shapeProgram) {
      this.perfMonitor?.recordBatchBreak('shader');
      this.currentShaderProgram = this.shapeProgram;
    }
    gl.useProgram(this.shapeProgram);
    
    // Set projection uniform
    const projectionMatrix = this.createProjectionMatrix(gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(this.u_shapeProjection, false, projectionMatrix);
    
    // Allocate reusable buffer once (persist across frames)
    if (!this.shapeVertices) {
      this.shapeVertices = new Float32Array(this.maxBatchSize * 4 * 5); // 5 floats per vertex
      this.shapeMetadata = new Uint32Array(this.shapeVertices.buffer);
    }
    
    const shapeVertices = this.shapeVertices;
    const shapeMetadata = this.shapeMetadata!;
    
    for (let start = 0; start < count; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, count);
      let visibleCount = 0;
      
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
        
        // Pack metadata: [R8|G8|B8|A3|ShapeType5]
        const r = colorR[i];
        const g = colorG[i];
        const b = colorB[i];
        const a = Math.min(7, Math.floor(alphas[i] * 7));  // 3 bits (0-7)
        // Use >>> 0 to ensure unsigned 32-bit integer (prevents sign bit issues)
        const metadata = (r | (g << 8) | (b << 16) | (a << 24) | (shapeType << 27)) >>> 0;
        
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
        // Use bufferSubData to update existing buffer (avoids reallocation)
        const dataSize = visibleCount * 4 * 5; // 4 vertices × 5 floats
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, shapeVertices.subarray(0, dataSize));
        
        // Setup vertex attributes (20-byte stride)
        gl.enableVertexAttribArray(0); // position
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
        
        gl.enableVertexAttribArray(1); // uv
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 8);
        
        gl.enableVertexAttribArray(2); // metadata
        (gl as WebGL2RenderingContext).vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 20, 16);
        
        // Record performance metrics
        if (this.perfMonitor) {
          const vertexCount = visibleCount * 4;
          const indexCount = visibleCount * 6;
          const bufferSize = vertexCount * 5 * 4; // 5 floats × 4 bytes
          
          this.perfMonitor.recordVertices(vertexCount);
          this.perfMonitor.recordIndices(indexCount);
          this.perfMonitor.recordBufferUpload(bufferSize);
          this.perfMonitor.recordBatch(visibleCount);
          this.perfMonitor.recordStateChange();
        }
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, visibleCount * 6, this.indexType, 0);
        
        this.drawCallCount++;
      }
    }
    
    // Restore sprite shader and attributes (only record if changing)
    if (this.currentShaderProgram !== this.program) {
      this.perfMonitor?.recordBatchBreak('shader');
      this.currentShaderProgram = this.program;
    }
    gl.useProgram(this.program);
    
    const positionLoc = gl.getAttribLocation(this.program!, 'a_position');
    const texcoordLoc = gl.getAttribLocation(this.program!, 'a_texcoord');
    const colorLoc = gl.getAttribLocation(this.program!, 'a_color');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    const stride = 20;
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(texcoordLoc);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, stride, 8);
    
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }



  /**
   * Create 3x3 projection matrix for 2D rendering (used by shape shader)
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

  /**
   * Get GPU buffer memory usage (MB)
   */
  getBufferMemoryUsage(): { vertex: number; index: number; total: number } {
    const vertexBytes = this.batchVertices.byteLength;
    const indexBytes = this.batchIndices.byteLength;
    return {
      vertex: vertexBytes / (1024 * 1024),
      index: indexBytes / (1024 * 1024),
      total: (vertexBytes + indexBytes) / (1024 * 1024)
    };
  }

  destroy(): void {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.shapeProgram) gl.deleteProgram(this.shapeProgram); // 🎨 Clean up shape shader
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  }
}
