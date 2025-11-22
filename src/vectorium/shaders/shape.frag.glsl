#version 300 es
precision highp float;

/**
 * 🎨 Shape Fragment Shader - SDF-Based Rendering
 * 
 * Signed Distance Field (SDF) approach for GPU-accelerated shape rendering:
 * - Each shape is a mathematical function: distance = f(uv)
 * - Smooth antialiasing using fwidth() for pixel-perfect edges
 * - No texture lookups required (pure GPU math)
 * 
 * Performance: Faster than texture sampling for simple shapes
 * Quality: Perfect edges at any scale (infinite resolution)
 * 
 * Shape Types:
 * - 0: SPRITE (fallback to texture)
 * - 1: CIRCLE
 * - 2: TRIANGLE
 * - 3: STAR_5 (5-pointed star)
 * - 4: STAR_6 (6-pointed star)
 * - 5: HEXAGON
 * - 6: SQUARE
 * - 7: PENTAGON
 * - 8: OCTAGON
 * - 9: DIAMOND
 * - 10: HEART
 */

in vec4 vColor;
in vec2 vShapeUV;
flat in int vShapeType;

out vec4 fragColor;

// π for trig operations
const float PI = 3.14159265359;

/**
 * SDF: Circle
 * Returns signed distance to circle boundary
 */
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

/**
 * SDF: Box (Square)
 * Returns signed distance to box boundary
 */
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

/**
 * SDF: Equilateral Triangle
 * Returns signed distance to triangle boundary
 */
float sdTriangle(vec2 p) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - 1.0;
  p.y = p.y + 1.0 / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0, 0.0);
  return -length(p) * sign(p.y);
}

/**
 * SDF: Regular N-gon
 * Returns signed distance to polygon boundary
 */
float sdPolygon(vec2 p, float r, int n) {
  float an = PI / float(n);
  float en = PI / float(n);
  vec2 acs = vec2(cos(en), sin(en));
  
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p.y += clamp(-p.y, 0.0, r * acs.y);
  
  return length(p) * sign(p.x);
}

/**
 * SDF: 5-Pointed Star
 * Uses polar coordinates and 5-fold symmetry
 */
float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

/**
 * SDF: 6-Pointed Star (Star of David)
 * Two overlapping triangles
 */
float sdStar6(vec2 p, float r) {
  const float k = sqrt(3.0);
  p = abs(p);
  p -= vec2(clamp(p.x, -k * r, k * r), r);
  
  float d1 = length(p) * sign(p.y);
  
  p = vec2(p.x * k + p.y, -p.x + p.y * k) / 2.0;
  p -= vec2(clamp(p.x, -k * r, k * r), r);
  
  float d2 = length(p) * sign(p.y);
  
  return min(d1, d2);
}

/**
 * SDF: Heart
 * Parametric heart curve
 */
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  
  if (p.y + p.x > 1.0) {
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  }
  
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

/**
 * Get shape SDF based on type
 */
float getShapeSDF(vec2 uv, int shapeType) {
  float dist = 1.0;
  
  if (shapeType == 1) {
    // CIRCLE
    dist = sdCircle(uv, 0.9);
  }
  else if (shapeType == 2) {
    // TRIANGLE
    dist = sdTriangle(uv * 1.2);
  }
  else if (shapeType == 3) {
    // STAR_5
    dist = sdStar5(uv, 0.7, 0.4);
  }
  else if (shapeType == 4) {
    // STAR_6
    dist = sdStar6(uv, 0.5);
  }
  else if (shapeType == 5) {
    // HEXAGON
    dist = sdPolygon(uv, 0.9, 6);
  }
  else if (shapeType == 6) {
    // SQUARE
    dist = sdBox(uv, vec2(0.8));
  }
  else if (shapeType == 7) {
    // PENTAGON
    dist = sdPolygon(uv, 0.9, 5);
  }
  else if (shapeType == 8) {
    // OCTAGON
    dist = sdPolygon(uv, 0.9, 8);
  }
  else if (shapeType == 9) {
    // DIAMOND (rotated square)
    vec2 rotated = mat2(0.707, -0.707, 0.707, 0.707) * uv;
    dist = sdBox(rotated, vec2(0.7));
  }
  else if (shapeType == 10) {
    // HEART
    dist = sdHeart(uv * 1.5);
  }
  
  return dist;
}

void main() {
  // Get signed distance for shape
  float dist = getShapeSDF(vShapeUV, vShapeType);
  
  // Antialiasing: smooth edge based on pixel size
  float edge = fwidth(dist);
  float alpha = 1.0 - smoothstep(-edge, edge, dist);
  
  // Apply alpha to color
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  
  // Discard fully transparent pixels (optimization)
  if (fragColor.a < 0.01) discard;
}
