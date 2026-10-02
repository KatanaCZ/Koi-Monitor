//! GPU atmosphere: aura backdrop, sakura petals and glass surfaces.
//!
//! Everything is drawn by `scene.wgsl` inside iced's own render pass. The window
//! backdrop is one primitive; each [`glass::Glass`] surface is another that
//! repaints the backdrop inside its bounds, draws the petals again (blurred and
//! dimmed) and lays its tint on top — frosted glass without any blur pass.
//!
//! Petal motion is computed in the vertex shader from a static instance buffer,
//! so a frame costs a few small uniform uploads and a handful of draw calls.

pub mod glass;

use iced::wgpu;
use iced::widget::shader::{self, Action, Viewport};
use iced::{mouse, window, Color, Event, Rectangle};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use crate::settings::{BackgroundAura, SakuraIntensity, Settings};
use crate::theme::Palette;

/// Petals do not need more than this; the original canvas ran at 30 FPS too.
const FRAME_INTERVAL: Duration = Duration::from_millis(33);

/// Uniform slots available per frame (the backdrop plus every visible glass surface).
const SLOTS: u32 = 96;
/// Slot stride: the uniform block, padded to the usual 256-byte offset alignment.
const SLOT_SIZE: u64 = 256;

// Petal instances per depth layer at "high" intensity; lower settings draw a prefix of each.
const BACK_PETALS: u32 = 20;
const MID_PETALS: u32 = 14;
const FRONT_PETALS: u32 = 4;

fn elapsed() -> f32 {
    static START: OnceLock<Instant> = OnceLock::new();
    START.get_or_init(Instant::now).elapsed().as_secs_f32()
}

/// Everything the shader needs to know about the current look, derived from Settings.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Atmosphere {
    pub palette: Palette,
    pub accent: Color,
    /// 0 (off), 0.5 (soft) or 1 (full).
    pub aura: f32,
    /// Petals per layer: back, mid, front.
    pub petals: [u32; 3],
    /// Translucent surfaces with petals behind them, or solid cards.
    pub frosted: bool,
    /// Ripple tempo of the Zen pond, 0 outside Zen mode.
    pub pond: f32,
}

impl Atmosphere {
    pub fn new(settings: &Settings, reduced_motion: bool, pond: f32) -> Self {
        let palette = Palette::of(settings.theme);

        // Zen keeps the scene quiet: one notch fewer petals and no foreground layer.
        let intensity = match (settings.zen_mode, settings.sakura_intensity) {
            (true, SakuraIntensity::High) => SakuraIntensity::Medium,
            (true, SakuraIntensity::Medium) => SakuraIntensity::Low,
            (_, intensity) => intensity,
        };
        let multiplier = match intensity {
            SakuraIntensity::Off => 0.0,
            SakuraIntensity::Low => 0.35,
            SakuraIntensity::Medium => 0.75,
            SakuraIntensity::High => 1.35,
        };
        let count = |base: f32, max: u32| {
            if multiplier == 0.0 || settings.calm_motion || reduced_motion {
                0
            } else {
                ((base * multiplier).round() as u32).clamp(1, max)
            }
        };

        Self {
            palette,
            accent: palette.accent(settings.sakura_color).fill,
            aura: match settings.background_aura {
                BackgroundAura::Off => 0.0,
                BackgroundAura::Soft => 0.5,
                BackgroundAura::Full => 1.0,
            },
            petals: [
                count(15.0, BACK_PETALS),
                count(10.0, MID_PETALS),
                if settings.zen_mode { 0 } else { count(3.0, FRONT_PETALS) },
            ],
            frosted: settings.enable_glassmorphic_blur,
            pond,
        }
    }

    /// Whether the scene changes from one frame to the next.
    pub fn animated(&self) -> bool {
        self.petals.iter().any(|&count| count > 0) || self.pond > 0.0
    }
}

