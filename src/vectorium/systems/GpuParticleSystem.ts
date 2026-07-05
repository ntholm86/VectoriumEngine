/**
 * 🚀 GPU PARTICLE SYSTEM — WebGL2 Transform Feedback
 *
 * Particle state [x, y, vx, vy] lives permanently in GPU memory (ping-pong buffers).
 * Physics (gravity, integration, boundary bounce) runs in a vertex shader via
 * transform feedback. The render pass reads positions directly from the state
 * buffer as an instanced attribute (stride 16).
 *
 * Per-frame CPU cost: a handful of GL calls. Zero physics loop, zero position upload.
 *
 * Compare: the CPU BunnymarkParticleSystem spends ~8 ms physics + ~3.6 ms upload
 * at 3M particles (measured 2026-07-05); this system spends ~0 ms on both.
 *
 * Spawning writes new particles once into the current source buffer tail
 * (gl.bufferSubData of just the new range) — after that the GPU owns them.
 */

import type { IParticleSystem } from './IParticleSystem';

export interface GpuParticleConfig {
  maxParticles: number;
  canvasWidth: number;
  canvasHeight: number;
  gravity: number;          // pixels/sec²
  spriteWidth: number;
  spriteHeight: number;
  velocityRange: { min: number; max: number };
  restitution?: number;     // bounce energy retention, default 1.0
}

const FLOATS_PER_PARTICLE = 4; // x, y, vx, vy
const BYTES_PER_PARTICLE = FLOATS_PER_PARTICLE * 4;

export class GpuParticleSystem implements IParticleSystem {
  private gl: WebGL2RenderingContext;
  private config: GpuParticleConfig;

  public activeCount = 0;

  // Ping-pong state buffers (each holds [x,y,vx,vy] * maxParticles)
  private stateBuffers: [WebGLBuffer, WebGLBuffer];
  private updateVAOs: [WebGLVertexArrayObject, WebGLVertexArrayObject];
  private renderVAOs: [WebGLVertexArrayObject, WebGLVertexArrayObject];
  private transformFeedback: WebGLTransformFeedback;
  private current = 0; // index of the buffer holding current state

  private updateProgram: WebGLProgram;
  private renderProgram: WebGLProgram;
  private quadBuffer: WebGLBuffer;

  // Update uniforms
  private u_dt: WebGLUniformLocation | null;
  private u_gravity: WebGLUniformLocation | null;
  private u_bounds: WebGLUniformLocation | null;
  private u_restitution: WebGLUniformLocation | null;

  // Render uniforms
  private u_projection: WebGLUniformLocation | null;
  private u_size: WebGLUniformLocation | null;
  private u_texture: WebGLUniformLocation | null;

  private cachedProjection: Float32Array | null = null;
  private cachedCanvasWidth = -1;
  private cachedCanvasHeight = -1;

  // Spawn staging (reused, grown on demand)
  private spawnStaging: Float32Array = new Float32Array(0);

  private static readonly UPDATE_VS = `#version 300 es
    precision highp float;
    in vec4 a_state;              // x, y, vx, vy
    uniform float u_dt;
    uniform float u_gravity;
    uniform vec4 u_bounds;        // minX, maxX, minY, maxY
    uniform float u_restitution;
    out vec4 v_state;
    void main() {
      vec2 pos = a_state.xy;
      vec2 vel = a_state.zw;
      vel.y += u_gravity * u_dt;
      pos += vel * u_dt;
      if (pos.x < u_bounds.x || pos.x > u_bounds.y) {
        pos.x = clamp(pos.x, u_bounds.x, u_bounds.y);
        vel.x = -vel.x;
      }
      if (pos.y < u_bounds.z || pos.y > u_bounds.w) {
        pos.y = clamp(pos.y, u_bounds.z, u_bounds.w);
        vel.y = -vel.y * u_restitution;
      }
      v_state = vec4(pos, vel);
    }
  `;

  private static readonly UPDATE_FS = `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    void main() { fragColor = vec4(0.0); }
  `;

