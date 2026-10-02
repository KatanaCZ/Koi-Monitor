// Koi atmosphere: aura backdrop, sakura petals and glass surfaces.
//
// Every primitive (the window backdrop, then one per glass surface) gets its own
// uniform slot. Positions are physical pixels with a top-left origin; the render
// pass viewport is the primitive's bounds, hence `viewport` below.

struct Uniforms {
    // Window size.
    resolution: vec2<f32>,
    time: f32,
    scale: f32,
    // Bounds of the primitive being drawn (the render pass viewport).
    viewport: vec4<f32>,
    // Glass surface rectangle; zero width for the window backdrop.
    rect: vec4<f32>,
    // rgb: sakura tint, a: petal opacity.
    accent: vec4<f32>,
    // rgb: canvas colour, a: aura strength.
    base: vec4<f32>,
    // rgb: surface tint, a: its opacity over the backdrop.
    glass: vec4<f32>,
    // x: corner radius, y: 1 when the target is sRGB, z: 1 in light theme, w: pond breath period in seconds (0 = still).
    params: vec4<f32>,
    // x: border opacity, y: shadow opacity, z: frost (0 = solid surface), w: ambient glow.
    extra: vec4<f32>,
    // Zen pond. rgb: halo colour of the current state, a: ripple amplitude (0 = no pond).
    pond: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

const PINK: vec3<f32> = vec3<f32>(1.0, 0.176, 0.584);
const CYAN: vec3<f32> = vec3<f32>(0.0, 0.831, 1.0);
const PURPLE: vec3<f32> = vec3<f32>(0.616, 0.306, 0.867);

fn hash1(n: f32) -> f32 {
    return fract(sin(n * 127.1) * 43758.5453);
}

fn hash2(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn sd_round_box(p: vec2<f32>, half: vec2<f32>, radius: f32) -> f32 {
    let r = min(radius, min(half.x, half.y));
    let q = abs(p) - half + vec2<f32>(r);
    return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// Signed distance to the glass surface of this primitive.
fn surface_distance(frag: vec2<f32>) -> f32 {
    let half = u.rect.zw * 0.5;
    return sd_round_box(frag - (u.rect.xy + half), half, u.params.x);
}

// Colours are authored in sRGB; convert when the surface expects linear values.
fn encode(color: vec3<f32>) -> vec3<f32> {
    if (u.params.y > 0.5) {
        return pow(max(color, vec3<f32>(0.0)), vec3<f32>(2.2));
    }
    return color;
}

fn aura(uv: vec2<f32>, center: vec2<f32>, radius: f32, aspect: f32) -> f32 {
    let d = length((uv - center) * vec2<f32>(aspect, 1.0));
    let f = clamp(1.0 - d / radius, 0.0, 1.0);
    return f * f;
}

// One breathing ripple of the Zen pond: an ellipse outline in the 1200x800 box of the
// original SVG (`preserveAspectRatio="xMidYMid slice"`).
fn ripple(frag: vec2<f32>, center: vec2<f32>, radii: vec2<f32>, delay: f32) -> f32 {
    let fit = max(u.resolution.x / 1200.0, u.resolution.y / 800.0);
    let origin = (u.resolution - vec2<f32>(1200.0, 800.0) * fit) * 0.5;

    // 0 → 1 → 0 over one breath; a still pond rests a third of the way in.
    var breath = 0.3;
    if (u.params.w > 0.0) {
        breath = 0.5 - 0.5 * cos((u.time + delay) / u.params.w * 6.2832);
    }
    let amplitude = u.pond.a;
    let r = radii * fit * vec2<f32>(1.0 + 0.04 * amplitude * breath, 1.0 + 0.12 * amplitude * breath);
    let p = frag - (origin + center * fit);

    // First-order distance to the ellipse outline.
    let k0 = length(p / r);
    let k1 = length(p / (r * r));
    let d = abs(k0 * (k0 - 1.0) / max(k1, 0.000001));

    let line = smoothstep(1.4 * u.scale, 0.0, d);
    return line * (0.12 + 0.16 * breath) * min(amplitude, 1.5);
}

// Zen wallpaper: depth glow around the clock, a lit water surface and three ripples.
fn pond(base: vec3<f32>, frag: vec2<f32>, uv: vec2<f32>) -> vec3<f32> {
    let halo = u.pond.rgb;
    var color = base;

    let around_clock = length((uv - vec2<f32>(0.5, 0.38)) / vec2<f32>(0.70, 0.55));
    color = mix(color, halo, 0.08 * smoothstep(0.72, 0.0, around_clock));
    let from_below = length((uv - vec2<f32>(0.5, 1.0)) / vec2<f32>(0.95, 0.65));
    color = mix(color, halo, 0.07 * smoothstep(0.55, 0.0, from_below));

    // Water surface: the bottom 46 %, fading upwards.
    let surface = clamp((uv.y - 0.54) / 0.46, 0.0, 1.0);
    color = mix(color, halo, 0.06 * surface * surface * 0.85);

    var ripples = ripple(frag, vec2<f32>(600.0, 540.0), vec2<f32>(440.0, 52.0), 0.0);
    ripples = max(ripples, ripple(frag, vec2<f32>(470.0, 580.0), vec2<f32>(340.0, 38.0), 1.1));
    ripples = max(ripples, ripple(frag, vec2<f32>(730.0, 600.0), vec2<f32>(300.0, 32.0), 2.3));
    color = mix(color, halo, ripples * 0.9);

    // Soft halo behind the clock digits (`.zen-hero-glow`).
    let glow = length((uv - vec2<f32>(0.5, 0.30)) / vec2<f32>(0.34, 0.20));
    color = mix(color, u.accent.rgb, 0.07 * smoothstep(1.0, 0.0, glow));

    return color;
}

// The window backdrop at a given pixel. Glass surfaces re-evaluate it to cover
// the sharp petals underneath before drawing their own blurred ones.
fn backdrop(frag: vec2<f32>) -> vec3<f32> {
    let uv = frag / u.resolution;
    let aspect = u.resolution.x / u.resolution.y;
    let drift = vec2<f32>(sin(u.time * 0.07), cos(u.time * 0.05)) * 0.025;
    let strength = u.base.a;

    var color = u.base.rgb;
    color = mix(color, PINK, 0.15 * strength * aura(uv, vec2<f32>(0.12, 0.42) + drift, 0.80, aspect));
    color = mix(color, CYAN, 0.12 * strength * aura(uv, vec2<f32>(0.88, 0.28) - drift, 0.80, aspect));
    color = mix(color, PURPLE, 0.14 * strength * aura(uv, vec2<f32>(0.50, 0.96) + drift.yx, 0.75, aspect));

    // Ambient glow rising from the bottom edge, breathing over ~10 s.
    let rise = smoothstep(0.55, 1.0, uv.y);
    let pulse = 0.085 + 0.035 * sin(u.time * 0.628);
    color = mix(color, u.accent.rgb, rise * rise * pulse * u.extra.w);

    if (u.pond.a > 0.0) {
        color = pond(color, frag, uv);
    }

    // Dither to hide banding in the dark gradients.
    color += (hash2(frag) - 0.5) / 255.0;
    return color;
}

// ---------------------------------------------------------------- fullscreen

@vertex
fn vs_fullscreen(@builtin(vertex_index) index: u32) -> @builtin(position) vec4<f32> {
    let x = f32((index << 1u) & 2u);
    let y = f32(index & 2u);
    return vec4<f32>(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
}

@fragment
fn fs_backdrop(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(encode(backdrop(pos.xy)), 1.0);
}

// Glass, back layer: the backdrop again, inside the surface only.
@fragment
fn fs_glass_back(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let inside = smoothstep(0.75, -0.75, surface_distance(pos.xy));
    return vec4<f32>(encode(backdrop(pos.xy)), inside);
}

// Glass, front layer: tint, sheen, hairline border and drop shadow.
@fragment
fn fs_glass_front(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let d = surface_distance(pos.xy);
    let inside = smoothstep(0.75, -0.75, d);
    let v = clamp((pos.y - u.rect.y) / u.rect.w, 0.0, 1.0);
    let h = clamp((pos.x - u.rect.x) / u.rect.z, 0.0, 1.0);
    let light = u.params.z;

    // Drop shadow, offset downwards like `0 16px 40px -8px`.
    let shadow_d = surface_distance(pos.xy - vec2<f32>(0.0, 10.0 * u.scale));
    let shadow = exp(-max(shadow_d, 0.0) / (16.0 * u.scale)) * u.extra.y * (1.0 - inside);

    // Light falling from the top-left corner.
    let sheen = (pow(1.0 - v, 2.0) * 0.05 + pow(1.0 - h, 3.0) * (1.0 - v) * 0.03) * (1.0 - light);
    let body = u.glass.rgb + vec3<f32>(sheen);
    let body_alpha = inside * u.glass.a;

    // Hairline border: brighter along the top edge in dark theme, a tinted line in light theme.
    let edge = smoothstep(1.4 * u.scale, 0.0, abs(d + 0.9 * u.scale));
    let edge_alpha = edge * u.extra.x * mix(1.0 + 1.6 * pow(1.0 - v, 2.0), 1.0, light);
    let edge_color = mix(vec3<f32>(1.0), vec3<f32>(0.17, 0.06, 0.25), light);

    let surface_alpha = max(body_alpha, edge_alpha);
    let surface = mix(body, edge_color, edge_alpha / max(surface_alpha, 0.0001));

    if (shadow > surface_alpha) {
        return vec4<f32>(0.0, 0.0, 0.0, shadow);
    }
    return vec4<f32>(encode(surface), surface_alpha);
}

// -------------------------------------------------------------------- petals

struct PetalInstance {
    // seed, size, duration, phase
    @location(0) a: vec4<f32>,
    // rotation start, rotation turns, blur, peak opacity
    @location(1) b: vec4<f32>,
}

struct PetalVarying {
    @builtin(position) position: vec4<f32>,
    @location(0) local: vec2<f32>,
    // size, blur, opacity
    @location(1) shape: vec3<f32>,
}

@vertex
fn vs_petal(@builtin(vertex_index) index: u32, petal: PetalInstance) -> PetalVarying {
    let corner = vec2<f32>(f32(index & 1u), f32((index >> 1u) & 1u)) * 2.0 - 1.0;

    let seed = petal.a.x;
    let size = petal.a.y * u.scale;
    let progress = u.time / petal.a.z + petal.a.w;
    let cycle = floor(progress);
    let t = fract(progress);

    // Each fall picks a new lane, like the original `xStart / xMid / xEnd` keyframes.
    let x_start = hash1(seed + cycle * 17.0);
    let x_mid = x_start + (hash1(seed * 3.1 + cycle * 5.0) - 0.5) * 0.2;
    let x_end = x_start + (hash1(seed * 7.7 + cycle * 11.0) - 0.5) * 0.4;
    var x = mix(x_mid, x_end, (t - 0.5) * 2.0);
    if (t < 0.5) {
        x = mix(x_start, x_mid, t * 2.0);
    }
    x += sin(t * 12.566 + seed) * 0.008;

    let center = vec2<f32>(x * u.resolution.x, (t * 1.4 - 0.2) * u.resolution.y);
    let angle = petal.b.x + petal.b.y * t * 6.2832;
    let blur = petal.b.z * u.scale;

    // Room for the blurred edge and the glow around the petal.
    let half = size * 0.5 + blur * 2.0 + 14.0 * u.scale;
    let local = corner * half;
    let c = cos(angle);
    let s = sin(angle);
    let world = center + vec2<f32>(local.x * c - local.y * s, local.x * s + local.y * c);

    var fade = 1.0;
    if (t < 0.15) {
        fade = t / 0.15;
    } else if (t > 0.85) {
        fade = (1.0 - t) / 0.15;
    }

    let ndc = (world - u.viewport.xy) / u.viewport.zw * 2.0 - vec2<f32>(1.0);

    var out: PetalVarying;
    out.position = vec4<f32>(ndc.x, -ndc.y, 0.0, 1.0);
    out.local = local;
    out.shape = vec3<f32>(size, blur, petal.b.w * fade * u.accent.a);
    return out;
}

// Sakura petal: a vesica with a small notch at the tip.
fn sd_petal(p: vec2<f32>, size: f32) -> f32 {
    // Two circles of radius `r`, centres `d` either side of the axis: 0.56 as wide as it is tall.
    let b = 0.5 * size;
    let d = 0.3064 * size;
    let r = 0.5864 * size;
    let q = abs(p);
    var dist = length(q - vec2<f32>(-d, 0.0)) - r;
    if ((q.y - b) * d > q.x * b) {
        dist = length(q - vec2<f32>(0.0, b));
    }
    let notch = length(p - vec2<f32>(0.0, -b)) - 0.14 * size;
    return max(dist, -notch);
}

@fragment
fn fs_petal(in: PetalVarying) -> @location(0) vec4<f32> {
    let size = in.shape.x;

    // Behind glass the petal is blurred further and dimmed: frosted glass without a blur pass.
    var frosted = 0.0;
    var mask = 1.0;
    if (u.rect.z > 0.0) {
        frosted = u.extra.z;
        mask = smoothstep(0.75, -0.75, surface_distance(in.position.xy));
    }

    let blur = in.shape.y + frosted * 5.0 * u.scale + 0.75;
    let d = sd_petal(in.local, size);
    let body = smoothstep(blur, -blur, d);
    let glow = exp(-max(d, 0.0) / (4.0 * u.scale)) * 0.22 * (1.0 - frosted * 0.5);

    let highlight = clamp(1.0 + d / (size * 0.35), 0.0, 1.0);
    let color = mix(mix(u.accent.rgb, vec3<f32>(1.0), 0.32), u.accent.rgb, highlight);
    let alpha = max(body, glow) * in.shape.z * mix(1.0, 0.62, frosted) * mask;

    return vec4<f32>(encode(color), alpha);
}
