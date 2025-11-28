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
 * - 11: PENTAGRAM
 * - 12: VESICA
 * - 13: MOON
 * - 14: CROSS
 * - 15: EGG
 * - 16: ROUNDED_X
 * - 17: PIE
 * - 18: ARC
 * - 19: RING
 * - 20: TRAPEZOID
 * - 21: HORSESHOE
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
 * SDF: Pentagram (outlined star)
 * Star outline with inner pentagon
 */
float sdPentagram(vec2 p, float r) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * min(dot(k1, p), 0.0) * k1;
  p -= 2.0 * min(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  return length(p) - 0.1;
}

/**
 * SDF: Vesica (almond/eye shape)
 * Intersection of two circles
 */
float sdVesica(vec2 p, float r, float d) {
  p = abs(p);
  float b = sqrt(r * r - d * d);
  return ((p.y - b) * d > p.x * b) ? length(p - vec2(0.0, b)) : length(p - vec2(-d, 0.0)) - r;
}

/**
 * SDF: Moon (crescent)
 * Circle subtracted from circle
 */
float sdMoon(vec2 p, float d, float ra, float rb) {
  p.y = abs(p.y);
  float a = (ra * ra - rb * rb + d * d) / (2.0 * d);
  float b = sqrt(max(ra * ra - a * a, 0.0));
  if (d * (p.x * b - p.y * a) > d * d * max(b - p.y, 0.0))
    return length(p - vec2(a, b));
  return max((length(p) - ra), -(length(p - vec2(d, 0.0)) - rb));
}

/**
 * SDF: Cross
 * Two intersecting rectangles
 */
float sdCross(vec2 p, vec2 b, float r) {
  p = abs(p);
  p = (p.y > p.x) ? p.yx : p.xy;
  vec2 q = p - b;
  float k = max(q.y, q.x);
  vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
  return sign(k) * length(max(w, 0.0)) + r;
}

/**
 * SDF: Egg
 * Oval egg shape
 */
float sdEgg(vec2 p, float ra, float rb) {
  const float k = sqrt(3.0);
  p.x = abs(p.x);
  float r = ra - rb;
  return ((p.y < 0.0)       ? length(vec2(p.x,  p.y    )) - r :
          (k * (p.x + r) < p.y) ? length(vec2(p.x,  p.y - k * r)) :
                                  length(vec2(p.x + r, p.y    )) - 2.0 * r) - rb;
}

/**
 * SDF: Rounded X
 * Diagonal cross with rounded corners
 */
float sdRoundedX(vec2 p, float w, float r) {
  p = abs(p);
  return length(p - min(p.x + p.y, w) * 0.5) - r;
}

/**
 * SDF: Pie
 * Pie slice/wedge shape
 */
float sdPie(vec2 p, vec2 c, float r) {
  p.x = abs(p.x);
  float l = length(p) - r;
  float m = length(p - c * clamp(dot(p, c), 0.0, r));
  return max(l, m * sign(c.y * p.x - c.x * p.y));
}

/**
 * SDF: Arc
 * Curved arc segment
 */
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}

/**
 * SDF: Ring
 * Donut/ring shape
 */
float sdRing(vec2 p, float r, float thickness) {
  return abs(length(p) - r) - thickness;
}

/**
 * SDF: Trapezoid
 * Isosceles trapezoid
 */
float sdTrapezoid(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}

/**
 * SDF: Horseshoe
 * U-shaped curve
 */
float sdHorseshoe(vec2 p, vec2 c, float r, float w) {
  p.x = abs(p.x);
  float l = length(p);
  p = mat2(-c.x, c.y, c.y, c.x) * p;
  p = vec2((p.y > 0.0 || p.x > 0.0) ? p.x : l * sign(-c.x),
           (p.x > 0.0) ? p.y : l);
  p = vec2(p.x, abs(p.y - r)) - vec2(w, 0.0);
  return length(max(p, 0.0)) + min(0.0, max(p.x, p.y));
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
    // GLSL mat2 is column-major: mat2(col1_x, col1_y, col2_x, col2_y)
    // For 45° rotation: mat2(cos, sin, -sin, cos)
    vec2 rotated = mat2(0.707, 0.707, -0.707, 0.707) * uv;
    dist = sdBox(rotated, vec2(0.7));
  }
  else if (shapeType == 10) {
    // HEART
    dist = sdHeart(uv * 1.5);
  }
  else if (shapeType == 11) {
    // PENTAGRAM
    dist = sdPentagram(uv, 0.7);
  }
  else if (shapeType == 12) {
    // VESICA
    dist = sdVesica(uv, 0.9, 0.3);
  }
  else if (shapeType == 13) {
    // MOON
    dist = sdMoon(uv, 0.3, 0.8, 0.6);
  }
  else if (shapeType == 14) {
    // CROSS
    dist = sdCross(uv, vec2(0.7, 0.2), 0.05);
  }
  else if (shapeType == 15) {
    // EGG
    dist = sdEgg(uv, 0.7, 0.15);
  }
  else if (shapeType == 16) {
    // ROUNDED_X
    dist = sdRoundedX(uv, 1.2, 0.1);
  }
  else if (shapeType == 17) {
    // PIE
    dist = sdPie(uv, vec2(sin(0.6), cos(0.6)), 0.8);
  }
  else if (shapeType == 18) {
    // ARC
    dist = sdArc(uv, vec2(sin(0.5), cos(0.5)), 0.8, 0.15);
  }
  else if (shapeType == 19) {
    // RING
    dist = sdRing(uv, 0.7, 0.15);
  }
  else if (shapeType == 20) {
    // TRAPEZOID
    dist = sdTrapezoid(uv, 0.6, 0.4, 0.5);
  }
  else if (shapeType == 21) {
    // HORSESHOE
    dist = sdHorseshoe(uv, vec2(cos(1.0), sin(1.0)), 0.6, 0.15);
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