  private static readonly RENDER_VS = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 a_quadPos;   // -0.5..0.5 unit quad
    layout(location = 1) in vec2 a_position;  // instance position (from state buffer, stride 16)
    uniform mat3 u_projection;
    uniform vec2 u_size;                      // sprite width & height in pixels
    out vec2 v_texCoord;
    void main() {
      vec2 vertexPos = a_position + a_quadPos * u_size;
      gl_Position = vec4((u_projection * vec3(vertexPos, 1.0)).xy, 0.0, 1.0);
      v_texCoord = a_quadPos + 0.5;
    }
  `;

  private static readonly RENDER_FS = `#version 300 es
    precision mediump float;
    in vec2 v_texCoord;
    uniform sampler2D u_texture;
    out vec4 fragColor;
    void main() {
      fragColor = texture(u_texture, v_texCoord);
    }
  `;

  constructor(gl: WebGL2RenderingContext, config: GpuParticleConfig) {
    this.gl = gl;
    this.config = config;

    // --- Programs ---
    this.updateProgram = this.linkProgram(
      GpuParticleSystem.UPDATE_VS,
      GpuParticleSystem.UPDATE_FS,
      ['v_state'] // transform feedback varying
    );
    this.renderProgram = this.linkProgram(
      GpuParticleSystem.RENDER_VS,
      GpuParticleSystem.RENDER_FS
    );

    this.u_dt = gl.getUniformLocation(this.updateProgram, 'u_dt');
    this.u_gravity = gl.getUniformLocation(this.updateProgram, 'u_gravity');
    this.u_bounds = gl.getUniformLocation(this.updateProgram, 'u_bounds');
    this.u_restitution = gl.getUniformLocation(this.updateProgram, 'u_restitution');

    this.u_projection = gl.getUniformLocation(this.renderProgram, 'u_projection');
    this.u_size = gl.getUniformLocation(this.renderProgram, 'u_size');
    this.u_texture = gl.getUniformLocation(this.renderProgram, 'u_texture');

    // --- State buffers (allocated at max capacity, GPU-resident) ---
    const bytes = config.maxParticles * BYTES_PER_PARTICLE;
    this.stateBuffers = [gl.createBuffer()!, gl.createBuffer()!];
    for (const buf of this.stateBuffers) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_COPY);
      const err = gl.getError();
      if (err === gl.OUT_OF_MEMORY) {
        throw new Error(
          `GpuParticleSystem: VRAM allocation failed for ${config.maxParticles.toLocaleString()} particles ` +
          `(${(bytes / 1024 / 1024).toFixed(0)} MB per state buffer). This is the machine's real limit.`
        );
      }
    }

    // --- Quad geometry ---
    const quadVertices = new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
      -0.5,  0.5,
       0.5,  0.5,
    ]);
    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // --- Update VAOs: read full vec4 state from buffer i ---
    this.updateVAOs = [gl.createVertexArray()!, gl.createVertexArray()!];
    for (let i = 0; i < 2; i++) {
      gl.bindVertexArray(this.updateVAOs[i]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.stateBuffers[i]);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, BYTES_PER_PARTICLE, 0);
      gl.bindVertexArray(null);
    }

    // --- Render VAOs: quad + instanced position (xy of state, stride 16) from buffer i ---
    this.renderVAOs = [gl.createVertexArray()!, gl.createVertexArray()!];
    for (let i = 0; i < 2; i++) {
      gl.bindVertexArray(this.renderVAOs[i]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.stateBuffers[i]);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, BYTES_PER_PARTICLE, 0);
      gl.vertexAttribDivisor(1, 1);
      gl.bindVertexArray(null);
    }

    this.transformFeedback = gl.createTransformFeedback()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private linkProgram(vsSource: string, fsSource: string, tfVaryings?: string[]): WebGLProgram {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error('GpuParticleSystem VS compile error: ' + gl.getShaderInfoLog(vs));
    }
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error('GpuParticleSystem FS compile error: ' + gl.getShaderInfoLog(fs));
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    if (tfVaryings) {
      gl.transformFeedbackVaryings(program, tfVaryings, gl.SEPARATE_ATTRIBS);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('GpuParticleSystem link error: ' + gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  /**
   * Spawn particles in a burst — writes only the new range into the current
   * source buffer; after this the GPU owns the particles.
   */
  burst(count: number, centerX: number, centerY: number): void {
    const gl = this.gl;
    const toSpawn = Math.min(count, this.config.maxParticles - this.activeCount);
    if (toSpawn <= 0) return;

    if (this.spawnStaging.length < toSpawn * FLOATS_PER_PARTICLE) {
      this.spawnStaging = new Float32Array(toSpawn * FLOATS_PER_PARTICLE);
    }
    const staging = this.spawnStaging;
    const { max } = this.config.velocityRange;

    for (let i = 0, j = 0; i < toSpawn; i++, j += 4) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 10;
      staging[j] = centerX + Math.cos(angle) * radius;
      staging[j + 1] = centerY + Math.sin(angle) * radius;
      staging[j + 2] = Math.random() * max;
      staging[j + 3] = (Math.random() * max) - (max / 2);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.stateBuffers[this.current]);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      this.activeCount * BYTES_PER_PARTICLE,
      staging,
      0,
      toSpawn * FLOATS_PER_PARTICLE
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.activeCount += toSpawn;
  }

  /**
   * GPU physics step via transform feedback. ~0 ms CPU at any particle count.
   */
  update(dt: number): void {
    const count = this.activeCount;
    if (count === 0) return;

    const gl = this.gl;
    const src = this.current;
    const dst = 1 - src;
    const cfg = this.config;
    const halfW = cfg.spriteWidth / 2;
    const halfH = cfg.spriteHeight / 2;

    gl.useProgram(this.updateProgram);
    gl.uniform1f(this.u_dt, dt);
    gl.uniform1f(this.u_gravity, cfg.gravity);
    gl.uniform4f(
      this.u_bounds,
      halfW, cfg.canvasWidth - halfW,
      halfH, cfg.canvasHeight - halfH
    );
    gl.uniform1f(this.u_restitution, cfg.restitution ?? 1.0);

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindVertexArray(this.updateVAOs[src]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
    gl.bindBufferRange(
      gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.stateBuffers[dst],
      0, count * BYTES_PER_PARTICLE
    );

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();

    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);
    gl.disable(gl.RASTERIZER_DISCARD);

    this.current = dst;
  }

  /**
   * Render all particles in a single instanced draw straight from GPU state.
   */
  render(renderer: any, textureManager: any, _cameraX = 0, _cameraY = 0, _cameraZoom = 1): void {
    const count = this.activeCount;
    if (count === 0) return;

    const texture = textureManager.getTexture('/bunny.png');
    if (!texture?.glTexture) return;

    const gl = this.gl;
    const cfg = this.config;

    gl.useProgram(this.renderProgram);

    if (this.cachedCanvasWidth !== cfg.canvasWidth || this.cachedCanvasHeight !== cfg.canvasHeight) {
      this.cachedProjection = new Float32Array([
        2 / cfg.canvasWidth, 0, 0,
        0, -2 / cfg.canvasHeight, 0,
        -1, 1, 1
      ]);
      this.cachedCanvasWidth = cfg.canvasWidth;
      this.cachedCanvasHeight = cfg.canvasHeight;
    }
    gl.uniformMatrix3fv(this.u_projection, false, this.cachedProjection!);
    gl.uniform2f(this.u_size, cfg.spriteWidth, cfg.spriteHeight);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
    gl.uniform1i(this.u_texture, 0);

    gl.bindVertexArray(this.renderVAOs[this.current]);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);

    // Track metrics if the engine renderer carries a perf monitor
    const perfMonitor = renderer?.perfMonitor;
    if (perfMonitor?.recordDrawCall) {
      perfMonitor.recordDrawCall(count * 4, count * 2);
    }
  }

  clear(): void {
    this.activeCount = 0;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.stateBuffers[0]);
    gl.deleteBuffer(this.stateBuffers[1]);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.updateVAOs[0]);
    gl.deleteVertexArray(this.updateVAOs[1]);
    gl.deleteVertexArray(this.renderVAOs[0]);
    gl.deleteVertexArray(this.renderVAOs[1]);
    gl.deleteTransformFeedback(this.transformFeedback);
    gl.deleteProgram(this.updateProgram);
    gl.deleteProgram(this.renderProgram);
  }
}
