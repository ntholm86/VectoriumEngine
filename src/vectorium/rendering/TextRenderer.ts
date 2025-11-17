/**
 * Vectorium Engine - Text Renderer
 * Canvas2D-based text rendering overlay for WebGL canvas
 * Fully integrated with performance monitoring and adaptive quality
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
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private defaultStyle: Required<Omit<TextStyle, 'shadow' | 'strokeColor' | 'strokeWidth'>> & {
    shadow?: TextStyle['shadow'];
    strokeColor?: string;
    strokeWidth?: number;
  };
  private drawCallCount = 0;
  private resolutionScale = 1.0;
  private baseWidth: number;
  private baseHeight: number;

  constructor(width: number, height: number) {
    this.baseWidth = width;
    this.baseHeight = height;
    // Create overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.floor(width * this.resolutionScale);
    this.canvas.height = Math.floor(height * this.resolutionScale);
    this.canvas.style.position = 'absolute';
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.canvas.style.zIndex = '10';
    
    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context for text rendering');
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
   * Attach the text canvas overlay to a container element
   */
  attachTo(parent: HTMLElement): void {
    parent.style.position = 'relative';
    parent.appendChild(this.canvas);
  }

  /**
   * Begin text rendering frame (clear and reset counters)
   */
  begin(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawCallCount = 0;
  }

  /**
   * Clear the text canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw text on the overlay
   */
  drawText(text: string, x: number, y: number, style?: TextStyle): void {
    const ctx = this.ctx;
    
    // Apply resolution scaling to coordinates and font size
    const scaledX = x * this.resolutionScale;
    const scaledY = y * this.resolutionScale;
    const baseFontSize = style?.fontSize || this.defaultStyle.fontSize;
    const scaledFontSize = Math.floor(baseFontSize * this.resolutionScale);
    
    // Apply style
    const font = style?.font || `${scaledFontSize}px ${style?.fontFamily || this.defaultStyle.fontFamily}`;
    ctx.font = font;
    ctx.fillStyle = style?.color || this.defaultStyle.color;
    ctx.textAlign = style?.align || this.defaultStyle.align;
    ctx.textBaseline = style?.baseline || this.defaultStyle.baseline;

    // Apply shadow if specified
    if (style?.shadow) {
      ctx.shadowColor = style.shadow.color;
      ctx.shadowBlur = style.shadow.blur * this.resolutionScale;
      ctx.shadowOffsetX = style.shadow.offsetX * this.resolutionScale;
      ctx.shadowOffsetY = style.shadow.offsetY * this.resolutionScale;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw stroke if specified
    if (style?.strokeColor && style?.strokeWidth) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * this.resolutionScale;
      ctx.strokeText(text, scaledX, scaledY);
      this.drawCallCount++;
    }

    // Draw fill
    ctx.fillText(text, scaledX, scaledY);
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
   * Set resolution scale for adaptive quality
   */
  setResolutionScale(scale: number): void {
    if (scale === this.resolutionScale) return;
    
    this.resolutionScale = Math.max(0.1, Math.min(2.0, scale));
    
    // Resize canvas with new scale
    this.canvas.width = Math.floor(this.baseWidth * this.resolutionScale);
    this.canvas.height = Math.floor(this.baseHeight * this.resolutionScale);
    this.canvas.style.width = `${this.baseWidth}px`;
    this.canvas.style.height = `${this.baseHeight}px`;
  }

  /**
   * Get draw call count for performance monitoring
   */
  getDrawCallCount(): number {
    return this.drawCallCount;
  }

  /**
   * Resize the text canvas
   */
  resize(width: number, height: number): void {
    this.baseWidth = width;
    this.baseHeight = height;
    this.canvas.width = Math.floor(width * this.resolutionScale);
    this.canvas.height = Math.floor(height * this.resolutionScale);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * Get memory usage estimate (in MB)
   */
  getMemoryUsage(): number {
    // Canvas memory = width * height * 4 bytes per pixel (RGBA)
    const pixelCount = this.canvas.width * this.canvas.height;
    const bytes = pixelCount * 4;
    return bytes / (1024 * 1024);
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Destroy the text renderer
   */
  destroy(): void {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
