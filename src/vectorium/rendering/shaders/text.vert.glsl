#version 300 es
precision highp float;

/**
 * 🎨 Text Vertex Shader
 * 
 * Renders text quads using glyph atlas texture.
 * Each quad represents one character.
 * 
 * Vertex format (20 bytes):
 * - position: vec2 (8 bytes) - screen space position
 * - uv: vec2 (8 bytes) - glyph atlas UV coordinates
 * - metadata: uint (4 bytes) - packed color + alpha + effects
 * 
 * Metadata packing: [R8|G8|B8|A8]
 * Effects are handled in fragment shader via uniform flags
 */

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aUV;
layout(location = 2) in uint aMetadata;

uniform mat3 uProjection;

out vec2 vUV;
out vec4 vColor;

void main() {
  // Project position to clip space
  vec3 projected = uProjection * vec3(aPosition, 1.0);
  gl_Position = vec4(projected.xy, 0.0, 1.0);
  
  // Unpack metadata: [R8|G8|B8|A8]
  uint r = (aMetadata >> 0u) & 0xFFu;
  uint g = (aMetadata >> 8u) & 0xFFu;
  uint b = (aMetadata >> 16u) & 0xFFu;
  uint a = (aMetadata >> 24u) & 0xFFu;
  
  vColor = vec4(
    float(r) / 255.0,
    float(g) / 255.0,
    float(b) / 255.0,
    float(a) / 255.0
  );
  
  // Pass UV for glyph atlas sampling
  vUV = aUV;
}
