//! A container whose background is a glass surface drawn by the scene shader.

use iced::advanced::layout::{self, Layout};
use iced::advanced::renderer;
use iced::advanced::widget::{tree, Operation, Tree};
use iced::advanced::Renderer as _;
use iced::advanced::{mouse, overlay, Clipboard, Shell, Widget};
use iced::widget::container;
use iced::{alignment, Element, Event, Length, Padding, Rectangle, Renderer, Size, Theme, Vector};
use iced_wgpu::primitive::Renderer as _;

use super::{Atmosphere, Kind, Layer, Surface};

/// Space around the surface reserved for its drop shadow.
const SHADOW_MARGIN: f32 = 44.0;

pub struct Glass<'a, Message> {
    content: Element<'a, Message>,
    atmosphere: Atmosphere,
    surface: Surface,
    radius: f32,
    width: Length,
    height: Length,
    padding: Padding,
}

/// Wraps `content` in a glass surface.
pub fn glass<'a, Message>(content: impl Into<Element<'a, Message>>, atmosphere: Atmosphere) -> Glass<'a, Message> {
    Glass {
        content: content.into(),
        atmosphere,
        surface: Surface::Card,
        radius: 32.0,
        width: Length::Shrink,
        height: Length::Shrink,
        padding: Padding::ZERO,
    }
}

impl<Message> Glass<'_, Message> {
    pub fn surface(mut self, surface: Surface) -> Self {
        self.surface = surface;
        self
    }

    pub fn radius(mut self, radius: f32) -> Self {
        self.radius = radius;
        self
    }

    pub fn width(mut self, width: impl Into<Length>) -> Self {
        self.width = width.into();
        self
    }

    pub fn height(mut self, height: impl Into<Length>) -> Self {
        self.height = height.into();
        self
    }

    pub fn padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }
}

impl<Message> Widget<Message, Theme, Renderer> for Glass<'_, Message> {
    fn tag(&self) -> tree::Tag {
        self.content.as_widget().tag()
    }

    fn state(&self) -> tree::State {
        self.content.as_widget().state()
    }

    fn children(&self) -> Vec<Tree> {
        self.content.as_widget().children()
    }

    fn diff(&self, tree: &mut Tree) {
        self.content.as_widget().diff(tree);
    }

    fn size(&self) -> Size<Length> {
        Size { width: self.width, height: self.height }
    }

    fn layout(&mut self, tree: &mut Tree, renderer: &Renderer, limits: &layout::Limits) -> layout::Node {
        container::layout(
            limits,
            self.width,
            self.height,
            f32::INFINITY,
            f32::INFINITY,
            self.padding,
            alignment::Horizontal::Left,
            alignment::Vertical::Top,
            |limits| self.content.as_widget_mut().layout(tree, renderer, limits),
        )
    }

    fn operate(&mut self, tree: &mut Tree, layout: Layout<'_>, renderer: &Renderer, operation: &mut dyn Operation) {
        operation.container(None, layout.bounds());
        operation.traverse(&mut |operation| {
            self.content
                .as_widget_mut()
                .operate(tree, layout.children().next().unwrap(), renderer, operation);
        });
    }

    fn update(
        &mut self,
        tree: &mut Tree,
        event: &Event,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        renderer: &Renderer,
        clipboard: &mut dyn Clipboard,
        shell: &mut Shell<'_, Message>,
        viewport: &Rectangle,
    ) {
        self.content.as_widget_mut().update(
            tree,
            event,
            layout.children().next().unwrap(),
            cursor,
            renderer,
            clipboard,
            shell,
            viewport,
        );
    }

    fn mouse_interaction(
        &self,
        tree: &Tree,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        viewport: &Rectangle,
        renderer: &Renderer,
    ) -> mouse::Interaction {
        self.content
            .as_widget()
            .mouse_interaction(tree, layout.children().next().unwrap(), cursor, viewport, renderer)
    }

    fn draw(
        &self,
        tree: &Tree,
        renderer: &mut Renderer,
        theme: &Theme,
        style: &renderer::Style,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        viewport: &Rectangle,
    ) {
        let bounds = layout.bounds();
        let Some(visible) = bounds.intersection(viewport) else {
            return;
        };

        renderer.draw_primitive(
            bounds.expand(SHADOW_MARGIN),
            Layer::new(
                Kind::Glass { radius: self.radius, surface: self.surface, margin: SHADOW_MARGIN },
                self.atmosphere,
            ),
        );

        // Shader primitives are painted after the quads and meshes of their own layer,
        // so the content goes on a layer above the surface.
        renderer.with_layer(visible, |renderer| {
            self.content.as_widget().draw(
                tree,
                renderer,
                theme,
                style,
                layout.children().next().unwrap(),
                cursor,
                &visible,
            );
        });
    }

    fn overlay<'b>(
        &'b mut self,
        tree: &'b mut Tree,
        layout: Layout<'b>,
        renderer: &Renderer,
        viewport: &Rectangle,
        translation: Vector,
    ) -> Option<overlay::Element<'b, Message, Theme, Renderer>> {
        self.content
            .as_widget_mut()
            .overlay(tree, layout.children().next().unwrap(), renderer, viewport, translation)
    }
}

impl<'a, Message: 'a> From<Glass<'a, Message>> for Element<'a, Message> {
    fn from(glass: Glass<'a, Message>) -> Self {
        Element::new(glass)
    }
}
