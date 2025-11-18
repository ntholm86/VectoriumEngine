/**
 * Vectorium Engine - Vertex Format Value Objects
 * Domain model for vertex data encoding/decoding
 * Follows SOLID, DDD, KISS principles
 */

/**
 * PackedColor - Value Object for RGBA color encoding
 * Encapsulates the bit-packing algorithm in one place
 * Immutable, self-documenting, testable
 */
export class PackedColor {
  private readonly value: number;
  
  private constructor(packedValue: number) {
    this.value = packedValue;
  }
  
  /**
   * Create from RGBA components (0-255 range)
   */
  static fromRGBA(r: number, g: number, b: number, a: number): PackedColor {
    // Validate and clamp to 0-255
    const rClamped = Math.max(0, Math.min(255, Math.round(r)));
    const gClamped = Math.max(0, Math.min(255, Math.round(g)));
    const bClamped = Math.max(0, Math.min(255, Math.round(b)));
    const aClamped = Math.max(0, Math.min(255, Math.round(a)));
    
    // Pack as 0xRRGGBBAA (little-endian byte order for Uint32Array)
    // When written to Uint32Array, bytes are: [R, G, B, A]
    const packed = (rClamped) | (gClamped << 8) | (bClamped << 16) | (aClamped << 24);
    return new PackedColor(packed >>> 0); // >>> 0 ensures unsigned
  }
  
  /**
   * Create from normalized RGBA components (0.0-1.0 range)
   */
  static fromNormalized(r: number, g: number, b: number, a: number): PackedColor {
    return PackedColor.fromRGBA(
      r * 255,
      g * 255,
      b * 255,
      a * 255
    );
  }
  
  /**
   * Create from Uint8 typed array values (ECS format)
   */
  static fromUint8Arrays(
    colorR: Uint8Array,
    colorG: Uint8Array,
    colorB: Uint8Array,
    alpha: number, // Normalized 0-1
    index: number
  ): PackedColor {
    return PackedColor.fromRGBA(
      colorR[index],
      colorG[index],
      colorB[index],
      Math.round(alpha * 255)
    );
  }
  
  /**
   * Get packed uint32 value for GPU transfer
   * This is the single source of truth for color encoding
   */
  toUint32(): number {
    return this.value;
  }
  
  /**
   * Unpack for debugging/testing
   */
  toRGBA(): { r: number; g: number; b: number; a: number } {
    return {
      r: this.value & 0xFF,
      g: (this.value >>> 8) & 0xFF,
      b: (this.value >>> 16) & 0xFF,
      a: (this.value >>> 24) & 0xFF
    };
  }
}

/**
 * VertexLayout - Value Object defining vertex structure
 * Single source of truth for vertex format
 * Makes stride/offset calculations explicit and type-safe
 */
export class VertexLayout {
  readonly floatsPerVertex: number;
  readonly bytesPerVertex: number;
  readonly positionOffset: number;
  readonly texCoordOffset: number;
  readonly colorOffset: number;
  
  constructor() {
    // Vertex format: position(2) + texCoord(2) + packedColor(1) = 5 floats
    this.floatsPerVertex = 5;
    this.bytesPerVertex = this.floatsPerVertex * 4; // 4 bytes per float
    
    // Explicit offsets (in float indices)
    this.positionOffset = 0;  // x, y at indices 0, 1
    this.texCoordOffset = 2;  // u, v at indices 2, 3
    this.colorOffset = 4;     // packed RGBA at index 4
  }
  
  /**
   * Calculate buffer offset for a vertex
   */
  getVertexOffset(vertexIndex: number): number {
    return vertexIndex * this.floatsPerVertex;
  }
  
  /**
   * Calculate color offset for a vertex (for Uint32Array writes)
   */
  getColorOffset(vertexIndex: number): number {
    return this.getVertexOffset(vertexIndex) + this.colorOffset;
  }
}

