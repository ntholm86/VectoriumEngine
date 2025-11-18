/**
 * Vectorium Engine - GPU Rotation Vertex Format
 * Domain model for GPU-accelerated rotation rendering
 * 
 * SOLID: Single Responsibility - encapsulates GPU rotation vertex layout
 * DDD: Value Object - immutable layout configuration
 * YAGNI: Only what's needed - 6 floats per sprite instance
 * KISS: Simple data structure with clear offsets
 */

/**
 * VertexLayout for GPU-side rotation
 * Reduces data from 80 bytes (4 vertices) to 24 bytes (1 instance) per sprite
 */
export class GPURotationVertexLayout {
  // Instance data format: [posX, posY, halfWidth, halfHeight, rotation, packedColor]
  readonly floatsPerInstance: number = 6;
  readonly bytesPerInstance: number = 24; // 6 floats * 4 bytes
  
  // Float32Array offsets
  readonly positionOffset: number = 0;   // 2 floats (x, y)
  readonly sizeOffset: number = 2;       // 2 floats (halfWidth, halfHeight)
  readonly rotationOffset: number = 4;   // 1 float (radians)
  readonly colorOffset: number = 5;      // 1 float (packed RGBA as uint32)
  
  /**
   * Get stride in bytes for GPU attribute setup
   */
  getStride(): number {
    return this.bytesPerInstance;
  }
  
  /**
   * Get byte offset for position attribute
   */
  getPositionByteOffset(): number {
    return this.positionOffset * 4;
  }
  
  /**
   * Get byte offset for size attribute
   */
  getSizeByteOffset(): number {
    return this.sizeOffset * 4;
  }
  
  /**
   * Get byte offset for rotation attribute
   */
  getRotationByteOffset(): number {
    return this.rotationOffset * 4;
  }
  
  /**
   * Get byte offset for color attribute
   */
  getColorByteOffset(): number {
    return this.colorOffset * 4;
  }
  
  /**
   * Calculate buffer size needed for entity count
   */
  calculateBufferSize(entityCount: number): number {
    return entityCount * this.floatsPerInstance;
  }
}

/**
 * Shader source for GPU rotation rendering
 * Encapsulates vertex/fragment shader code
 */
export class GPURotationShaders {
  /**
   * Vertex shader with GPU-side rotation calculation
   * Transforms corner vertices using rotation matrix in shader
   */
  static getVertexShader(): string {
    return `
      // Per-vertex attributes (shared quad vertices)
      attribute vec2 a_corner; // (-1,-1), (1,-1), (1,1), (-1,1)
      
      // Per-instance attributes (one per sprite)
      attribute vec2 a_position;  // Center position (x, y)
      attribute vec2 a_size;      // Half-size (halfWidth, halfHeight)
      attribute float a_rotation; // Rotation in radians
      attribute vec4 a_color;     // Packed RGBA color
      
      uniform mat4 u_projection;
      
      varying vec4 v_color;
      varying vec2 v_texCoord;
      
      void main() {
        // GPU-side rotation calculation
        float c = cos(a_rotation);
        float s = sin(a_rotation);
        
        // Apply size to corner offset
        vec2 offset = a_corner * a_size;
        
        // Rotate offset around origin
        vec2 rotated = vec2(
          offset.x * c - offset.y * s,
          offset.x * s + offset.y * c
        );
        
        // Translate to final world position
        vec2 worldPos = a_position + rotated;
        gl_Position = u_projection * vec4(worldPos, 0.0, 1.0);
        
        // Texture coordinates: map corner (-1 to 1) to (0 to 1)
        v_texCoord = a_corner * 0.5 + 0.5;
        v_color = a_color;
      }
    `;
  }
  
  /**
   * Fragment shader (unchanged from standard renderer)
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

/**
 * Helper for building instance data from ECS arrays
 * Single Responsibility: Convert ECS data to GPU format
 */
export class GPURotationInstanceBuilder {
  private layout: GPURotationVertexLayout;
  
  constructor() {
    this.layout = new GPURotationVertexLayout();
  }
  
  /**
   * Write instance data to buffer
   * @param buffer Target Float32Array
   * @param offset Starting index in buffer
   * @param posX X position
   * @param posY Y position
   * @param halfWidth Half-width of sprite
   * @param halfHeight Half-height of sprite
   * @param rotation Rotation in radians
   * @param packedColor Packed RGBA as uint32
   * @returns Next offset index
   */
  writeInstance(
    buffer: Float32Array,
    offset: number,
    posX: number,
    posY: number,
    halfWidth: number,
    halfHeight: number,
    rotation: number,
    packedColor: number
  ): number {
    buffer[offset++] = posX;
    buffer[offset++] = posY;
    buffer[offset++] = halfWidth;
    buffer[offset++] = halfHeight;
    buffer[offset++] = rotation;
    
    // Write packed color as float (reinterpret uint32 bits)
    const view = new Uint32Array(buffer.buffer, (offset * 4), 1);
    view[0] = packedColor;
    offset++;
    
    return offset;
  }
  
  /**
   * Get floats per instance (for buffer allocation)
   */
  getFloatsPerInstance(): number {
    return this.layout.floatsPerInstance;
  }
}
