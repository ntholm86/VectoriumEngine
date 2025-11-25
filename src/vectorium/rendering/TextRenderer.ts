/**
 * Vectorium Engine - Text Renderer
 * WebGL-based text rendering using glyph atlas
 * Text is rendered as textured quads through the batch renderer
 */

import { GlyphAtlasGenerator, GlyphAtlas } from './GlyphAtlasGenerator';

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
  private glyphAtlas: GlyphAtlas | null = null;
  private glyphAtlasTexture: WebGLTexture | null = null;
  private defaultStyle: Required<Omit<TextStyle, 'shadow' | 'strokeColor' | 'strokeWidth'>> & {
    shadow?: TextStyle['shadow'];
    strokeColor?: string;
    strokeWidth?: number;
  };
  private drawCallCount = 0;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private batchRenderer: any = null; // WebGLBatchRenderer reference
  private atlasReady = false;

  constructor(_width: number, _height: number) {
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
  async setGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): Promise<void> {
    this.gl = gl;
    
    // Generate glyph atlas (32px Arial - covers most common text sizes)
    const generator = new GlyphAtlasGenerator(32, 'Arial');
    this.glyphAtlas = await generator.generate();
    
    // Upload atlas to GPU
    const texture = gl.createTexture();
    if (!texture) throw new Error('Failed to create glyph atlas texture');
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.glyphAtlas.texture
    );
    
    // Texture parameters for crisp text
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    this.glyphAtlasTexture = texture;
    this.atlasReady = true;
    
    console.log(`✅ Glyph atlas loaded: ${this.glyphAtlas.glyphs.size} glyphs, ${this.glyphAtlas.atlasWidth}x${this.glyphAtlas.atlasHeight}`);
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
   * Draw text using glyph atlas (rendered through WebGL batch)
   * Each character becomes a quad with UV coords from the atlas
   * ALL text shares ONE texture = minimal draw calls!
   */
  drawText(text: string, x: number, y: number, style?: TextStyle): void {
    if (!this.gl || !this.batchRenderer || !this.atlasReady || !this.glyphAtlas) return;
    
    const color = style?.color || this.defaultStyle.color;
    const align = style?.align || 'left';
    
    // Parse color (support hex format)
    let r = 1, g = 1, b = 1;
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
    
    // Calculate text width for alignment
    let textWidth = 0;
    for (const char of text) {
      const glyph = this.glyphAtlas.glyphs.get(char);
      if (glyph) textWidth += glyph.advance;
    }
    
    // Adjust starting X based on alignment
    let cursorX = x;
    if (align === 'center') {
      cursorX -= textWidth / 2;
    } else if (align === 'right') {
      cursorX -= textWidth;
    }
    
    // Render each character as a quad using atlas UVs
    for (const char of text) {
      const glyph = this.glyphAtlas.glyphs.get(char);
      if (!glyph) {
        cursorX += this.glyphAtlas.fontSize * 0.3; // Space for missing glyphs
        continue;
      }
      // Render this character as a quad with atlas UVs
      this.batchRenderer.drawSprite({
        x: cursorX + glyph.width / 2,
        y: y + glyph.height / 2 + glyph.offsetY,
        width: glyph.width,
        height: glyph.height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        texture: this.glyphAtlasTexture,
        color: { r, g, b },
        // Use glyph's UV coordinates in the atlas
        uvX: glyph.uvX,
        uvY: glyph.uvY,
        uvWidth: glyph.uvWidth,
        uvHeight: glyph.uvHeight
      });
      
      // Advance cursor
      cursorX += glyph.advance;
    }
    
    this.drawCallCount++;
  }

  /**
   * Measure text width using glyph atlas
   */
  measureText(text: string, _style?: TextStyle): { width: number } {
    if (!this.glyphAtlas) return { width: 0 };
    
    let width = 0;
    for (const char of text) {
      const glyph = this.glyphAtlas.glyphs.get(char);
      if (glyph) width += glyph.advance;
    }
    
    return { width };
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
   * Get memory usage (glyph atlas texture)
   */
  getMemoryUsage(): number {
    if (!this.glyphAtlas) return 0;
    const pixels = this.glyphAtlas.atlasWidth * this.glyphAtlas.atlasHeight;
    const bytes = pixels * 4; // RGBA
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
    // Clean up glyph atlas texture
    if (this.gl && this.glyphAtlasTexture) {
      this.gl.deleteTexture(this.glyphAtlasTexture);
    }
    this.glyphAtlasTexture = null;
    this.glyphAtlas = null;
  }
}
