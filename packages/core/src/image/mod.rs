pub mod decoder;
pub mod encoder;
pub mod color_space;

/// Decoded image data ready for PDF embedding
#[derive(Debug, Clone)]
pub struct ImageData {
    pub width: u32,
    pub height: u32,
    pub color_space: ImageColorSpace,
    pub bits_per_component: u8,
    pub data: Vec<u8>,
    pub alpha: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Copy)]
pub enum ImageColorSpace {
    Rgb,
    Grayscale,
    Cmyk,
}

impl ImageColorSpace {
    pub fn pdf_name(&self) -> &'static str {
        match self {
            Self::Rgb => "DeviceRGB",
            Self::Grayscale => "DeviceGray",
            Self::Cmyk => "DeviceCMYK",
        }
    }

    pub fn components(&self) -> u8 {
        match self {
            Self::Rgb => 3,
            Self::Grayscale => 1,
            Self::Cmyk => 4,
        }
    }
}
