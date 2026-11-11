/* Lumen Drift — WebGL2 renderer: instanced glass road, HDR bloom, procedural sky. */
(function (root) {
  'use strict';
  const C = SIM.C, TL = C.TILE_L;

  const lin = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(v => Math.pow(v, 2.2)); };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const TYPE_COL = { B: lin('#2dff9a'), S: lin('#9a86c4'), R: lin('#3ac4ff'), X: lin('#ff2d3f'), J: lin('#ffe04a') };
  const TYPE_ID = { '#': 0, B: 1, S: 2, R: 3, X: 4, J: 5 };
  const VIEW_ROWS = 50, INST = 13, MAXP = 3000;

  /* ---------- shaders ---------- */
  const BEND = `
uniform vec3 uBend;
vec3 bend(vec3 p){ float d = max(p.z - uBend.z, 0.0); float d2 = d*d; p.x += uBend.x*d2; p.y -= uBend.y*d2; return p; }`;

  const FS_TRI = `#version 300 es
out vec2 vUV;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;

  const BG_FS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform vec2 uRes; uniform float uTime; uniform vec2 uPar;
uniform vec3 uTop, uBot, uNebA, uNebB, uSun; uniform vec4 uPlanet;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*noise(p); p = p*2.03+vec2(17.1, 9.2); a *= 0.5; } return s; }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;
  vec2 q = p + uPar;
  vec3 col = mix(uBot, uTop, smoothstep(-0.45, 0.55, p.y));
  vec2 n = q*1.5 + vec2(uTime*0.006, 0.0);
  float n1 = fbm(n + fbm(n*1.8 + 3.0)*0.8);
  float n2 = fbm(n*2.3 + vec2(7.3, -uTime*0.004));
  col += uNebA * pow(n1, 3.0) * 0.9;
  col += uNebB * pow(n2, 3.2) * 0.8;
  for (int i = 0; i < 3; i++) {
    float sc = 18.0 + float(i)*17.0;
    vec2 g = (p + uPar*(0.35 + 0.3*float(i)))*sc + float(i)*31.7;
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = h21(id);
    vec2 off = vec2(h21(id+3.1), h21(id+9.7)) - 0.5;
    float d = length(f - off*0.7);
    float s = smoothstep(0.015 + 0.06*h*h, 0.0, d) * step(0.78, h);
    s *= 0.65 + 0.35*sin(uTime*(1.0+h*3.0) + h*50.0);
    col += s * mix(vec3(1.0), uNebA*2.0 + 0.4, h21(id+1.7)) * (1.25 - 0.3*float(i));
  }
  // planet
  vec2 pc = q*0.25 + p*0.75 - uPlanet.xy; float r = uPlanet.z; float d = length(pc);
  vec3 ld = normalize(vec3(0.55, -0.35, 0.75));
  if (d < r) {
    vec3 nn = vec3(pc/r, sqrt(max(0.0, 1.0 - d*d/(r*r))));
    float lit = max(dot(nn, ld), 0.0);
    float bands = 0.6 + 0.4*sin(pc.y/r*14.0 + fbm(pc*9.0/r + 4.0)*4.0);
    vec3 pcol = mix(uNebB, uSun, 0.35 + 0.3*bands) * (0.04 + lit*0.55*bands);
    pcol += uNebA * pow(1.0 - nn.z, 3.0) * (0.25 + lit);
    col = mix(col, pcol, smoothstep(r, r - 0.004, d));
  }
  col += uNebA * exp(-max(d - r, 0.0)*26.0) * 0.22 * step(r, d);
  // ring
  vec2 rp = vec2(pc.x*0.96 + pc.y*0.28, (pc.y*0.96 - pc.x*0.28)*uPlanet.w);
  float rd = length(rp)/r;
  float ring = smoothstep(1.35, 1.42, rd)*smoothstep(2.1, 1.95, rd)*(0.55 + 0.45*sin(rd*46.0));
  float front = step(0.0, rp.y*-1.0);
  col += uSun * ring * 0.2 * ((d < r) ? front : 1.0);
  // horizon glow where the road vanishes
  vec2 hg = (p - vec2(0.0, -0.13))*vec2(0.5, 2.3);
  col += uSun * exp(-dot(hg, hg)*7.0) * 0.5;
  col += mix(uNebB, uSun, 0.5) * exp(-abs(p.y + 0.16)*5.5) * 0.14;
  o = vec4(col, 1.0);
}`;

  const COPY_FS = `#version 300 es
precision highp float; in vec2 vUV; out vec4 o; uniform sampler2D uTex;
void main(){ o = vec4(texture(uTex, vUV).rgb, 1.0); }`;

  const BOX_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUV;
layout(location=3) in vec3 iOff; layout(location=4) in vec3 iScale; layout(location=5) in vec3 iColor; layout(location=6) in vec4 iParam;
uniform mat4 uVP; uniform vec3 uCam;
${BEND}
out vec3 vN; out vec2 vUV; out vec3 vColor; out vec4 vParam; out vec2 vFace; out float vDist; out vec3 vView;
void main(){
  vec3 w = iOff + aPos*iScale;
  vec3 b = bend(w);
  gl_Position = uVP*vec4(b, 1.0);
  vN = aNrm; vUV = aUV; vColor = iColor; vParam = iParam;
  vec3 an = abs(aNrm);
  vFace = an.y > 0.5 ? iScale.xz : (an.x > 0.5 ? iScale.zy : iScale.xy);
  vDist = length(b - uCam); vView = uCam - b;
}`;

  const BOX_FS = `#version 300 es
precision highp float;
in vec3 vN; in vec2 vUV; in vec3 vColor; in vec4 vParam; in vec2 vFace; in float vDist; in vec3 vView;
uniform float uTime, uGlass, uFogK; uniform sampler2D uBg; uniform vec2 uRes;
out vec4 o;
void main(){
  int type = int(vParam.x + 0.5);
  float top = step(0.5, vN.y);
  vec2 dE = min(vUV, 1.0 - vUV)*vFace;
  float de = min(dE.x, dE.y);
  float aa = fwidth(de) + 1e-4;
  float lw = 0.035;
  float edge = (1.0 - smoothstep(lw, lw + aa, de)) * min(1.0, 2.5*lw/aa + 0.15);
  vec3 L = normalize(vec3(-0.35, 0.85, -0.4));
  float ndl = 0.35 + 0.65*max(dot(vN, L), 0.0);
  vec3 base = vColor, col, em = vec3(0.0);
  vec2 scr = gl_FragCoord.xy/uRes;
  if (type == 7) { col = base*0.25; em = base*vParam.z; }
  else if (type == 9) { col = base*0.035*ndl; em = base*edge*0.35; }
  else {
    col = base*mix(0.09, 0.17, top)*ndl;
    if (top < 0.5) col *= 0.45 + 0.75*vUV.y;
    em = base*edge*(1.0 + vParam.z);
    if (top > 0.5) {
      vec2 p = vUV*vFace; float t = uTime;
      if (type == 1) {
        float ph = fract(p.y*0.66 - abs(vUV.x - 0.5)*0.9 - t*2.2);
        em += base*smoothstep(0.0, 0.1, ph)*smoothstep(0.5, 0.4, ph)*1.5; col += base*0.12;
      } else if (type == 2) {
        vec2 g = fract(p*vec2(4.0, 2.0)) - 0.5;
        em += base*(1.0 - smoothstep(0.13, 0.2, length(g)))*0.55; col = base*0.07;
      } else if (type == 3) {
        float d = length((vUV - 0.5)*vFace);
        em += base*(0.35 + 0.9*(0.5 + 0.5*sin(d*8.0 - t*5.0)))*smoothstep(1.5, 0.2, d);
      } else if (type == 4) {
        vec2 w = p + vParam.y*13.0;
        float n = 0.5 + 0.5*sin(w.x*6.0 + t*3.1 + sin(w.y*3.0 - t*2.0)*1.5)*sin(w.y*4.0 - t*4.3);
        em += mix(base, vec3(1.0, 0.45, 0.12), n*n*0.75)*(0.3 + 0.75*n); col = base*0.12;
      } else if (type == 5) {
        float d = max(abs(vUV.x - 0.5), abs(vUV.y - 0.5))*2.0;
        float ph = fract(d*1.5 - t*1.6);
        em += base*(smoothstep(0.55, 0.95, ph)*1.3 + 0.25);
      } else {
        vec3 V = normalize(vView);
        float fres = pow(1.0 - max(V.y, 0.0), 4.0);
        vec3 refl = texture(uBg, vec2(scr.x, clamp(1.12 - scr.y, 0.0, 1.0))).rgb;
        col += refl*fres*0.4 + base*0.05*(1.0 - vUV.y);
      }
    }
  }
  vec3 c = col + em;
  float f = clamp(1.0 - exp(-pow(vDist*uFogK, 2.4)), 0.0, 1.0);
  vec3 bg = texture(uBg, scr).rgb;
  if (uGlass > 0.5) {
    float a = (0.14 + edge*0.86)*(1.0 - f);
    o = vec4((base*0.1*top + em*0.42 + base*0.03)*a, a*(0.3 + 0.45*edge));
  } else o = vec4(mix(c, bg, f), 1.0);
}`;

  const MESH_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol;
uniform mat4 uVP, uModel; uniform vec3 uCam;
${BEND}
out vec3 vN; out vec4 vCol; out vec3 vView;
void main(){
  vec3 w = bend((uModel*vec4(aPos, 1.0)).xyz);
  gl_Position = uVP*vec4(w, 1.0);
  vN = mat3(uModel)*aNrm; vCol = aCol; vView = uCam - w;
}`;
  const MESH_FS = `#version 300 es
precision highp float;
in vec3 vN; in vec4 vCol; in vec3 vView; out vec4 o;
uniform vec3 uTint, uSky; uniform float uGlow;
void main(){
  vec3 N = normalize(vN), V = normalize(vView), L = normalize(vec3(-0.4, 0.8, -0.45));
  float ndl = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 c = vCol.rgb*(0.16 + 0.84*ndl) + uSky*0.3*(0.5 + 0.5*N.y)*vCol.rgb + spec*0.45 + rim*uTint*0.45;
  c = mix(c, uTint*uGlow, vCol.a);
  o = vec4(c, 1.0);
}`;

  const PT_VS = `#version 300 es
layout(location=0) in vec4 aPos; layout(location=1) in vec4 aCol;
uniform mat4 uVP; uniform float uPx;
${BEND}
out vec4 vCol;
void main(){ gl_Position = uVP*vec4(bend(aPos.xyz), 1.0); gl_PointSize = clamp(aPos.w*uPx/max(gl_Position.w, 0.05), 1.0, 500.0); vCol = aCol; }`;
  const PT_FS = `#version 300 es
precision highp float; in vec4 vCol; out vec4 o;
void main(){ float d = length(gl_PointCoord - 0.5)*2.0; float a = max(1.0 - d, 0.0); o = vec4(vCol.rgb*vCol.a*a*a, 0.0); }`;

  const DECAL_VS = `#version 300 es
uniform mat4 uVP; uniform vec3 uCenter; uniform vec2 uSize;
${BEND}
out vec2 vP;
void main(){ vec2 q = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1))*2.0 - 1.0; vP = q;
  gl_Position = uVP*vec4(bend(uCenter + vec3(q.x*uSize.x, 0.0, q.y*uSize.y)), 1.0); }`;
  const DECAL_FS = `#version 300 es
precision highp float; in vec2 vP; out vec4 o; uniform vec3 uGlowCol; uniform float uShadow;
void main(){ float d = length(vP); float s = smoothstep(0.55, 0.2, d)*uShadow; float g = pow(max(1.0 - d, 0.0), 2.0);
  o = vec4(uGlowCol*g, s); }`;

  const PRE_FS = `#version 300 es
precision highp float; in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec3 c = (texture(uTex, vUV + uTexel*vec2(-1,-1)).rgb + texture(uTex, vUV + uTexel*vec2(1,-1)).rgb +
            texture(uTex, vUV + uTexel*vec2(-1,1)).rgb + texture(uTex, vUV + uTexel*vec2(1,1)).rgb)*0.25;
  float br = max(c.r, max(c.g, c.b));
  float k = clamp(br - 0.55, 0.0, 0.5); k = k*k/0.5;
  o = vec4(min(c*max(k, br - 0.8)/max(br, 1e-4), vec3(12.0)), 1.0);
}`;
  const DOWN_FS = `#version 300 es
precision highp float; in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec3 c = texture(uTex, vUV).rgb*4.0;
  c += texture(uTex, vUV + uTexel*vec2(-1,-1)).rgb + texture(uTex, vUV + uTexel*vec2(1,-1)).rgb;
  c += texture(uTex, vUV + uTexel*vec2(-1,1)).rgb + texture(uTex, vUV + uTexel*vec2(1,1)).rgb;
  o = vec4(c/8.0, 1.0);
}`;
  const UP_FS = `#version 300 es
precision highp float; in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec3 c = texture(uTex, vUV).rgb*4.0;
  c += (texture(uTex, vUV + uTexel*vec2(-1,0)).rgb + texture(uTex, vUV + uTexel*vec2(1,0)).rgb +
        texture(uTex, vUV + uTexel*vec2(0,-1)).rgb + texture(uTex, vUV + uTexel*vec2(0,1)).rgb)*2.0;
  c += texture(uTex, vUV + uTexel*vec2(-1,-1)).rgb + texture(uTex, vUV + uTexel*vec2(1,-1)).rgb +
       texture(uTex, vUV + uTexel*vec2(-1,1)).rgb + texture(uTex, vUV + uTexel*vec2(1,1)).rgb;
  o = vec4(c/16.0, 1.0);
}`;
  const COMP_FS = `#version 300 es
precision highp float; in vec2 vUV; out vec4 o;
uniform sampler2D uScene, uBloom; uniform float uCA, uTime, uFlash, uFade; uniform vec3 uFlashCol;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 d = vUV - 0.5; float r2 = dot(d, d);
  vec2 ca = d*uCA*(0.3 + r2*3.0);
  vec3 c = vec3(texture(uScene, vUV + ca).r, texture(uScene, vUV).g, texture(uScene, vUV - ca).b);
  c += texture(uBloom, vUV).rgb*0.85;
  c *= 1.15;
  c = (c*(2.51*c + 0.03))/(c*(2.43*c + 0.59) + 0.14);
  c = pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2));
  c *= 1.0 - r2*0.85;
  c = mix(c, uFlashCol, uFlash);
  c *= uFade;
  c += (h21(gl_FragCoord.xy + fract(uTime)*91.0) - 0.5)/128.0;
  o = vec4(c, 1.0);
}`;

  /* ---------- meshes ---------- */
  function cubeData() {
    const out = [];
    const faces = [ // normal, u axis, v axis
      [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [[1, 0, 0], [0, 0, 1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
    ];
    for (const [n, u, v] of faces) {
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
        for (let k = 0; k < 3; k++) out.push(n[k] * 0.5 + u[k] * (a - 0.5) + v[k] * (b - 0.5));
        out.push(n[0], n[1], n[2], a, b);
      }
    }
    return new Float32Array(out);
  }

  function meshBuilder(center) {
    const out = [];
    return {
      tri(a, b, c, col, em) {
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const len = Math.hypot(n[0], n[1], n[2]) || 1; n = n.map(v => v / len);
        const m = [(a[0] + b[0] + c[0]) / 3 - center[0], (a[1] + b[1] + c[1]) / 3 - center[1], (a[2] + b[2] + c[2]) / 3 - center[2]];
        if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) n = n.map(v => -v);
        for (const p of [a, b, c]) out.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], em || 0);
      },
      data: () => new Float32Array(out),
    };
  }

  function shipData() {
    const m = meshBuilder([0, 0.06, -0.05]);
    const hull = [0.4, 0.44, 0.54], hull2 = [0.17, 0.19, 0.26], dark = [0.02, 0.025, 0.05], g = [1, 1, 1];
    const N = [0, 0.04, 0.7], CF = [0, 0.13, 0.26], CT = [0, 0.23, -0.02], ST = [0, 0.17, -0.4];
    const SL = [-0.15, 0.09, 0.1], SR = [0.15, 0.09, 0.1], RL = [-0.19, 0.1, -0.4], RR = [0.19, 0.1, -0.4];
    const WL = [-0.46, 0.0, -0.44], WR = [0.46, 0.0, -0.44], BR = [0, -0.07, -0.36];
    m.tri(N, SR, CF, hull); m.tri(N, CF, SL, hull);
    m.tri(CF, SR, CT, dark); m.tri(CF, CT, SL, dark);
    m.tri(CT, SR, RR, hull); m.tri(CT, RR, ST, hull2); m.tri(CT, ST, RL, hull2); m.tri(CT, RL, SL, hull);
    m.tri(N, WR, SR, hull2); m.tri(SR, WR, RR, hull); m.tri(N, SL, WL, hull2); m.tri(SL, RL, WL, hull);
    m.tri(N, WR, BR, dark); m.tri(N, BR, WL, dark);
    m.tri(WL, RL, BR, dark); m.tri(RR, WR, BR, dark);
    m.tri(RL, ST, RR, g, 1); m.tri(RL, RR, BR, g, 1);
    for (const s of [-1, 1]) {       // wingtip fins + glowing leading strips
      const W = [0.46 * s, 0, -0.44];
      m.tri(W, [0.47 * s, 0.2, -0.5], [0.4 * s, 0.01, -0.12], hull);
      m.tri([0.3 * s, 0.045, -0.02], [0.43 * s, 0.02, -0.36], [0.36 * s, 0.03, -0.36], g, 1);
    }
    return m.data();
  }

  function shardData() {
    const m = meshBuilder([0, 0, 0]);
    const T = [0, 0.3, 0], B = [0, -0.3, 0], r = 0.17;
    const ring = [[r, 0, 0], [0, 0, r], [-r, 0, 0], [0, 0, -r]];
    for (let i = 0; i < 4; i++) {
      const a = ring[i], b = ring[(i + 1) % 4];
      m.tri(T, a, b, [1, 1, 1], i % 2 ? 0.85 : 0.55); m.tri(B, b, a, [1, 1, 1], i % 2 ? 0.55 : 0.85);
    }
    return m.data();
  }

  /* ---------- matrices (left-handed: +x right, +y up, +z forward) ---------- */
  function viewProj(eye, tgt, fovDeg, aspect, near, far) {
    let f = [tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]];
    const fl = Math.hypot(f[0], f[1], f[2]); f = f.map(v => v / fl);
    let r = [f[2], 0, -f[0]]; const rl = Math.hypot(r[0], r[2]); r = r.map(v => v / rl);   // cross(up, f)
    const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    const d = v => -(v[0] * eye[0] + v[1] * eye[1] + v[2] * eye[2]);
    const s = 1 / Math.tan(fovDeg * Math.PI / 360), A = (far + near) / (far - near), B = -2 * far * near / (far - near);
    const sx = s / aspect, tr = d(r), tu = d(u), tf = d(f);
    return new Float32Array([
      sx * r[0], s * u[0], A * f[0], f[0],
      sx * r[1], s * u[1], A * f[1], f[1],
      sx * r[2], s * u[2], A * f[2], f[2],
      sx * tr, s * tu, A * tf + B, tf,
    ]);
  }

  /* ---------- renderer ---------- */
  function create(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const hdr = !!gl.getExtension('EXT_color_buffer_float');
    const IF = hdr ? gl.RGBA16F : gl.RGBA8, TY = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

    function program(vs, fs) {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        gl.attachShader(p, sh);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
        const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    }
    const P = {
      bg: program(FS_TRI, BG_FS), copy: program(FS_TRI, COPY_FS), box: program(BOX_VS, BOX_FS),
      mesh: program(MESH_VS, MESH_FS), pt: program(PT_VS, PT_FS), decal: program(DECAL_VS, DECAL_FS),
      pre: program(FS_TRI, PRE_FS), down: program(FS_TRI, DOWN_FS), up: program(FS_TRI, UP_FS), comp: program(FS_TRI, COMP_FS),
    };

    const emptyVAO = gl.createVertexArray();
    const cubeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf); gl.bufferData(gl.ARRAY_BUFFER, cubeData(), gl.STATIC_DRAW);

    function boxVAO() {
      const vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (let i = 3; i <= 6; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribDivisor(i, 1); }
      gl.bindVertexArray(null);
      return { vao, buf, starts: null };
    }
    const opaque = boxVAO(), glass = boxVAO();

    function meshVAO(data) {
      const vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
      gl.bindVertexArray(null);
      return { vao, count: data.length / 10 };
    }
    const shipMesh = meshVAO(shipData()), shardMesh = meshVAO(shardData());

    const ptData = new Float32Array(MAXP * 8), ptVAO = gl.createVertexArray(), ptBuf = gl.createBuffer();
    gl.bindVertexArray(ptVAO); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferData(gl.ARRAY_BUFFER, ptData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    gl.bindVertexArray(null);

    /* render targets */
    let W = 0, H = 0, T = null;
    function tex(w, h) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, IF, w, h, 0, gl.RGBA, TY, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t, fbo, w, h };
    }
    function resize() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
      if (w === W && h === H) return;
      W = w; H = h; canvas.width = w; canvas.height = h;
      if (T) {
        for (const t of [T.bg, T.scene, ...T.mips]) { gl.deleteTexture(t.t); gl.deleteFramebuffer(t.fbo); }
        gl.deleteRenderbuffer(T.rbC); gl.deleteRenderbuffer(T.rbD); gl.deleteFramebuffer(T.msaa);
      }
      T = { bg: tex(w >> 1 || 1, h >> 1 || 1), scene: tex(w, h), mips: [] };
      for (let i = 1; i <= 6; i++) { const mw = w >> i, mh = h >> i; if (mw < 4 || mh < 4) break; T.mips.push(tex(mw, mh)); }
      const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
      T.msaa = gl.createFramebuffer(); T.rbC = gl.createRenderbuffer(); T.rbD = gl.createRenderbuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.msaa);
      gl.bindRenderbuffer(gl.RENDERBUFFER, T.rbC); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, IF, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.rbC);
      gl.bindRenderbuffer(gl.RENDERBUFFER, T.rbD); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.rbD);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete');
    }

    /* level geometry */
    let L = null, sec = null, pal = null;
    function setLevel(level, sector) {
      L = level; sec = sector;
      pal = { top: lin(sector.skyTop), bot: lin(sector.skyBot), nebA: lin(sector.nebA), nebB: lin(sector.nebB), sun: lin(sector.sun),
        tiles: sector.tiles.map(lin), accent: lin(sector.accent), ship: lin(sector.ship), idx: level.sector };
      const A = [], G = [], aS = [0], gS = [0];
      const put = (arr, x, y, z, sx, sy, sz, col, type, seed, glow) => arr.push(x, y, z, sx, sy, sz, col[0], col[1], col[2], type, seed, glow, 0);
      const finishRow = L.n - 3;
      for (let r = 0; r < L.n; r++) {
        const zc = (r + 0.5) * TL, row = L.cells[r];
        const a = 0.5 + 0.5 * Math.sin(r * 0.21), b = 0.5 + 0.5 * Math.sin(r * 0.057 + 2);
        const rowCol = mix3(mix3(pal.tiles[0], pal.tiles[1], a), pal.tiles[2], b * 0.6);
        for (let l = 0; l < C.LANES; l++) {
          const ch = row[l]; if (ch === '.') continue;
          const x = l - 3, k = ((l + r) & 1) ? 1 : 0.55, seed = hash(r * 7 + l);
          const col = rowCol.map(v => v * k);
          if (ch === '1' || ch === '2') {
            const h = +ch;
            put(A, x, (h - C.SLAB) / 2, zc, 0.95, h + C.SLAB, TL - 0.07, col.map(v => v * 1.25 + 0.02), 6, seed, 0.2);
          } else {
            const special = TYPE_COL[ch === 'T' ? '' : ch];
            put(A, x, -C.SLAB / 2, zc, 0.95, C.SLAB, TL - 0.07, special || col, TYPE_ID[ch] || 0, seed, special ? 0.6 : 0);
            if (ch === 'T') put(G, x, 1.3, zc, 0.97, 0.4, TL - 0.05, mix3(rowCol, pal.accent, 0.45), 8, seed, 0);
          }
        }
        if (r % 4 === 0) for (const s of [-1, 1]) {
          const h = 1.5 + hash(r * 3.1 + s) * 5;
          put(A, s * 5.4, h / 2 - 1.2, zc, 0.09, h, 0.09, pal.accent, 7, 0, 1.1 + hash(r + s * 9) * 0.9);
        }
        for (let k = 0; k < 2; k++) {
          const h1 = hash(r * 13.7 + k * 5.3);
          if (h1 > 0.3) continue;
          const s = hash(r * 2.9 + k) > 0.5 ? 1 : -1, h2 = hash(r * 5.1 + k * 3), h3 = hash(r * 9.3 + k * 7);
          put(A, s * (16 + h2 * 26), -17 + h3 * 15, zc, 2 + h3 * 5, 3 + h2 * 16, 2 + h1 * 12, pal.tiles[(r + k) % 3], 9, h1, 0);
        }
        if (r === finishRow) {
          const white = mix3(pal.accent, [1, 1, 1], 0.5), z0 = L.finishZ;
          put(A, -4.1, 2.2, z0, 0.22, 5.4, 0.22, white, 7, 0, 3);
          put(A, 4.1, 2.2, z0, 0.22, 5.4, 0.22, white, 7, 0, 3);
          put(A, 0, 4.9, z0, 8.42, 0.22, 0.22, white, 7, 0, 3);
          put(A, 0, 0.012, z0, 6.96, 0.02, 0.3, white, 7, 0, 2.2);
        }
        aS.push(A.length / INST); gS.push(G.length / INST);
      }
      for (const [o, arr, st] of [[opaque, A, aS], [glass, G, gS]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, o.buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); o.starts = st;
      }
      cam.init = false;
    }

    /* particles */
    const parts = []; // {x,y,z,vx,vy,vz,life,max,size,r,g,b,grav}
    function emit(x, y, z, vx, vy, vz, life, size, col, grav) {
      if (parts.length < MAXP - 400) parts.push({ x, y, z, vx, vy, vz, life, max: life, size, r: col[0], g: col[1], b: col[2], grav: grav || 0 });
    }
    function burst(kind, x, y, z, v) {
      const n = kind === 'crash' ? 140 : kind === 'shard' ? 18 : kind === 'finish' ? 90 : 10;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, e = Math.acos(2 * Math.random() - 1), sp = Math.random();
        const dx = Math.sin(e) * Math.cos(a), dy = Math.cos(e), dz = Math.sin(e) * Math.sin(a);
        if (kind === 'crash') {
          const col = Math.random() < 0.4 ? [3, 2.4, 1.6] : Math.random() < 0.5 ? pal.ship.map(c => c * 3) : [3, 0.9, 0.3];
          emit(x, y + 0.2, z, dx * (2 + sp * 13), Math.abs(dy) * (2 + sp * 10), dz * (2 + sp * 12) + (v || 0) * 0.45, 0.5 + Math.random() * 0.9, 0.12 + Math.random() * 0.38, col, 9);
        } else if (kind === 'shard') {
          emit(x, y, z, dx * 3 * sp, dy * 3 * sp + 1, dz * 3 * sp + (v || 0) * 0.8, 0.3 + Math.random() * 0.4, 0.1 + Math.random() * 0.14, [3, 2.6, 1.2], 0);
        } else if (kind === 'finish') {
          emit(x + dx * 4, y + 2 + dy * 2, z, dx * 5, 2 + sp * 7, dz * 3 + (v || 0) * 0.6, 0.8 + Math.random(), 0.12 + Math.random() * 0.2, i % 2 ? [3, 3, 3] : pal.accent.map(c => c * 3), 4);
        } else {
          emit(x + dx * 0.3, y + 0.05, z + dz * 0.3, dx * 2.5, 0.4 + sp, dz * 2 + (v || 0) * 0.7, 0.25 + Math.random() * 0.2, 0.14, pal.ship.map(c => c * 1.2), 0);
        }
      }
    }
    const dust = [];
    for (let i = 0; i < 170; i++) dust.push({ x: 0, y: 0, z: -1e9, s: 0 });

    const cam = { init: false, x: 0, y: 3, fov: 62, ty: 0 };
    let trailAcc = 0;

    function quad(prog, src, dst, texel) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
      gl.viewport(0, 0, dst ? dst.w : W, dst ? dst.h : H);
      gl.useProgram(prog.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t);
      gl.uniform1i(prog.u.uTex, 0);
      if (prog.u.uTexel) gl.uniform2f(prog.u.uTexel, texel / src.w, texel / src.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* view: { time, dt, ship:{x,y,z,vx,vy,v,visible,grounded}, groundY, got, shake, flash, flashCol, fade, attract } */
    function render(view) {
      resize();
      const s = view.ship, dt = view.dt, time = view.time;
      const boost = Math.max(0, Math.min(1, (s.v - C.VMAX) / (C.VBOOST - C.VMAX)));
      const tx = view.attract ? Math.sin(time * 0.25) * 1.2 : s.x * 0.72;
      const ty = view.attract ? 3.6 : 2.2 + Math.max(s.y, -1.5) * 0.75;
      const tf = 60 + 7 * Math.min(1, s.v / C.VMAX) + 14 * boost;
      if (!cam.init) { cam.x = tx; cam.y = ty; cam.fov = tf; cam.init = true; }
      const kx = 1 - Math.exp(-dt * 9), ky = 1 - Math.exp(-dt * 5);
      cam.x += (tx - cam.x) * kx; cam.y += (ty - cam.y) * ky; cam.fov += (tf - cam.fov) * (1 - Math.exp(-dt * 4));
      const sh = view.shake || 0;
      const eye = [cam.x + (Math.random() - 0.5) * sh, cam.y + (Math.random() - 0.5) * sh, s.z - 5.4];
      const tgt = [cam.x * 0.92 + s.x * 0.08, cam.y - 1.7, s.z + 7];
      const aspect = W / H, fov = aspect < 1 ? cam.fov + (1 - aspect) * 26 : cam.fov;
      const VP = viewProj(eye, tgt, fov, aspect, 0.3, 400);
      const bendX = 0.00042 * Math.sin(s.z * 0.011 + pal.idx * 2.1) + 0.00018 * Math.sin(s.z * 0.027);
      const bendV = [bendX, 0.00042, s.z + 2];

      // background → half-res texture (also used for fog and reflections)
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.bindVertexArray(emptyVAO);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.bg.fbo); gl.viewport(0, 0, T.bg.w, T.bg.h);
      gl.useProgram(P.bg.p);
      gl.uniform2f(P.bg.u.uRes, T.bg.w, T.bg.h); gl.uniform1f(P.bg.u.uTime, time);
      gl.uniform2f(P.bg.u.uPar, cam.x * 0.012 - bendX * 260, (cam.y - 2.4) * -0.01);
      gl.uniform3fv(P.bg.u.uTop, pal.top); gl.uniform3fv(P.bg.u.uBot, pal.bot);
      gl.uniform3fv(P.bg.u.uNebA, pal.nebA); gl.uniform3fv(P.bg.u.uNebB, pal.nebB); gl.uniform3fv(P.bg.u.uSun, pal.sun);
      const pl = [[-0.62, 0.27, 0.17, 3.2], [0.6, 0.3, 0.24, 4.5], [-0.5, 0.33, 0.12, 2.4]][pal.idx % 3];
      gl.uniform4fv(P.bg.u.uPlanet, pl);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, T.msaa); gl.viewport(0, 0, W, H);
      gl.depthMask(true); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(P.copy.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.bg.t); gl.uniform1i(P.copy.u.uTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // road
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      const r0 = Math.max(0, Math.floor(eye[2] / TL) - 1), r1 = Math.min(L.n, r0 + VIEW_ROWS);
      function drawBoxes(o, glassy) {
        const first = o.starts[r0], count = o.starts[r1] - first;
        if (count <= 0) return;
        gl.bindVertexArray(o.vao); gl.bindBuffer(gl.ARRAY_BUFFER, o.buf);
        const st = INST * 4, base = first * st;
        gl.vertexAttribPointer(3, 3, gl.FLOAT, false, st, base); gl.vertexAttribPointer(4, 3, gl.FLOAT, false, st, base + 12);
        gl.vertexAttribPointer(5, 3, gl.FLOAT, false, st, base + 24); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, st, base + 36);
        gl.uniform1f(P.box.u.uGlass, glassy);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);
      }
      gl.useProgram(P.box.p);
      gl.uniformMatrix4fv(P.box.u.uVP, false, VP); gl.uniform3fv(P.box.u.uCam, eye); gl.uniform3fv(P.box.u.uBend, bendV);
      gl.uniform1f(P.box.u.uTime, time); gl.uniform1f(P.box.u.uFogK, 1 / 105); gl.uniform2f(P.box.u.uRes, W, H);
      gl.uniform1i(P.box.u.uBg, 0);
      drawBoxes(opaque, 0);

      // ship + shards
      gl.useProgram(P.mesh.p);
      gl.uniformMatrix4fv(P.mesh.u.uVP, false, VP); gl.uniform3fv(P.mesh.u.uCam, eye); gl.uniform3fv(P.mesh.u.uBend, bendV);
      gl.uniform3fv(P.mesh.u.uSky, mix3(pal.bot, pal.nebA, 0.5));
      const hover = 0.17 + (s.grounded ? Math.sin(time * 7) * 0.018 : 0);
      if (s.visible) {
        let f = [s.vx * 0.035, s.vy * 0.035, 1]; const fl = Math.hypot(f[0], f[1], f[2]); f = f.map(v => v / fl);
        let r = [f[2], 0, -f[0]]; const rl = Math.hypot(r[0], r[2]); r = r.map(v => v / rl);
        const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
        const a = Math.max(-0.6, Math.min(0.6, s.vx * 0.075)), ca = Math.cos(a), sa = Math.sin(a), k = 0.86;
        const rr = [r[0] * ca - u[0] * sa, r[1] * ca - u[1] * sa, r[2] * ca - u[2] * sa];
        const uu = [u[0] * ca + r[0] * sa, u[1] * ca + r[1] * sa, u[2] * ca + r[2] * sa];
        gl.uniformMatrix4fv(P.mesh.u.uModel, false, new Float32Array([
          rr[0] * k, rr[1] * k, rr[2] * k, 0, uu[0] * k, uu[1] * k, uu[2] * k, 0, f[0] * k, f[1] * k, f[2] * k, 0, s.x, s.y + hover, s.z, 1]));
        gl.uniform3fv(P.mesh.u.uTint, pal.ship); gl.uniform1f(P.mesh.u.uGlow, 1.1 + boost * 1.6 + 0.5 * (s.v / C.VMAX));
        gl.bindVertexArray(shipMesh.vao); gl.drawArrays(gl.TRIANGLES, 0, shipMesh.count);
      }
      if (L.shards.length) {
        gl.uniform3f(P.mesh.u.uTint, 1.0, 0.82, 0.3); gl.uniform1f(P.mesh.u.uGlow, 2.4);
        gl.bindVertexArray(shardMesh.vao);
        for (let i = 0; i < L.shards.length; i++) {
          const q = L.shards[i];
          if (q.row < r0 || q.row >= r1 || (view.got && view.got[i])) continue;
          const an = time * 2.2 + i, c = Math.cos(an), sn = Math.sin(an), yy = q.y + Math.sin(time * 2.5 + i * 1.7) * 0.07;
          gl.uniformMatrix4fv(P.mesh.u.uModel, false, new Float32Array([c, 0, -sn, 0, 0, 1, 0, 0, sn, 0, c, 0, q.x, yy, q.z, 1]));
          gl.drawArrays(gl.TRIANGLES, 0, shardMesh.count);
        }
      }

      // translucent: shadow decal, glass roofs, particles
      gl.enable(gl.BLEND); gl.depthMask(false); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (s.visible && view.groundY !== null && view.groundY !== undefined) {
        const hgt = Math.max(0, s.y - view.groundY);
        gl.useProgram(P.decal.p); gl.bindVertexArray(emptyVAO);
        gl.uniformMatrix4fv(P.decal.u.uVP, false, VP); gl.uniform3fv(P.decal.u.uBend, bendV);
        gl.uniform3f(P.decal.u.uCenter, s.x, view.groundY + 0.015, s.z - 0.05);
        const sz = 0.62 + hgt * 0.12;
        gl.uniform2f(P.decal.u.uSize, sz, sz * 1.35);
        const gI = (0.9 + boost) / (1 + hgt * 3.5);
        gl.uniform3f(P.decal.u.uGlowCol, pal.ship[0] * gI, pal.ship[1] * gI, pal.ship[2] * gI);
        gl.uniform1f(P.decal.u.uShadow, 0.75);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.useProgram(P.box.p);
      drawBoxes(glass, 1);

      // particles
      if (s.visible && s.v > 0.5) {
        trailAcc += dt * (170 + 120 * boost);
        const tc = pal.ship.map(c => c * (0.55 + boost * 0.9));
        while (trailAcc >= 1) {
          trailAcc -= 1;
          const side = Math.random() < 0.5 ? -0.1 : 0.1, back = Math.random() * s.v * dt;
          emit(s.x + side, s.y + hover + 0.07, s.z - 0.38 - back, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, s.v * 0.25,
            0.14 + Math.random() * 0.2 + boost * 0.15, 0.1 + 0.07 * (s.v / C.VMAX) + boost * 0.05, tc, 0);
        }
      }
      let n = 0;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
        p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const k = p.life / p.max, o = n * 8;
        ptData[o] = p.x; ptData[o + 1] = p.y; ptData[o + 2] = p.z; ptData[o + 3] = p.size * (0.4 + 0.6 * k);
        ptData[o + 4] = p.r; ptData[o + 5] = p.g; ptData[o + 6] = p.b; ptData[o + 7] = k;
        n++;
      }
      for (const d of dust) {
        if (d.z < eye[2] + 1 || d.z > eye[2] + 160) {
          const fresh = d.z < -1e8 || d.z > eye[2] + 160;
          d.z = eye[2] + (fresh ? Math.random() * 150 : 120 + Math.random() * 30);
          const side = Math.random() < 0.5 ? -1 : 1;
          d.x = side * (4.5 + Math.random() * 14); d.y = -5 + Math.random() * 12; d.s = 0.05 + Math.random() * 0.1;
        }
        const o = n * 8, fade = Math.min(1, (eye[2] + 150 - d.z) / 40);
        ptData[o] = d.x; ptData[o + 1] = d.y; ptData[o + 2] = d.z; ptData[o + 3] = d.s;
        ptData[o + 4] = pal.accent[0] + 0.3; ptData[o + 5] = pal.accent[1] + 0.3; ptData[o + 6] = pal.accent[2] + 0.3; ptData[o + 7] = fade * 0.8;
        n++;
      }
      if (s.visible) { // engine flare
        const o = n * 8; ptData[o] = s.x; ptData[o + 1] = s.y + hover + 0.08; ptData[o + 2] = s.z - 0.36; ptData[o + 3] = 0.34 + boost * 0.3;
        ptData[o + 4] = pal.ship[0] * 1.6; ptData[o + 5] = pal.ship[1] * 1.6; ptData[o + 6] = pal.ship[2] * 1.6; ptData[o + 7] = 0.25 + 0.75 * Math.min(1, s.v / C.VMAX); n++;
      }
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(P.pt.p); gl.bindVertexArray(ptVAO); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, ptData.subarray(0, n * 8));
      gl.uniformMatrix4fv(P.pt.u.uVP, false, VP); gl.uniform3fv(P.pt.u.uBend, bendV);
      gl.uniform1f(P.pt.u.uPx, H / (2 * Math.tan(fov * Math.PI / 360)));
      gl.drawArrays(gl.POINTS, 0, n);
      gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);

      // resolve + bloom + composite
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.msaa); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.scene.fbo);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindVertexArray(emptyVAO);
      const M = T.mips;
      quad(P.pre, T.scene, M[0], 1);
      for (let i = 1; i < M.length; i++) quad(P.down, M[i - 1], M[i], 1);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = M.length - 1; i > 0; i--) quad(P.up, M[i], M[i - 1], 1);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      gl.useProgram(P.comp.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.scene.t); gl.uniform1i(P.comp.u.uScene, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, M[0].t); gl.uniform1i(P.comp.u.uBloom, 1);
      gl.uniform1f(P.comp.u.uCA, 0.0012 + boost * 0.007); gl.uniform1f(P.comp.u.uTime, time);
      gl.uniform1f(P.comp.u.uFlash, view.flash || 0); gl.uniform3fv(P.comp.u.uFlashCol, view.flashCol || [1, 1, 1]);
      gl.uniform1f(P.comp.u.uFade, view.fade === undefined ? 1 : view.fade);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    }

    return { setLevel, render, burst, clearParticles: () => { parts.length = 0; } };
  }

  root.GFX = { create };
})(window);
