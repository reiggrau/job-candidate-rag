uniform float uTime;
uniform float uBaseSpeed; // global speed multiplier

attribute vec3 aProperties; // aProperties: x = size, y = sin to cos relation, z = phase
attribute vec3 aColor;

varying vec3 vColor;

void main() {
  vColor      = aColor;

  float size = aProperties.x;
  float ratio = aProperties.y; // 0 (full sin, horizontal movement) → 1 (full cos, vertical movement)
  float phase = aProperties.z * 6.2832;

  float inv = 1.0 / size; // Speed is inversely proportional to size (heavyr particles move slower)
    
  vec3 animated = position;
  animated.x += sin(uTime * uBaseSpeed * inv * 0.0002 + phase) * 10.0 * (1.0 - ratio);
  animated.y += cos(uTime * uBaseSpeed * inv * 0.0002 + phase) * 10.0 * ratio;

  vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
  gl_Position  = projectionMatrix * mvPosition;
  gl_PointSize = size * (1.0 / -mvPosition.z);
}