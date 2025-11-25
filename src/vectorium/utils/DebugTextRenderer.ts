/**
 * DebugTextRenderer - Utility for rendering debug text samples
 * Shows various text rendering features for testing
 */

export class DebugTextRenderer {
  /**
   * Render comprehensive text samples showing all features
   */
  static renderSamples(textRenderer: any): void {
    const startX = 100;
    const startY = 100;
    const spacing = 60;
    
    // Column 1: Text effects
    textRenderer.drawText('Plain Text', startX, startY, { color: '#00FFFF', align: 'left', fontSize: 32 });
    textRenderer.drawText('Bold Text', startX, startY + spacing, { font: 'bold 32px Arial', color: '#FFFF00', align: 'left', fontSize: 32 });
    textRenderer.drawText('Italic Text', startX, startY + spacing * 2, { font: 'italic 32px Arial', color: '#FF00FF', align: 'left', fontSize: 32 });
    textRenderer.drawText('Shadow Text', startX, startY + spacing * 3, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 0, 0, 1.0)', blur: 6, offsetX: 4, offsetY: 4 }
    });
    textRenderer.drawText('Outline Text', startX, startY + spacing * 4, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4
    });
    textRenderer.drawText('Glow Text', startX, startY + spacing * 5, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    textRenderer.drawText('HEAVY EFFECTS', startX, startY + spacing * 6, { 
      font: 'bold italic 32px Arial', color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    textRenderer.drawText('L e t t e r   S p a c i n g', startX, startY + spacing * 7, { color: '#FFFFFF', align: 'left', fontSize: 32 });
    
    // Column 2: Static text (different rendering path)
    const staticX = startX + 700;
    textRenderer.drawText('Plain Text [STATIC]', staticX, startY, { color: '#FF8800', align: 'left', fontSize: 32 });
    textRenderer.drawText('Bold Text [STATIC]', staticX, startY + spacing, { font: 'bold 32px Arial', color: '#00FF00', align: 'left', fontSize: 32 });
    textRenderer.drawText('Italic Text [STATIC]', staticX, startY + spacing * 2, { font: 'italic 32px Arial', color: '#FF69B4', align: 'left', fontSize: 32 });
    textRenderer.drawText('Shadow Text [STATIC]', staticX, startY + spacing * 3, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 0, 0, 1.0)', blur: 6, offsetX: 4, offsetY: 4 }
    });
    textRenderer.drawText('Outline Text [STATIC]', staticX, startY + spacing * 4, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4
    });
    textRenderer.drawText('Glow Text [STATIC]', staticX, startY + spacing * 5, { 
      color: '#FFFFFF', align: 'left', fontSize: 32,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    textRenderer.drawText('HEAVY EFFECTS [STATIC]', staticX, startY + spacing * 6, { 
      font: 'bold italic 32px Arial', color: '#FFFFFF', align: 'left', fontSize: 32,
      strokeColor: '#00FFFF', strokeWidth: 4,
      shadow: { color: 'rgba(255, 255, 0, 1.0)', blur: 20, offsetX: 0, offsetY: 0 }
    });
    textRenderer.drawText('L e t t e r   S p a c i n g   [ S T A T I C ]', staticX, startY + spacing * 7, { color: '#FFFFFF', align: 'left', fontSize: 28 });
    textRenderer.drawText('Bacon ipsum short loin [STATIC]', staticX, startY + spacing * 8, { color: '#FFFFFF', align: 'left', fontSize: 24 });
    
    // Column 3: Alignment tests
    const alignX = startX + 400;
    textRenderer.drawText('Left Aligned', alignX, startY, { color: '#FFFFFF', align: 'left', fontSize: 32 });
    textRenderer.drawText('Center Aligned', alignX, startY + spacing, { color: '#FFFFFF', align: 'center', fontSize: 32 });
    textRenderer.drawText('Right Aligned', alignX, startY + spacing * 2, { color: '#FFFFFF', align: 'right', fontSize: 32 });
    textRenderer.drawText('Left Aligned [STATIC]', alignX, startY + spacing * 4.5, { color: '#FFFFFF', align: 'left', fontSize: 28 });
    textRenderer.drawText('Center Aligned [STATIC]', alignX, startY + spacing * 5.5, { color: '#FFFFFF', align: 'center', fontSize: 28 });
    textRenderer.drawText('Right Aligned [STATIC]', alignX, startY + spacing * 6.5, { color: '#FFFFFF', align: 'right', fontSize: 28 });
    textRenderer.drawText('Line 1 of text', alignX, startY + spacing * 3, { color: '#FFFFFF', align: 'left', fontSize: 32 });
    textRenderer.drawText('Line 2 of text', alignX, startY + spacing * 3 + 40, { color: '#FFFFFF', align: 'left', fontSize: 32 });
    textRenderer.drawText('Line 3 of text', alignX, startY + spacing * 3 + 80, { color: '#FFFFFF', align: 'left', fontSize: 32 });
    
    // Bottom: Long text samples
    textRenderer.drawText('Bacon ipsum dolor amet short loin pork chop turkey', 100, 580, { color: '#FFFFFF', align: 'left', fontSize: 28 });
    textRenderer.drawText('Ribeye bresaola ham hock hamburger porchetta', 100, 615, { color: '#FFFFFF', align: 'left', fontSize: 24 });
    textRenderer.drawText('Tri-tip chuck beef ribs meatloaf shoulder', 100, 645, { font: 'bold 20px Arial', color: '#FFFFFF', align: 'left', fontSize: 20 });
  }
}
