//! The "Koi" wordmark icon, decoded from the PNGs in `assets/app`.

use iced::window;

static WINDOW_PNG: &[u8] = include_bytes!("../assets/app/128x128.png");
static TRAY_PNG: &[u8] = include_bytes!("../assets/app/32x32.png");

/// RGBA pixels, width and height of a PNG.
fn decode(png: &[u8]) -> Option<(Vec<u8>, u32, u32)> {
    let mut decoder = png::Decoder::new(std::io::Cursor::new(png));
    // Palette, grey or 16-bit images all come out as 8-bit RGB(A).
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder.read_info().ok()?;

    let mut buffer = vec![0; reader.output_buffer_size()?];
    let info = reader.next_frame(&mut buffer).ok()?;
    buffer.truncate(info.buffer_size());

    let rgba = match info.color_type {
        png::ColorType::Rgba => buffer,
        png::ColorType::Rgb => buffer.as_chunks::<3>().0.iter().flat_map(|&[r, g, b]| [r, g, b, 255]).collect(),
        png::ColorType::GrayscaleAlpha => buffer.as_chunks::<2>().0.iter().flat_map(|&[g, a]| [g, g, g, a]).collect(),
        png::ColorType::Grayscale => buffer.iter().flat_map(|&g| [g, g, g, 255]).collect(),
        png::ColorType::Indexed => return None,
    };
    Some((rgba, info.width, info.height))
}

pub fn window() -> Option<window::Icon> {
    let (rgba, width, height) = decode(WINDOW_PNG)?;
    window::icon::from_rgba(rgba, width, height).ok()
}

pub fn tray() -> Option<(Vec<u8>, u32, u32)> {
    decode(TRAY_PNG)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_icons_decode_to_rgba() {
        let (rgba, width, height) = decode(TRAY_PNG).expect("tray icon decodes");
        assert_eq!((width, height), (32, 32));
        assert_eq!(rgba.len(), 32 * 32 * 4);
        assert!(decode(WINDOW_PNG).is_some());
    }
}
