uniform sampler2D uTexture;

varying vec3 vColor;

void main() {
  float alpha = texture2D(uTexture, gl_PointCoord).a;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vColor, alpha);
}