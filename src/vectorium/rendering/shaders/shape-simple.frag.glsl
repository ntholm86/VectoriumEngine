#version 300 es
precision highp float;

/**
 * 🚀 SIMPLE Shape Fragment Shader - Minimal GPU Usage
 * 
 * This is a test shader with ONLY circle rendering.
 * No complex SDF functions, minimal math operations.
 * 
 * Compare performance vs full SDF shader to measure GPU overhead.
 */

in vec4 vColor;
in vec2 vShapeUV;
flat in int vShapeType;

out vec4 fragColor;

void main() {
  // Simple circle distance: sqrt(x^2 + y^2) - radius
  float dist = length(vShapeUV) - 0.9;
  
  // Simple antialiasing (no fwidth, just fixed edge width)
  float alpha = 1.0 - smoothstep(-0.02, 0.02, dist);
  
  // Apply alpha to color
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  
  // Discard fully transparent pixels
  if (fragColor.a < 0.01) discard;
}