/**
 * VertexWriter - Writes vertex data using the layout
 * Separates "what" (layout) from "how" (writing)
 * Encapsulates Float32/Uint32 array view management
 */
export class VertexWriter {
  private readonly layout: VertexLayout;
  private readonly floatView: Float32Array;
  private readonly uint32View: Uint32Array;
  
  constructor(buffer: Float32Array) {
    this.layout = new VertexLayout();
    this.floatView = buffer;
    this.uint32View = new Uint32Array(buffer.buffer); // Shared buffer, different view
  }
  
  /**
   * Write a complete quad (4 vertices) with transformed positions
   * This is the hot path - optimized for minimal overhead
   */
  writeQuad(
    vertexIndex: number,
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    u0: number, v0: number,
    u1: number, v1: number,
    color: PackedColor
  ): void {
    const baseOffset = this.layout.getVertexOffset(vertexIndex);
    const packedColor = color.toUint32();
    
    // Vertex 0 (top-left)
    let offset = baseOffset;
    this.floatView[offset] = x0;
    this.floatView[offset + 1] = y0;
    this.floatView[offset + 2] = u0;
    this.floatView[offset + 3] = v0;
    this.uint32View[offset + 4] = packedColor;  // Same index in uint32 view
    
    // Vertex 1 (top-right)
    offset = baseOffset + this.layout.floatsPerVertex;
    this.floatView[offset] = x1;
    this.floatView[offset + 1] = y1;
    this.floatView[offset + 2] = u1;
    this.floatView[offset + 3] = v0;
    this.uint32View[offset + 4] = packedColor;
    
    // Vertex 2 (bottom-right)
    offset = baseOffset + this.layout.floatsPerVertex * 2;
    this.floatView[offset] = x2;
    this.floatView[offset + 1] = y2;
    this.floatView[offset + 2] = u1;
    this.floatView[offset + 3] = v1;
    this.uint32View[offset + 4] = packedColor;
    
    // Vertex 3 (bottom-left)
    offset = baseOffset + this.layout.floatsPerVertex * 3;
    this.floatView[offset] = x3;
    this.floatView[offset + 1] = y3;
    this.floatView[offset + 2] = u0;
    this.floatView[offset + 3] = v1;
    this.uint32View[offset + 4] = packedColor;
  }
  
  /**
   * Get the layout for attribute setup
   */
  getLayout(): VertexLayout {
    return this.layout;
  }
}

/**
 * ShaderCode - Value Object for shader source
 * Encapsulates unpacking algorithm that matches PackedColor encoding
 * Single source of truth for GPU-side color decoding
 */
export class ShaderCode {
  /**
   * Get GLSL code for unpacking colors
   * This MUST match PackedColor.fromRGBA() encoding exactly
   * Format: 0xRRGGBBAA (RGBA in little-endian byte order)
   */
  static getColorUnpackingGLSL(): string {
    return `
      // Unpack RGBA from uint32 (passed as float) - GLSL ES 1.00 compatible
      // Format: 0xRRGGBBAA (RGBA bytes in little-endian order)
      vec4 unpackColor(float packedColor) {
        float c = packedColor;
        float a = floor(c / 16777216.0);  // Extract A (>> 24)
        c = c - a * 16777216.0;
        float b = floor(c / 65536.0);     // Extract B (>> 16)
        c = c - b * 65536.0;
        float g = floor(c / 256.0);       // Extract G (>> 8)
        float r = c - g * 256.0;          // Extract R (& 0xFF)
        
        return vec4(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
      }
    `;
  }
  
  /**
   * Get complete vertex shader source
   */
  static getVertexShader(): string {
    return `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute float a_packedColor;
      
      uniform mat4 u_projection;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      ${ShaderCode.getColorUnpackingGLSL()}
      
      void main() {
        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = unpackColor(a_packedColor);
      }
    `;
  }
  
  /**
   * Get fragment shader source
   */
  static getFragmentShader(): string {
    return `
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
  }
}
