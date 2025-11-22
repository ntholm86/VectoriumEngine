#version 300 es
precision highp float;

/**
 * 🎨 Shape Vertex Shader
 * 
 * Unified vertex format (20 bytes per vertex):
 * - position: vec2 (8 bytes)
 * - uv: vec2 (8 bytes) - reused for shape coordinates
 * - metadata: uint (4 bytes) - packed color + alpha + shapeType
 * 
 * Outputs:
 * - vColor: RGBA color (unpacked from metadata)
 * - vShapeUV: Shape-space coordinates [-1, 1]
 * - vShapeType: Shape type ID for fragment shader
 */

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aUV;
layout(location = 2) in uint aMetadata;

uniform mat3 uProjection;

out vec4 vColor;
out vec2 vShapeUV;
flat out int vShapeType;

void main() {
  // Project position to clip space
  vec3 projected = uProjection * vec3(aPosition, 1.0);
  gl_Position = vec4(projected.xy, 0.0, 1.0);
  
  // Unpack metadata: [R8|G8|B8|A4|ShapeType4]
  // - Bits 0-7: Red (8 bits)
  // - Bits 8-15: Green (8 bits)
  // - Bits 16-23: Blue (8 bits)
  // - Bits 24-27: Alpha (4 bits, 0-15 → 0.0-1.0)
  // - Bits 28-31: ShapeType (4 bits, 0-15 shapes)
  uint r = (aMetadata >> 0u) & 0xFFu;
  uint g = (aMetadata >> 8u) & 0xFFu;
  uint b = (aMetadata >> 16u) & 0xFFu;
  uint a = (aMetadata >> 24u) & 0xFu;
  uint shapeType = (aMetadata >> 28u) & 0xFu;
  
  vColor = vec4(
    float(r) / 255.0,
    float(g) / 255.0,
    float(b) / 255.0,
    float(a) / 15.0
  );
  
  // Pass UV coordinates for shape rendering
  // UV space: [0, 1] → [-1, 1] for centered shapes
  vShapeUV = aUV * 2.0 - 1.0;
  
  vShapeType = int(shapeType);
}
