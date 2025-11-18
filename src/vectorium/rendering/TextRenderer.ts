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
   * NOTE: Actual rendering must be done by caller using batch renderer
   */
  drawText(_text: string, _x: number, _y: number, _style?: TextStyle): void {
    if (!this.gl) return;
    
    // For now, this is a simplified stub
    // The actual implementation would rasterize text to texture and queue it
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