/// How a glass surface is tinted.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Surface {
    /// Dashboard card (`.bento-card`).
    Card,
    /// Title bar and floating panels (`.liquid-glass`).
    Panel,
    /// Dialogs: nearly opaque so text stays readable over a busy dashboard.
    Dialog,
}

#[derive(Debug, Clone, Copy)]
enum Kind {
    Backdrop,
    Glass { radius: f32, surface: Surface, margin: f32 },
}

/// One draw of the scene: the window backdrop or a glass surface.
#[derive(Debug)]
pub struct Layer {
    kind: Kind,
    atmosphere: Atmosphere,
    time: f32,
    /// Uniform slot assigned in `prepare`, read back in `draw`.
    slot: AtomicU32,
}

impl Layer {
    fn new(kind: Kind, atmosphere: Atmosphere) -> Self {
        Self { kind, atmosphere, time: elapsed(), slot: AtomicU32::new(0) }
    }
}

/// The window backdrop, as a `shader` widget program.
pub struct Backdrop(pub Atmosphere);

impl<Message> shader::Program<Message> for Backdrop {
    type State = ();
    type Primitive = Layer;

    fn update(
        &self,
        _state: &mut Self::State,
        event: &Event,
        _bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> Option<Action<Message>> {
        // Self-driven animation: each redraw schedules the next one, without any application message.
        match event {
            Event::Window(window::Event::RedrawRequested(now)) if self.0.animated() => {
                Some(Action::request_redraw_at(*now + FRAME_INTERVAL))
            }
            _ => None,
        }
    }

    fn draw(&self, _state: &Self::State, _cursor: mouse::Cursor, _bounds: Rectangle) -> Self::Primitive {
        Layer::new(Kind::Backdrop, self.0)
    }
}

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct Uniforms {
    resolution: [f32; 2],
    time: f32,
    scale: f32,
    viewport: [f32; 4],
    rect: [f32; 4],
    accent: [f32; 4],
    base: [f32; 4],
    glass: [f32; 4],
    params: [f32; 4],
    extra: [f32; 4],
}

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct Petal {
    /// seed, size, duration, phase
    a: [f32; 4],
    /// rotation start, rotation turns, blur, peak opacity
    b: [f32; 4],
}

pub struct Pipeline {
    backdrop: wgpu::RenderPipeline,
    glass_back: wgpu::RenderPipeline,
    glass_front: wgpu::RenderPipeline,
    petals: wgpu::RenderPipeline,
    uniforms: wgpu::Buffer,
    bind_group: wgpu::BindGroup,
    instances: wgpu::Buffer,
    next_slot: u32,
    srgb_target: bool,
}

/// Same three depth layers as `SakuraParticles.tsx`.
fn build_petals() -> Vec<Petal> {
    // Small deterministic generator: the layout only needs to look random.
    let mut state = 0x9e37_79b9_u32;
    let mut random = move || {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        (state >> 8) as f32 / (1u32 << 24) as f32
    };
    let mut range = |min: f32, max: f32| min + random() * (max - min);

    let mut petals = Vec::new();
    // (count, size range, duration range, blur, peak opacity)
    let layers = [
        (BACK_PETALS, (12.0, 22.0), (30.0, 45.0), 1.4, 0.62),
        (MID_PETALS, (26.0, 46.0), (15.0, 25.0), 0.4, 0.78),
        (FRONT_PETALS, (120.0, 230.0), (9.0, 14.0), 13.0, 0.20),
    ];

    for (count, size, duration, blur, opacity) in layers {
        for _ in 0..count {
            petals.push(Petal {
                a: [range(1.0, 900.0), range(size.0, size.1), range(duration.0, duration.1), range(0.0, 1.0)],
                b: [range(0.0, std::f32::consts::TAU), range(0.6, 1.4), blur, opacity],
            });
        }
    }
    petals
}

impl shader::Pipeline for Pipeline {
    fn new(device: &wgpu::Device, queue: &wgpu::Queue, format: wgpu::TextureFormat) -> Self {
        let module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("koi scene"),
            source: wgpu::ShaderSource::Wgsl(include_str!("scene.wgsl").into()),
        });

