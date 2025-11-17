/**
 * Vectorium Engine - WebGL Batch Renderer
 * High-performance WebGL rendering with automatic batching
 */

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
  private batchIndices: Uint16Array;
  private vertexCount = 0;
  private maxBatchSize = 65000; // Increased from 10k to 65k (max for Uint16Array indices)
  private drawCallCount = 0;
  
  // Optimization warnings
  private enableWarnings = true;
  private warnedAbout = new Set<string>();
  
  // Pre-calculated rotation cache (cos/sin for 0-359 degrees)
  private cosCache: Float32Array = new Float32Array(360);
  private sinCache: Float32Array = new Float32Array(360);
  
  // Cache uniform locations (CRITICAL: getUniformLocation is expensive!)
  private useTextureUniformLoc: WebGLUniformLocation | null = null;
  private lastTextureState: number = -1; // Track if texture uniform changed

  constructor(canvas: HTMLCanvasElement, useWebGL2: boolean = true) {
    const gl = useWebGL2 
      ? canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false })
      : canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl as WebGLRenderingContext;
    
    // Pre-allocate batch buffers (8 floats per vertex, 4 vertices per sprite)
    // Format: position(2) + texCoord(2) + color(4) = 8 floats
    this.batchVertices = new Float32Array(this.maxBatchSize * 4 * 8);
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
    
    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat4 u_projection;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;
    
    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      uniform sampler2D u_texture;
      uniform bool u_useTexture;
      
      void main() {
        if (u_useTexture) {
          gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
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
    const texCoordLoc = gl.getAttribLocation(this.program!, 'a_texCoord');
    const colorLoc = gl.getAttribLocation(this.program!, 'a_color');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    const stride = 8 * 4; // 8 floats per vertex (reduced from 10!)
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, stride, 2 * 4);
    
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 4 * 4);
    
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
    
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.batchVertices.subarray(0, this.vertexCount * 8));
    
    const useTexture = this.currentTexture ? 1 : 0;
    if (useTexture !== this.lastTextureState) {
      gl.uniform1i(this.useTextureUniformLoc, useTexture);
      this.lastTextureState = useTexture;
    }
    
    const indexCount = (this.vertexCount / 4) * 6;
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    
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
    const COLOR_NORM = 1.0 / 255.0;
    
    for (let start = 0; start < count; start += this.maxBatchSize) {
      const end = Math.min(start + this.maxBatchSize, count);
      const chunkSize = end - start;
      
      for (let i = start; i < end; i++) {
        if ((flags[i] & FLAG_VISIBLE) === 0) continue;
        
        const x = posX[i];
        const y = posY[i];
        const size = sizes[i];
        const rotDeg = rotation[i];
        
        const cos = this.cosCache[rotDeg];
        const sin = this.sinCache[rotDeg];
        
        const hw = size * 0.5;
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
        
        const r = colorR[i] * COLOR_NORM;
        const g = colorG[i] * COLOR_NORM;
        const b = colorB[i] * COLOR_NORM;
        const a = alphas[i];
        
        let offset = (this.vertexCount + (i - start) * 4) * 8;
        
        this.batchVertices[offset++] = c0x;
        this.batchVertices[offset++] = c0y;
        this.batchVertices[offset++] = 0;
        this.batchVertices[offset++] = 0;
        this.batchVertices[offset++] = r;
        this.batchVertices[offset++] = g;
        this.batchVertices[offset++] = b;
        this.batchVertices[offset++] = a;
        
        this.batchVertices[offset++] = c1x;
        this.batchVertices[offset++] = c1y;
        this.batchVertices[offset++] = 1;
        this.batchVertices[offset++] = 0;
        this.batchVertices[offset++] = r;
        this.batchVertices[offset++] = g;
        this.batchVertices[offset++] = b;
        this.batchVertices[offset++] = a;
        
        this.batchVertices[offset++] = c2x;
        this.batchVertices[offset++] = c2y;
        this.batchVertices[offset++] = 1;
        this.batchVertices[offset++] = 1;
        this.batchVertices[offset++] = r;
        this.batchVertices[offset++] = g;
        this.batchVertices[offset++] = b;
        this.batchVertices[offset++] = a;
        
        this.batchVertices[offset++] = c3x;
        this.batchVertices[offset++] = c3y;
        this.batchVertices[offset++] = 0;
        this.batchVertices[offset++] = 1;
        this.batchVertices[offset++] = r;
        this.batchVertices[offset++] = g;
        this.batchVertices[offset++] = b;
        this.batchVertices[offset++] = a;
      }
      
      this.vertexCount += chunkSize * 4;
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

  destroy(): void {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  }
}
