/**
 * 🎨 Glyph Atlas Generator
 * 
 * Generates a texture atlas containing font glyphs for efficient text rendering.
 * Industry-standard approach used by:
 * - PixiJS TextStyle
 * - Three.js TextGeometry
 * - Unity TextMeshPro
 * - Godot BitmapFont
 * 
 * Architecture:
 * 1. Render glyphs to offscreen canvas
 * 2. Pack into power-of-2 texture atlas
 * 3. Generate UV coordinates for each character
 * 4. Upload to GPU as single texture
 * 
 * Performance:
 * - 1 draw call per text batch (vs N draw calls for individual chars)
 * - GPU texture cache friendly
 * - ~512KB for 96 ASCII chars @ 32px font
 * 
 * Features:
 * - ASCII printable characters (32-126)
 * - Configurable font size
 * - Automatic atlas packing
 * - Efficient UV lookup
 */

export interface GlyphMetrics {
  x: number;          // X position in atlas (pixels)
  y: number;          // Y position in atlas (pixels)
  width: number;      // Glyph width (pixels)
  height: number;     // Glyph height (pixels)
  uvX: number;        // Normalized UV X (0-1)
  uvY: number;        // Normalized UV Y (0-1)
  uvWidth: number;    // Normalized UV width (0-1)
  uvHeight: number;   // Normalized UV height (0-1)
  advance: number;    // Horizontal advance for cursor positioning
  offsetY: number;    // Vertical offset from baseline
}

export interface GlyphAtlas {
  texture: ImageBitmap;
  glyphs: Map<string, GlyphMetrics>;
  fontSize: number;
  atlasWidth: number;
  atlasHeight: number;
  lineHeight: number;
}

export class GlyphAtlasGenerator {
  private canvas: OffscreenCanvas | HTMLCanvasElement;
  private ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  private fontSize: number;
  private fontFamily: string;
  private padding: number = 2; // Padding between glyphs to prevent bleeding
  
  constructor(fontSize: number = 32, fontFamily: string = 'Arial') {
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    
    // Use OffscreenCanvas if available (better performance)
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(1024, 1024);
      this.ctx = this.canvas.getContext('2d')!;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1024;
      this.canvas.height = 1024;
      this.ctx = this.canvas.getContext('2d')!;
    }
  }
  
  /**
   * Generate glyph atlas for ASCII printable characters (32-126)
   * @returns GlyphAtlas with texture and UV coordinates
   */
  async generate(): Promise<GlyphAtlas> {
    const glyphs = new Map<string, GlyphMetrics>();
    const fontSize = this.fontSize;
    const padding = this.padding;
    
    // Configure canvas
    this.ctx.font = `${fontSize}px ${this.fontFamily}`;
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = 'white';
    
    // Measure all glyphs first to calculate atlas size
    const charMetrics: Array<{ char: string; width: number; height: number }> = [];
    for (let code = 32; code <= 126; code++) {
      const char = String.fromCharCode(code);
      const metrics = this.ctx.measureText(char);
      const width = Math.ceil(metrics.width) + padding * 2;
      const height = fontSize + padding * 2;
      charMetrics.push({ char, width, height });
    }
    
    // Simple packing algorithm: row-based packing
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    const atlasWidth = 1024; // Power of 2 for GPU
    
    // Pack glyphs into atlas
    const packedGlyphs: Array<{ char: string; x: number; y: number; width: number; height: number }> = [];
    
    for (const { char, width, height } of charMetrics) {
      // Move to next row if current row is full
      if (x + width > atlasWidth) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }
      
      packedGlyphs.push({ char, x, y, width, height });
      
      x += width;
      rowHeight = Math.max(rowHeight, height);
      maxWidth = Math.max(maxWidth, x);
      maxHeight = Math.max(maxHeight, y + height);
    }
    
    // Round atlas height to power of 2
    const atlasHeight = Math.pow(2, Math.ceil(Math.log2(maxHeight)));
    
    // Resize canvas to final atlas size
    this.canvas.width = atlasWidth;
    this.canvas.height = atlasHeight;
    
    // Re-configure context after resize
    this.ctx.font = `${fontSize}px ${this.fontFamily}`;
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = 'white';
    
    // Clear canvas
    this.ctx.clearRect(0, 0, atlasWidth, atlasHeight);
    
    // Render glyphs to atlas
    for (const { char, x, y } of packedGlyphs) {
      this.ctx.fillText(char, x + padding, y + padding);
      
      // Calculate UV coordinates
      const metrics = this.ctx.measureText(char);
      const glyphWidth = Math.ceil(metrics.width);
      const glyphHeight = fontSize;
      
      glyphs.set(char, {
        x: x + padding,
        y: y + padding,
        width: glyphWidth,
        height: glyphHeight,
        uvX: (x + padding) / atlasWidth,
        uvY: (y + padding) / atlasHeight,
        uvWidth: glyphWidth / atlasWidth,
        uvHeight: glyphHeight / atlasHeight,
        advance: glyphWidth,
        offsetY: 0,
      });
    }
    
    // Convert canvas to ImageBitmap
    let texture: ImageBitmap;
    if (this.canvas instanceof OffscreenCanvas) {
      texture = await this.canvas.transferToImageBitmap();
    } else {
      texture = await createImageBitmap(this.canvas);
    }
    
    return {
      texture,
      glyphs,
      fontSize,
      atlasWidth,
      atlasHeight,
      lineHeight: fontSize * 1.2, // Standard line height
    };
  }
  
  /**
   * Generate atlas with custom character set
   */
  async generateCustom(_characters: string): Promise<GlyphAtlas> {
    // TODO: Implement custom character set support
    // For now, just generate full ASCII set
    return this.generate();
  }
  
  /**
   * Get estimated atlas memory usage (bytes)
   */
  getMemoryEstimate(atlasWidth: number, atlasHeight: number): number {
    // RGBA texture: 4 bytes per pixel
    return atlasWidth * atlasHeight * 4;
  }
}