        let uniforms = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("koi scene uniforms"),
            size: SLOT_SIZE * SLOTS as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let uniform_size = wgpu::BufferSize::new(std::mem::size_of::<Uniforms>() as u64);
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("koi scene layout"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: true,
                    min_binding_size: uniform_size,
                },
                count: None,
            }],
        });

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("koi scene bind group"),
            layout: &bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: wgpu::BindingResource::Buffer(wgpu::BufferBinding {
                    buffer: &uniforms,
                    offset: 0,
                    size: uniform_size,
                }),
            }],
        });

        let petals = build_petals();
        let instances = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("koi petals"),
            size: std::mem::size_of_val(petals.as_slice()) as u64,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        queue.write_buffer(&instances, 0, bytemuck::cast_slice(&petals));

        let layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("koi scene pipeline layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let petal_attributes = wgpu::vertex_attr_array![0 => Float32x4, 1 => Float32x4];
        let petal_buffers = [wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Petal>() as u64,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &petal_attributes,
        }];

        let create = |label: &str,
                      vertex: &str,
                      fragment: &str,
                      buffers: &[wgpu::VertexBufferLayout<'_>],
                      topology: wgpu::PrimitiveTopology,
                      blend: wgpu::BlendState| {
            device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some(label),
                layout: Some(&layout),
                vertex: wgpu::VertexState {
                    module: &module,
                    entry_point: Some(vertex),
                    buffers,
                    compilation_options: wgpu::PipelineCompilationOptions::default(),
                },
                fragment: Some(wgpu::FragmentState {
                    module: &module,
                    entry_point: Some(fragment),
                    targets: &[Some(wgpu::ColorTargetState {
                        format,
                        blend: Some(blend),
                        write_mask: wgpu::ColorWrites::ALL,
                    })],
                    compilation_options: wgpu::PipelineCompilationOptions::default(),
                }),
                primitive: wgpu::PrimitiveState { topology, ..Default::default() },
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview: None,
                cache: None,
            })
        };

        use wgpu::PrimitiveTopology::{TriangleList, TriangleStrip};
        const ALPHA_BLENDING: wgpu::BlendState = wgpu::BlendState::ALPHA_BLENDING;
        const REPLACE: wgpu::BlendState = wgpu::BlendState::REPLACE;

        Self {
            backdrop: create("koi backdrop", "vs_fullscreen", "fs_backdrop", &[], TriangleList, REPLACE),
            glass_back: create("koi glass back", "vs_fullscreen", "fs_glass_back", &[], TriangleList, ALPHA_BLENDING),
            glass_front: create("koi glass front", "vs_fullscreen", "fs_glass_front", &[], TriangleList, ALPHA_BLENDING),
            petals: create("koi petals", "vs_petal", "fs_petal", &petal_buffers, TriangleStrip, ALPHA_BLENDING),
            uniforms,
            bind_group,
            instances,
            next_slot: 0,
            srgb_target: format.is_srgb(),
        }
    }
}

fn rgb(color: Color) -> [f32; 3] {
    [color.r, color.g, color.b]
}

fn with_w(rgb: [f32; 3], w: f32) -> [f32; 4] {
    [rgb[0], rgb[1], rgb[2], w]
}

impl shader::Primitive for Layer {
    type Pipeline = Pipeline;

