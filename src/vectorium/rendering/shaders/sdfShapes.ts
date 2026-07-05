/**
 * Shared SDF shape library (GLSL) — single source of truth for all shape
 * fragment shaders (legacy batch path in WebGLBatchRenderer and the
 * instanced path in InstancedShapeRenderer).
 *
 * Shape type IDs (must stay in sync with utils/ShapeType.ts):
 * 0=sprite/box, 1=circle, 2=triangle, 3=star5, 4=star6, 5=hexagon, 6=box,
 * 7=pentagon, 8=octagon, 9=rhombus, 10=heart, 11=pentagram, 12=vesica,
 * 13=moon, 14=cross, 15=egg, 16=roundedX, 17=pie, 18=arc, 19=ring,
 * 20=trapezoid, 21=horseshoe
 */
export const SDF_SHAPE_LIBRARY_GLSL = /* glsl */ `
const float PI = 3.14159265359;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdTriangle(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r/k;
  if (p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y)/2.0;
  p.x -= clamp(p.x, -2.0*r, 0.0);
  return -length(p)*sign(p.y);
}

float sdPentagon(vec2 p, float r) {
  const vec3 k = vec3(0.809016994, 0.587785252, 0.726542528);
  p.x = abs(p.x);
  p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
  p -= 2.0*min(dot(vec2(k.x,k.y),p),0.0)*vec2(k.x,k.y);
  p -= vec2(clamp(p.x, -r*k.z, r*k.z), r);
  return length(p)*sign(p.y);
}

float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}

float sdOctagon(vec2 p, float r) {
  const vec3 k = vec3(-0.9238795325, 0.3826834323, 0.4142135623);
  p = abs(p);
  p -= 2.0*min(dot(vec2(k.x,k.y),p),0.0)*vec2(k.x,k.y);
  p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}

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

float sdRhombus(vec2 p, vec2 b) {
  p = abs(p);
  float h = clamp((-2.0*dot(p,b)+dot(b,b))/dot(b,b), 0.0, 1.0);
  float d = length(p - b*vec2(1.0-h, 1.0+h));
  return d * sign(p.x*b.y + p.y*b.x - b.x*b.y);
}

float sdStar6(vec2 p, float r) {
  const vec4 k = vec4(-0.5, 0.8660254038, 0.5773502692, 1.7320508076);
  p = abs(p);
  p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
  p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
  p -= vec2(clamp(p.x, r*k.z, r*k.w), r);
  return length(p)*sign(p.y);
}

float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0)
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0)/4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5*max(p.x + p.y, 0.0), p - 0.5*max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

float sdPentagram(vec2 p, float r) {
  const float k1x = 0.809016994;
  const float k2x = 0.309016994;
  const float k1y = 0.587785252;
  const float k2y = 0.951056516;
  const float k1z = 0.726542528;
  const vec2 v1 = vec2(k1x, -k1y);
  const vec2 v2 = vec2(-k1x, -k1y);
  const vec2 v3 = vec2(k2x, -k2y);
  p.x = abs(p.x);
  p -= 2.0*max(dot(v1,p),0.0)*v1;
  p -= 2.0*max(dot(v2,p),0.0)*v2;
  p.x = abs(p.x);
  p.y -= r;
  return length(p - v3*clamp(dot(p,v3), 0.0, k1z*r)) * sign(p.y*v3.x - p.x*v3.y);
}

float sdVesica(vec2 p, float w, float h) {
  float d = 0.5*(w*w - h*h)/h;
  p = abs(p);
  vec3 c = (w*p.y < d*(p.x - w)) ? vec3(0.0, w, 0.0) : vec3(-d, 0.0, d + h);
  return length(p - c.yx) - c.z;
}

float sdMoon(vec2 p, float d, float ra, float rb) {
  p.y = abs(p.y);
  float a = (ra*ra - rb*rb + d*d)/(2.0*d);
  float b = sqrt(max(ra*ra - a*a, 0.0));
  if (d*(p.x*b - p.y*a) > d*d*max(b - p.y, 0.0))
    return length(p - vec2(a, b));
  return max((length(p) - ra), -(length(p - vec2(d, 0)) - rb));
}

float sdCross(vec2 p) {
  float d1 = sdBox(p, vec2(0.15, 0.7));
  float d2 = sdBox(p, vec2(0.7, 0.15));
  return min(d1, d2);
}

float sdEgg(vec2 p, float he, float ra, float rb, float bu) {
  float r = 0.5*(he + ra + rb)/bu;
  float da = r - ra;
  float db = r - rb;
  float y = (db*db - da*da - he*he)/(2.0*he);
  float x = sqrt(da*da - y*y);
  p.x = abs(p.x);
  float k = p.y*x - p.x*y;
  if (k > 0.0 && k < he*(p.x + x))
    return length(p + vec2(x, y)) - r;
  return min(length(p) - ra, length(vec2(p.x, p.y - he)) - rb);
}

float sdRoundedX(vec2 p, float w, float r) {
  p = abs(p);
  return length(p - min(p.x + p.y, w)*0.5) - r;
}

float sdPie(vec2 p, vec2 c, float r) {
  p.x = abs(p.x);
  float l = length(p) - r;
  float m = length(p - c*clamp(dot(p, c), 0.0, r));
  return max(l, m*sign(c.y*p.x - c.x*p.y));
}

float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y*p.x > sc.x*p.y) ? length(p - sc*ra) : abs(length(p) - ra)) - rb;
}

float sdRing(vec2 p, float r1, float r2) {
  float d = length(p);
  return abs(d - r1) - r2;
}

float sdTrapezoid(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0*he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2*clamp(dot(k1 - p, k2)/dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s*sqrt(min(dot(ca, ca), dot(cb, cb)));
}

float sdHorseshoe(vec2 p, vec2 c, float r, vec2 w) {
  p.x = abs(p.x);
  float l = length(p);
  p = mat2(-c.x, c.y, c.y, c.x)*p;
  p = vec2((p.y > 0.0 || p.x > 0.0) ? p.x : l*sign(-c.x),
           (p.x > 0.0) ? p.y : l);
  p = vec2(p.x, abs(p.y - r)) - w;
  return length(max(p, 0.0)) + min(0.0, max(p.x, p.y));
}

float getShapeSDF(vec2 uv, int shapeType) {
  float dist = 1.0;

  if (shapeType == 0) dist = sdBox(uv, vec2(1.0));
  else if (shapeType == 1) dist = sdCircle(uv, 0.9);
  else if (shapeType == 2) dist = sdTriangle(uv, 0.9);
  else if (shapeType == 3) dist = sdStar5(uv, 0.7, 0.4);
  else if (shapeType == 4) dist = sdStar6(uv, 0.5);
  else if (shapeType == 5) dist = sdHexagon(uv, 0.9);
  else if (shapeType == 6) dist = sdBox(uv, vec2(0.8));
  else if (shapeType == 7) dist = sdPentagon(uv, 0.9);
  else if (shapeType == 8) dist = sdOctagon(uv, 0.9);
  else if (shapeType == 9) dist = sdRhombus(uv, vec2(0.6, 0.8));
  else if (shapeType == 10) dist = sdHeart(uv * 1.5);
  else if (shapeType == 11) dist = sdPentagram(uv, 0.7);
  else if (shapeType == 12) dist = sdVesica(uv, 0.8, 0.6);
  else if (shapeType == 13) dist = sdMoon(uv, 0.3, 0.8, 0.6);
  else if (shapeType == 14) dist = sdCross(uv);
  else if (shapeType == 15) dist = sdEgg(uv, 0.7, 0.5, 0.3, 0.8);
  else if (shapeType == 16) dist = sdRoundedX(uv, 0.9, 0.1);
  else if (shapeType == 17) dist = sdPie(uv, vec2(0.966, 0.259), 0.8);
  else if (shapeType == 18) dist = sdArc(uv, vec2(0.707, 0.707), 0.75, 0.12);
  else if (shapeType == 19) dist = sdRing(uv, 0.7, 0.15);
  else if (shapeType == 20) dist = sdTrapezoid(uv, 0.4, 0.7, 0.5);
  else if (shapeType == 21) dist = sdHorseshoe(uv, vec2(0.866, 0.5), 0.7, vec2(0.15, 0.15));

  return dist;
}
`;
