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
  private glyphAtlases: Map<string, { atlas: GlyphAtlas; texture: WebGLTexture }> = new Map();
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
    
    // Generate glyph atlas variants (32px Arial)
    const variants = [
      { key: 'normal', font: '32px Arial' },
      { key: 'bold', font: 'bold 32px Arial' },
      { key: 'italic', font: 'italic 32px Arial' },
      { key: 'bold-italic', font: 'bold italic 32px Arial' }
    ];
    
    for (const variant of variants) {
      const generator = new GlyphAtlasGenerator(32, variant.font);
      const atlas = await generator.generate();
      
      const texture = gl.createTexture();
      if (!texture) throw new Error('Failed to create glyph atlas texture');
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      this.glyphAtlases.set(variant.key, { atlas, texture });
    }
    
    // Set default atlas
    const defaultAtlas = this.glyphAtlases.get('normal')!;
    this.glyphAtlas = defaultAtlas.atlas;
    this.glyphAtlasTexture = defaultAtlas.texture;
    
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
    
    console.log(`✅ Glyph atlases loaded: ${this.glyphAtlases.size} variants (normal, bold, italic, bold-italic)`);
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
  drawText(text: string, x: number, y: number, style?: TextStyle, rotation: number = 0, scale: number = 1): void {
    if (!this.gl || !this.batchRenderer || !this.atlasReady) return;
    
    const color = style?.color || this.defaultStyle.color;
    const align = style?.align || 'left';
    
    // Select atlas based on style
    const isBold = style?.font?.includes('bold') || false;
    const isItalic = style?.font?.includes('italic') || false;
    let atlasKey = 'normal';
    if (isBold && isItalic) atlasKey = 'bold-italic';
    else if (isBold) atlasKey = 'bold';
    else if (isItalic) atlasKey = 'italic';
    
    const atlasData = this.glyphAtlases.get(atlasKey);
    if (!atlasData) return;
    
    const currentAtlas = atlasData.atlas;
    const currentTexture = atlasData.texture;
    
    // Calculate text width for alignment
    let textWidth = 0;
    for (const char of text) {
      const glyph = currentAtlas.glyphs.get(char);
      if (glyph) textWidth += glyph.advance;
    }
    
    // Adjust starting X based on alignment
    let startX = 0; // Left align: text starts at X and extends right
    if (align === 'center') {
      startX = -textWidth / 2; // Center: text is centered on X
    } else if (align === 'right') {
      startX = -textWidth; // Right align: text ends at X and extends left
    }
    
    // Convert rotation to radians
    const rotRad = rotation * Math.PI / 180;
    const cosRot = Math.cos(rotRad);
    const sinRot = Math.sin(rotRad);
    
    // Helper to rotate and scale a point around origin
    const transformPoint = (px: number, py: number): { x: number; y: number } => {
      const scaledX = px * scale;
      const scaledY = py * scale;
      return {
        x: x + (scaledX * cosRot - scaledY * sinRot),
        y: y + (scaledX * sinRot + scaledY * cosRot)
      };
    };
    
    // Render shadow/glow first (behind text)
    if (style?.shadow) {
      // If blur is large, render multiple passes for glow effect
      if (style.shadow.blur && style.shadow.blur > 5) {
        const passes = Math.min(Math.floor(style.shadow.blur / 3), 8);
        for (let i = 0; i < passes; i++) {
          const t = (i + 1) / passes;
          const distance = t * style.shadow.blur * 0.5;
          // Exponential falloff for smoother glow
          const alpha = Math.pow(1 - t, 1.5) * 0.6;
          const glowScale = scale * (1 + t * 0.3); // Slightly enlarge for blur effect
          const angleStep = (Math.PI * 2) / 12; // 12 directions for smoother glow
          for (let j = 0; j < 12; j++) {
            const angle = j * angleStep;
            const ox = Math.cos(angle) * distance + style.shadow.offsetX;
            const oy = Math.sin(angle) * distance + style.shadow.offsetY;
            this.drawTextPass(text, x, y, this.fadeColor(style.shadow.color, alpha), align, rotation, glowScale,
                            ox, oy, startX, transformPoint, currentAtlas, currentTexture);
          }
        }
      } else {
        // Simple shadow
        this.drawTextPass(text, x, y, this.fadeColor(style.shadow.color, 0.7), align, rotation, scale, 
                          style.shadow.offsetX, style.shadow.offsetY, startX, transformPoint,
                          currentAtlas, currentTexture);
      }
    }
    
    // Render outline (if enabled)
    if (style?.strokeColor && style?.strokeWidth) {
      const outlineWidth = style.strokeWidth;
      // Use circular pattern for smoother outline
      const outlineSteps = 16; // More steps for smoother outline
      const outlineScale = scale * 1.05; // Slightly larger for outline effect
      for (let i = 0; i < outlineSteps; i++) {
        const angle = (i / outlineSteps) * Math.PI * 2;
        const ox = Math.cos(angle) * outlineWidth;
        const oy = Math.sin(angle) * outlineWidth;
        this.drawTextPass(text, x, y, this.fadeColor(style.strokeColor, 0.8), align, rotation, outlineScale,
                         ox, oy, startX, transformPoint, currentAtlas, currentTexture);
      }
    }
    
    // Render main text
    this.drawTextPass(text, x, y, color, align, rotation, scale, 0, 0, startX, transformPoint,
                     currentAtlas, currentTexture);
    
    this.drawCallCount++;
  }
  
  /**
   * Fade a color by reducing its alpha
   */
  private fadeColor(color: string, alphaMultiplier: number): string {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${alphaMultiplier})`);
    } else if (color.startsWith('#')) {
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alphaMultiplier})`;
    }
    return color;
  }
  
  /**
   * Internal: Draw text pass (used for main text, shadow, outline)
   */
  private drawTextPass(
    text: string, 
    _x: number, 
    _y: number, 
    color: string,
    _align: string,
    rotation: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    startX: number,
    transformPoint: (px: number, py: number) => { x: number; y: number },
    atlas: GlyphAtlas,
    texture: WebGLTexture
  ): void {
    // Parse color
    let r = 1, g = 1, b = 1, a = 1;
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    } else if (color.startsWith('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
      if (match) {
        r = parseInt(match[1]) / 255;
        g = parseInt(match[2]) / 255;
        b = parseInt(match[3]) / 255;
        a = match[4] ? parseFloat(match[4]) : 1;
      }
    }
    
    let cursorX = startX;
    
    // Render each character
    for (const char of text) {
      const glyph = atlas.glyphs.get(char);
      if (!glyph) {
        cursorX += atlas.fontSize * 0.3;
        continue;
      }
      
      // Character position relative to text origin
      // Use left edge of character, not center
      const charX = cursorX + offsetX;
      const charY = glyph.offsetY + offsetY;
      
      // Transform character position (top-left corner)
      const transformed = transformPoint(charX, charY);
      
      // Render character
      this.batchRenderer.drawSprite({
        x: transformed.x + glyph.width / 2,  // Center sprite on position
        y: transformed.y + glyph.height / 2, // Center sprite on position
        width: glyph.width,
        height: glyph.height,
        rotation: rotation,
        scaleX: scale,
        scaleY: scale,
        alpha: a,
        texture: texture,
        color: { r, g, b },
        uvX: glyph.uvX,
        uvY: glyph.uvY,
        uvWidth: glyph.uvWidth,
        uvHeight: glyph.uvHeight
      });
      
      cursorX += glyph.advance;
    }
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
  drawMultiLineText(text: string, x: number, y: number, lineHeight: number, style?: TextStyle, rotation: number = 0, scale: number = 1): void {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.drawText(lines[i], x, y + i * lineHeight, style, rotation, scale);
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
