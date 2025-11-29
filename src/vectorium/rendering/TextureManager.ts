/**
 * Vectorium TextureManager - Phase 1
 * Manages GPU textures, sprite atlases, and UV coordinates
 * 
 * Features:
 * - Integer UV coordinates (Uint16Array, 0-65535)
 * - Texture atlas support (JSON + PNG)
 * - Automatic texture caching
 * - Batch-friendly texture IDs
 * 
 * Performance:
 * - 8 bytes per sprite (vs 16 bytes for Float32 UVs)
 * - Zero allocations after init
 * - Cache-friendly sequential IDs
 */

export interface Texture {
  id: number;
  glTexture: WebGLTexture;
  width: number;
  height: number;
  url: string;
}

export interface AtlasFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  textureId: number;
}

export interface AtlasData {
  frames: {
    [key: string]: {
      frame: { x: number; y: number; w: number; h: number };
      sourceSize?: { w: number; h: number };
      spriteSourceSize?: { x: number; y: number; w: number; h: number };
    };
  };
  meta?: {
    size?: { w: number; h: number };
  };
}

export class TextureManager {
  private gl: WebGL2RenderingContext;
  private textureCache = new Map<string, Texture>();
  private frameCache = new Map<string, Map<string, AtlasFrame>>();
  private textureById = new Map<number, Texture>();
  private nextTextureId = 1;
  
  // Active texture tracking for batch optimization
  private boundTextureId = -1;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Load a single texture from URL
   */
  async loadTexture(url: string): Promise<Texture> {
    // Check cache
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const glTexture = this.createGLTexture(img);
        
        const texture: Texture = {
          id: this.nextTextureId++,
          glTexture,
          width: img.width,
          height: img.height,
          url
        };
        
        this.textureCache.set(url, texture);
        this.textureById.set(texture.id, texture);
        
        console.log(`Loaded texture: ${url} (${img.width}×${img.height}) ID=${texture.id}`);
        resolve(texture);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load texture: ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Load sprite atlas (texture + JSON metadata)
   */
  async loadAtlas(textureUrl: string, jsonUrl: string): Promise<Map<string, AtlasFrame>> {
    // Check cache
    if (this.frameCache.has(textureUrl)) {
      return this.frameCache.get(textureUrl)!;
    }

    // Load texture
    const texture = await this.loadTexture(textureUrl);
    
    // Load JSON metadata
    const response = await fetch(jsonUrl);
    const data: AtlasData = await response.json();
    
    // Parse frames
    const frames = new Map<string, AtlasFrame>();
    
    for (const [name, frameData] of Object.entries(data.frames)) {
      const frame: AtlasFrame = {
        name,
        x: frameData.frame.x,
        y: frameData.frame.y,
        width: frameData.frame.w,
        height: frameData.frame.h,
        textureId: texture.id
      };
      
      frames.set(name, frame);
    }
    
    this.frameCache.set(textureUrl, frames);
    
    console.log(`Loaded atlas: ${textureUrl} (${frames.size} frames)`);
    return frames;
  }

  /**
   * Get texture by URL
   */
  getTexture(url: string): Texture | null {
    return this.textureCache.get(url) || null;
  }

  /**
   * Get texture by ID
   */
  getTextureById(id: number): Texture | null {
    return this.textureById.get(id) || null;
  }

  /**
   * Get frame from atlas
   */
  getFrame(atlasUrl: string, frameName: string): AtlasFrame | null {
    const frames = this.frameCache.get(atlasUrl);
    if (!frames) return null;
    return frames.get(frameName) || null;
  }

  /**
   * Get all frames from atlas
   */
  getAtlasFrames(atlasUrl: string): Map<string, AtlasFrame> | null {
    return this.frameCache.get(atlasUrl) || null;
  }

  /**
   * Normalize UV coordinates to Uint16 range (0-65535)
   */
  normalizeUV(value: number, textureSize: number): number {
    return Math.floor((value / textureSize) * 65535);
  }

  /**
   * Convert frame to normalized UV coordinates
   */
  frameToUV(frame: AtlasFrame, textureWidth: number, textureHeight: number): {
    u0: number; v0: number; u1: number; v1: number;
  } {
    const u0 = this.normalizeUV(frame.x, textureWidth);
    const v0 = this.normalizeUV(frame.y, textureHeight);
    const u1 = this.normalizeUV(frame.x + frame.width, textureWidth);
    const v1 = this.normalizeUV(frame.y + frame.height, textureHeight);
    
    // Flip V coordinates (OpenGL texture coordinates start at bottom-left)
    return { u0, v0: v1, u1, v1: v0 };
  }

  /**
   * Bind texture for rendering (with state caching)
   */
  bindTexture(textureId: number, unit: number = 0): void {
    if (this.boundTextureId === textureId) {
      return; // Already bound
    }
    
    const texture = this.textureById.get(textureId);
    if (!texture) {
      console.warn(`Texture ID ${textureId} not found`);
      return;
    }
    
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.glTexture);
    this.boundTextureId = textureId;
  }

  /**
   * Release texture from memory
   */
  releaseTexture(url: string): void {
    const texture = this.textureCache.get(url);
    if (!texture) return;
    
    this.gl.deleteTexture(texture.glTexture);
    this.textureCache.delete(url);
    this.textureById.delete(texture.id);
    
    // Clear atlas frames if this was an atlas
    this.frameCache.delete(url);
  }

  /**
   * Release all textures
   */
  releaseAll(): void {
    for (const texture of this.textureCache.values()) {
      this.gl.deleteTexture(texture.glTexture);
    }
    
    this.textureCache.clear();
    this.textureById.clear();
    this.frameCache.clear();
    this.boundTextureId = -1;
  }

  /**
   * Create WebGL texture from image
   */
  private createGLTexture(img: HTMLImageElement): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Upload texture data
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      img
    );
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Generate mipmaps if power of 2
    if (this.isPowerOf2(img.width) && this.isPowerOf2(img.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    return texture;
  }

  /**
   * Check if value is power of 2
   */
  private isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }

  /**
   * Get stats for debugging
   */
  getStats() {
    return {
      textureCount: this.textureCache.size,
      atlasCount: this.frameCache.size,
      totalFrames: Array.from(this.frameCache.values())
        .reduce((sum, frames) => sum + frames.size, 0)
    };
  }
}