    fn prepare(
        &self,
        pipeline: &mut Pipeline,
        _device: &wgpu::Device,
        queue: &wgpu::Queue,
        bounds: &Rectangle,
        viewport: &Viewport,
    ) {
        let scale = viewport.scale_factor();
        let physical = |r: Rectangle| [r.x * scale, r.y * scale, r.width * scale, r.height * scale];
        let atmosphere = &self.atmosphere;
        let palette = &atmosphere.palette;
        let dark = palette.is_dark();

        let (rect, radius, glass, border, shadow, frost) = match self.kind {
            Kind::Backdrop => ([0.0; 4], 0.0, [0.0; 4], 0.0, 0.0, 0.0),
            Kind::Glass { radius, surface, margin } => {
                let frosted = atmosphere.frosted && surface != Surface::Dialog;
                let tint = match (surface, frosted) {
                    (Surface::Card, true) => palette.glass_surface,
                    (Surface::Panel, true) if dark => Color { a: 0.4, ..crate::theme::rgb(0x0e0820) },
                    (Surface::Panel, true) => palette.glass_surface,
                    (Surface::Dialog, _) => Color { a: 0.96, ..palette.card_solid },
                    (_, false) => palette.card_solid,
                };
                // Without a real blur the tint carries more of the frosted look than CSS's 0.4.
                let opacity = if frosted && dark { 0.58 } else { tint.a };
                let (border, shadow) = match (surface, dark) {
                    (Surface::Card, true) => (0.08, 0.55),
                    (Surface::Panel, true) => (0.06, 0.40),
                    (Surface::Dialog, true) => (0.12, 0.70),
                    (Surface::Dialog, false) => (0.16, 0.30),
                    (_, false) => (0.13, 0.14),
                };
                (
                    physical(bounds.shrink(margin)),
                    radius * scale,
                    with_w(rgb(tint), opacity),
                    border,
                    shadow,
                    if frosted { 1.0 } else { 0.0 },
                )
            }
        };

        let size = viewport.physical_size();
        let uniforms = Uniforms {
            resolution: [size.width as f32, size.height as f32],
            time: self.time,
            scale,
            viewport: physical(*bounds),
            rect,
            accent: with_w(rgb(atmosphere.accent), if dark { 1.0 } else { 0.85 }),
            base: with_w(rgb(palette.background), atmosphere.aura * if dark { 1.0 } else { 0.6 }),
            glass,
            params: [
                radius,
                if pipeline.srgb_target { 1.0 } else { 0.0 },
                if dark { 0.0 } else { 1.0 },
                atmosphere.pond,
            ],
            extra: [border, shadow, frost, if atmosphere.animated() { 1.0 } else { 0.0 }],
        };

        // Slots are handed out round-robin: every primitive of a frame is prepared
        // before any is drawn, and a frame never has more than `SLOTS` of them.
        let slot = pipeline.next_slot;
        pipeline.next_slot = (slot + 1) % SLOTS;
        self.slot.store(slot, Ordering::Relaxed);

        queue.write_buffer(&pipeline.uniforms, slot as u64 * SLOT_SIZE, bytemuck::bytes_of(&uniforms));
    }

    fn draw(&self, pipeline: &Pipeline, pass: &mut wgpu::RenderPass<'_>) -> bool {
        let offset = self.slot.load(Ordering::Relaxed) * SLOT_SIZE as u32;
        pass.set_bind_group(0, &pipeline.bind_group, &[offset]);

        let draw_petals = |pass: &mut wgpu::RenderPass<'_>| {
            let [back, mid, front] = self.atmosphere.petals;
            pass.set_pipeline(&pipeline.petals);
            pass.set_vertex_buffer(0, pipeline.instances.slice(..));
            for (first, count) in [(0, back), (BACK_PETALS, mid), (BACK_PETALS + MID_PETALS, front)] {
                if count > 0 {
                    pass.draw(0..4, first..first + count);
                }
            }
        };

        match self.kind {
            Kind::Backdrop => {
                pass.set_pipeline(&pipeline.backdrop);
                pass.draw(0..3, 0..1);
                draw_petals(pass);
            }
            Kind::Glass { surface, .. } => {
                if self.atmosphere.frosted && surface != Surface::Dialog {
                    pass.set_pipeline(&pipeline.glass_back);
                    pass.draw(0..3, 0..1);
                    draw_petals(pass);
                }
                pass.set_pipeline(&pipeline.glass_front);
                pass.draw(0..3, 0..1);
            }
        }

        true
    }
}
