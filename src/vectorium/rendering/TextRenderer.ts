/**
 * Vectorium Engine - Text Renderer
 * WebGL-based text rendering using the main canvas
 * Text is rendered as textured quads through the batch renderer
 */

export interface TextStyle {
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic';
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export class TextRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private defaultStyle: Required<Omit<TextStyle, 'shadow' | 'strokeColor' | 'strokeWidth'>> & {
    shadow?: TextStyle['shadow'];
    strokeColor?: string;
    strokeWidth?: number;
  };
  private drawCallCount = 0;
  private textCache: Map<string, { texture: WebGLTexture; width: number; height: number }> = new Map();
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private batchRenderer: any = null; // WebGLBatchRenderer reference

  constructor(_width: number, _height: number) {
    // Create small offscreen canvas for text rasterization (NOT added to DOM)
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 512;
    this.offscreenCanvas.height = 128;
    
    const ctx = this.offscreenCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context for text rasterization');
    }
    this.ctx = ctx;

    // Default style
    this.defaultStyle = {
      font: '16px Arial',
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#FFFFFF',
      align: 'left',
      baseline: 'top'
    };
  }

  /**
   * Initialize with WebGL context (called by Engine)
   */
  setGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.gl = gl;
  }

  /**
   * Set batch renderer reference for rendering text quads
   */
  setBatchRenderer(renderer: any): void {
    this.batchRenderer = renderer;
  }

  /**
   * No-op for compatibility (no overlay canvas to attach)
   */
  attachTo(_parent: HTMLElement): void {
    // Text is now rendered directly on the WebGL canvas
  }

  /**
   * Begin text rendering frame (no-op, text batched with sprites)
   */
  begin(): void {
    this.drawCallCount = 0;
  }

  /**
   * Clear text cache (no canvas to clear)
   */
  clear(): void {
    // Text is rendered through batch renderer, no separate clear needed
  }

  /**
   * Draw text as textured quad (rendered through WebGL batch)
   * Fully integrated with the optimization pipeline
   */
  drawText(text: string, x: number, y: number, style?: TextStyle): void {
    if (!this.gl || !this.batchRenderer) return;
    
    const fontSize = style?.fontSize || this.defaultStyle.fontSize;
    const fontFamily = style?.fontFamily || this.defaultStyle.fontFamily;
    const color = style?.color || this.defaultStyle.color;
    const font = `${fontSize}px ${fontFamily}`;
    
    // Create cache key
    const cacheKey = `${text}_${font}_${color}`;
    
    // Check cache
    let textureInfo = this.textCache.get(cacheKey);
    
    if (!textureInfo) {
      // Set up canvas for text rendering
      this.ctx.font = font;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      
      // Measure text
      const metrics = this.ctx.measureText(text);
      const textWidth = Math.ceil(metrics.width) + 4;
      const textHeight = Math.ceil(fontSize * 1.5) + 4;
      
      // Resize canvas
      this.offscreenCanvas.width = Math.max(textWidth, 16);
      this.offscreenCanvas.height = Math.max(textHeight, 16);
      
      // Re-apply font after canvas resize
      this.ctx.font = font;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      
      // Clear background
      this.ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      
      // Draw text
      this.ctx.fillStyle = color;
      this.ctx.fillText(text, 2, 2);
      
      // Create WebGL texture
      const texture = this.gl.createTexture();
      if (!texture) return;
      
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        this.offscreenCanvas
      );
      
      // Set texture parameters for crisp text
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      
      // Cache texture info
      textureInfo = {
        texture,
        width: this.offscreenCanvas.width,
        height: this.offscreenCanvas.height
      };
      
      this.textCache.set(cacheKey, textureInfo);
      
      // Limit cache size
      if (this.textCache.size > 100) {
        const firstKey = this.textCache.keys().next().value as string;
        const oldTexture = this.textCache.get(firstKey);
        if (oldTexture && this.gl) {
          this.gl.deleteTexture(oldTexture.texture);
        }
        this.textCache.delete(firstKey);
      }
    }
    
    // Render text quad through batch renderer (uses same optimization pipeline as sprites)
    this.batchRenderer.drawSprite({
      x: x + textureInfo.width / 2,
      y: y + textureInfo.height / 2,
      width: textureInfo.width,
      height: textureInfo.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      texture: textureInfo.texture,
      color: { r: 1, g: 1, b: 1 }
    });
    
    this.drawCallCount++;
  }

  /**
   * Measure text width
   */
  measureText(text: string, style?: TextStyle): TextMetrics {
    const font = style?.font || `${style?.fontSize || this.defaultStyle.fontSize}px ${style?.fontFamily || this.defaultStyle.fontFamily}`;
    this.ctx.font = font;
    return this.ctx.measureText(text);
  }

  /**
   * Draw multi-line text
   */
  drawMultiLineText(text: string, x: number, y: number, lineHeight: number, style?: TextStyle): void {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.drawText(lines[i], x, y + i * lineHeight, style);
    }
  }

  /**
   * Set resolution scale (no-op, WebGL handles scaling)
   */
  setResolutionScale(_scale: number): void {
    // No-op: resolution scaling handled by WebGL viewport
  }

  /**
   * Get draw call count
   */
  getDrawCallCount(): number {
    return this.drawCallCount;
  }

  /**
   * Resize (no-op, uses main canvas)
   */
  resize(_width: number, _height: number): void {
    // No-op: dimensions managed by main canvas
  }

  /**
   * Get memory usage (minimal - just offscreen rasterization canvas)
   */
  getMemoryUsage(): number {
    const pixelCount = this.offscreenCanvas.width * this.offscreenCanvas.height;
    const bytes = pixelCount * 4;
    return bytes / (1024 * 1024);
  }

  /**
   * Get the canvas element (returns null, no overlay canvas)
   */
  getCanvas(): HTMLCanvasElement | null {
    return null;
  }

  /**
   * Destroy the text renderer
   */
  destroy(): void {
    // Clean up texture cache
    if (this.gl) {
      for (const cached of this.textCache.values()) {
        this.gl.deleteTexture(cached.texture);
      }
    }
    this.textCache.clear();
  }
}
