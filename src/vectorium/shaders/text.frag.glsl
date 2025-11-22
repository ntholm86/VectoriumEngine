#version 300 es
precision highp float;

/**
 * 🎨 Text Fragment Shader - Glyph Atlas + Effects
 * 
 * Renders text from glyph atlas texture with optional effects:
 * - Bold: Multi-sample blur for thickness
 * - Outline: Distance field edge detection
 * - Shadow: Offset sampling
 * - Glow: Radial blur
 * 
 * Performance:
 * - Base rendering: 1 texture sample (fastest)
 * - Bold: 5 samples (slight overhead)
 * - Outline: 9 samples (moderate overhead)
 * - Shadow: 2 samples (minimal overhead)
 * - Glow: 13 samples (expensive, use sparingly)
 */

in vec2 vUV;
in vec4 vColor;

uniform sampler2D uGlyphAtlas;
uniform int uEnableBold;
uniform int uEnableOutline;
uniform int uEnableShadow;
uniform int uEnableGlow;
uniform vec2 uTextureSize; // For pixel-perfect effects

out vec4 fragColor;

void main() {
  // Base glyph sample
  float alpha = texture(uGlyphAtlas, vUV).a;
  
  // Apply bold effect (multi-sample blur)
  if (uEnableBold > 0) {
    vec2 offset = 1.0 / uTextureSize;
    alpha += texture(uGlyphAtlas, vUV + vec2(offset.x, 0.0)).a * 0.25;
    alpha += texture(uGlyphAtlas, vUV - vec2(offset.x, 0.0)).a * 0.25;
    alpha += texture(uGlyphAtlas, vUV + vec2(0.0, offset.y)).a * 0.25;
    alpha += texture(uGlyphAtlas, vUV - vec2(0.0, offset.y)).a * 0.25;
    alpha = clamp(alpha, 0.0, 1.0);
  }
  
  // Apply outline effect (edge detection)
  if (uEnableOutline > 0) {
    vec2 offset = 1.5 / uTextureSize;
    float outline = 0.0;
    
    // 8-direction sampling for outline
    outline += texture(uGlyphAtlas, vUV + vec2(-offset.x, -offset.y)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(0.0, -offset.y)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(offset.x, -offset.y)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(-offset.x, 0.0)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(offset.x, 0.0)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(-offset.x, offset.y)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(0.0, offset.y)).a;
    outline += texture(uGlyphAtlas, vUV + vec2(offset.x, offset.y)).a;
    
    outline = clamp(outline * 0.125, 0.0, 1.0);
    
    // Mix outline with base
    if (alpha < 0.5 && outline > 0.0) {
      // Draw outline
      fragColor = vec4(0.0, 0.0, 0.0, outline * vColor.a);
      return;
    }
  }
  
  // Apply shadow effect (offset sample)
  if (uEnableShadow > 0 && alpha < 0.1) {
    vec2 shadowOffset = vec2(2.0, 2.0) / uTextureSize;
    float shadowAlpha = texture(uGlyphAtlas, vUV - shadowOffset).a;
    if (shadowAlpha > 0.1) {
      fragColor = vec4(0.0, 0.0, 0.0, shadowAlpha * 0.5 * vColor.a);
      return;
    }
  }
  
  // Apply glow effect (radial blur)
  if (uEnableGlow > 0) {
    vec2 offset = 2.0 / uTextureSize;
    float glow = alpha;
    
    // Radial samples for glow
    glow += texture(uGlyphAtlas, vUV + vec2(-offset.x * 2.0, 0.0)).a * 0.1;
    glow += texture(uGlyphAtlas, vUV + vec2(offset.x * 2.0, 0.0)).a * 0.1;
    glow += texture(uGlyphAtlas, vUV + vec2(0.0, -offset.y * 2.0)).a * 0.1;
    glow += texture(uGlyphAtlas, vUV + vec2(0.0, offset.y * 2.0)).a * 0.1;
    
    glow += texture(uGlyphAtlas, vUV + vec2(-offset.x * 3.0, 0.0)).a * 0.05;
    glow += texture(uGlyphAtlas, vUV + vec2(offset.x * 3.0, 0.0)).a * 0.05;
    glow += texture(uGlyphAtlas, vUV + vec2(0.0, -offset.y * 3.0)).a * 0.05;
    glow += texture(uGlyphAtlas, vUV + vec2(0.0, offset.y * 3.0)).a * 0.05;
    
    alpha = clamp(glow, 0.0, 1.0);
  }
  
  // Output final color
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  
  // Discard fully transparent pixels
  if (fragColor.a < 0.01) discard;
}
