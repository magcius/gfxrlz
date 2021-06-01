
// Utility library of default shader snippets.

export namespace GfxShaderLibrary {

// Matrix library. Automatically included into every shader by default for convenience reasons.
export const mat4 = `
struct Mat4x4 { vec4 mx; vec4 my; vec4 mz; vec4 mw; };
struct Mat4x3 { vec4 mx; vec4 my; vec4 mz; };
struct Mat4x2 { vec4 mx; vec4 my; };

vec3 Mat4x3GetCol0(Mat4x3 m) { return vec3(m.mx.x, m.my.x, m.mz.x); }
vec3 Mat4x3GetCol1(Mat4x3 m) { return vec3(m.mx.y, m.my.y, m.mz.y); }
vec3 Mat4x3GetCol2(Mat4x3 m) { return vec3(m.mx.z, m.my.z, m.mz.z); }
vec3 Mat4x3GetCol3(Mat4x3 m) { return vec3(m.mx.w, m.my.w, m.mz.w); }

vec4 Mul(Mat4x4 m, vec4 v) { return vec4(dot(m.mx, v), dot(m.my, v), dot(m.mz, v), dot(m.mw, v)); }
vec3 Mul(Mat4x3 m, vec4 v) { return vec3(dot(m.mx, v), dot(m.my, v), dot(m.mz, v)); }
vec2 Mul(Mat4x2 m, vec4 v) { return vec2(dot(m.mx, v), dot(m.my, v)); }

vec4 Mul(vec3 v, Mat4x3 m) {
return vec4(
    dot(Mat4x3GetCol0(m), v),
    dot(Mat4x3GetCol1(m), v),
    dot(Mat4x3GetCol2(m), v),
    dot(Mat4x3GetCol3(m), v)
);
}

void Fma(inout Mat4x3 d, Mat4x3 m, float s) { d.mx += m.mx * s; d.my += m.my * s; d.mz += m.mz * s; }

Mat4x4 _Mat4x4(float n) { Mat4x4 o; o.mx = vec4(n, 0.0, 0.0, 0.0); o.my = vec4(0.0, n, 0.0, 0.0); o.mz = vec4(0.0, 0.0, n, 0.0); o.mw = vec4(0.0, 0.0, 0.0, n); return o; }
Mat4x4 _Mat4x4(Mat4x3 m) { Mat4x4 o = _Mat4x4(1.0); o.mx = m.mx; o.my = m.my; o.mz = m.mz; return o; }
Mat4x4 _Mat4x4(Mat4x2 m) { Mat4x4 o = _Mat4x4(1.0); o.mx = m.mx; o.my = m.my; return o; }

Mat4x3 _Mat4x3(float n) { Mat4x3 o; o.mx = vec4(n, 0.0, 0.0, 0.0); o.my = vec4(0.0, n, 0.0, 0.0); o.mz = vec4(0.0, 0.0, n, 0.0); return o; }
Mat4x3 _Mat4x3(Mat4x4 m) { Mat4x3 o; o.mx = m.mx; o.my = m.my; o.mz = m.mz; return o; }
`;

// Helper math utility
export const saturate: string = `
float saturate(float v) { return clamp(v, 0.0, 1.0); }
vec2 saturate(vec2 v) { return clamp(v, vec2(0.0), vec2(1.0)); }
vec3 saturate(vec3 v) { return clamp(v, vec3(0.0), vec3(1.0)); }
vec4 saturate(vec4 v) { return clamp(v, vec4(0.0), vec4(1.0)); }
`;

export const invlerp: string = `
float invlerp(float a, float b, float v) { return (v - a) / (b - a); }
`;

// Vertex shader for indexbuffer-less full-screen triangle
export const fullscreenVS: string = `
out vec2 v_TexCoord;

void main() {
    v_TexCoord.x = (gl_VertexID == 1) ? 2.0 : 0.0;
    v_TexCoord.y = (gl_VertexID == 2) ? 2.0 : 0.0;
    gl_Position.xy = v_TexCoord * vec2(2) - vec2(1);
    gl_Position.zw = vec2(1, 1);

#ifdef VIEWPORT_ORIGIN_TL
    v_TexCoord.y = 1.0 - v_TexCoord.y;
#endif
}
`;

export const fullscreenBlitOneTexPS: string = `
uniform sampler2D u_Texture;
in vec2 v_TexCoord;

void main() {
    gl_FragColor = texture(SAMPLER_2D(u_Texture), v_TexCoord);
}
`;

export const monochromeNTSC: string = `
float MonochromeNTSC(vec3 t_Color) {
    // NTSC primaries.
    return dot(t_Color.rgb, vec3(0.299, 0.587, 0.114));
}
`;

}

export function glslGenerateFloat(v: number): string {
    let s = v.toString();
    if (!s.includes('.'))
        s += '.0';
    if (s.includes('e'))
        s = v.toFixed(5); // hack! how best to stringify a number for glsl??
    return s;
}
