use super::{ImageData, ImageColorSpace};

/// Detect image format from magic bytes
pub enum ImageFormat {
    Jpeg,
    Png,
    Unknown,
}

pub fn detect_format(data: &[u8]) -> ImageFormat {
    if data.len() >= 2 && data[0] == 0xFF && data[1] == 0xD8 {
        ImageFormat::Jpeg
    } else if data.len() >= 8 && &data[0..8] == b"\x89PNG\r\n\x1a\n" {
        ImageFormat::Png
    } else {
        ImageFormat::Unknown
    }
}

/// Decode JPEG - for PDF we can pass through raw JPEG data with DCTDecode filter
/// We just need to extract dimensions and color info from headers
pub fn decode_jpeg_header(data: &[u8]) -> Result<(u32, u32, u8), String> {
    let mut i = 2; // skip SOI marker
    while i + 4 < data.len() {
        if data[i] != 0xFF {
            return Err("Invalid JPEG marker".into());
        }
        let marker = data[i + 1];
        let length = u16::from_be_bytes([data[i + 2], data[i + 3]]) as usize;

        // SOF markers (Start of Frame)
        if matches!(marker, 0xC0 | 0xC1 | 0xC2) {
            if i + 9 < data.len() {
                let height = u16::from_be_bytes([data[i + 5], data[i + 6]]) as u32;
                let width = u16::from_be_bytes([data[i + 7], data[i + 8]]) as u32;
                let components = data[i + 9];
                return Ok((width, height, components));
            }
        }

        i += 2 + length;
    }
    Err("Could not find JPEG SOF marker".into())
}

/// Minimal PNG decoder - extracts raw pixel data
/// PNG structure: signature + chunks (IHDR, IDAT, IEND, etc.)
pub fn decode_png(data: &[u8]) -> Result<ImageData, String> {
    if data.len() < 33 || &data[0..8] != b"\x89PNG\r\n\x1a\n" {
        return Err("Not a PNG file".into());
    }

    // Parse IHDR chunk (must be first)
    let ihdr_len = u32::from_be_bytes([data[8], data[9], data[10], data[11]]) as usize;
    if &data[12..16] != b"IHDR" || ihdr_len < 13 {
        return Err("Missing IHDR chunk".into());
    }

    let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
    let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
    let bit_depth = data[24];
    let color_type = data[25];
    let compression = data[26];
    let _filter = data[27];
    let interlace = data[28];

    if compression != 0 {
        return Err("Unsupported PNG compression method".into());
    }
    if interlace != 0 {
        return Err("Interlaced PNG not yet supported".into());
    }

    // Collect all IDAT chunks
    let mut idat_data = Vec::new();
    let mut pos = 8; // after signature
    while pos + 12 <= data.len() {
        let chunk_len = u32::from_be_bytes([data[pos], data[pos+1], data[pos+2], data[pos+3]]) as usize;
        let chunk_type = &data[pos+4..pos+8];

        if chunk_type == b"IDAT" {
            let start = pos + 8;
            let end = start + chunk_len;
            if end <= data.len() {
                idat_data.extend_from_slice(&data[start..end]);
            }
        }

        pos += 12 + chunk_len; // 4 len + 4 type + data + 4 crc
    }

    // Decompress IDAT data (zlib)
    let decompressed = crate::compression::inflate(&idat_data)
        .ok_or("Failed to decompress PNG data")?;

    // Determine components per pixel
    let (components, has_alpha) = match color_type {
        0 => (1, false),  // Grayscale
        2 => (3, false),  // RGB
        4 => (2, true),   // Grayscale + Alpha
        6 => (4, true),   // RGBA
        _ => return Err(format!("Unsupported PNG color type: {}", color_type)),
    };

    // Unfilter scanlines
    let stride = (width as usize) * components;
    let mut pixels = Vec::with_capacity(height as usize * stride);
    let mut prev_row = vec![0u8; stride];
    let bpp = components; // bytes per pixel (assuming 8-bit)

    let mut offset = 0;
    for _y in 0..height {
        if offset >= decompressed.len() {
            return Err("Truncated PNG image data".into());
        }
        let filter_type = decompressed[offset];
        offset += 1;

        let row_end = offset + stride;
        if row_end > decompressed.len() {
            return Err("Truncated PNG scanline".into());
        }
        let raw_row = &decompressed[offset..row_end];

        let mut row = vec![0u8; stride];
        for x in 0..stride {
            let raw = raw_row[x];
            let a = if x >= bpp { row[x - bpp] } else { 0 };
            let b = prev_row[x];
            let c = if x >= bpp { prev_row[x - bpp] } else { 0 };

            row[x] = match filter_type {
                0 => raw,
                1 => raw.wrapping_add(a),
                2 => raw.wrapping_add(b),
                3 => raw.wrapping_add(((a as u16 + b as u16) / 2) as u8),
                4 => raw.wrapping_add(paeth_predictor(a, b, c)),
                _ => return Err(format!("Unknown PNG filter type: {}", filter_type)),
            };
        }

        pixels.extend_from_slice(&row);
        prev_row = row;
        offset = row_end;
    }

    // Separate alpha channel if present
    let (color_data, alpha_data) = if has_alpha {
        let color_components = components - 1;
        let mut colors = Vec::with_capacity(width as usize * height as usize * color_components);
        let mut alpha = Vec::with_capacity(width as usize * height as usize);

        for pixel in pixels.chunks(components) {
            colors.extend_from_slice(&pixel[..color_components]);
            alpha.push(pixel[color_components]);
        }
        (colors, Some(alpha))
    } else {
        (pixels, None)
    };

    let color_space = match color_type {
        0 | 4 => ImageColorSpace::Grayscale,
        _ => ImageColorSpace::Rgb,
    };

    Ok(ImageData {
        width,
        height,
        color_space,
        bits_per_component: bit_depth,
        data: color_data,
        alpha: alpha_data,
    })
}

fn paeth_predictor(a: u8, b: u8, c: u8) -> u8 {
    let (a, b, c) = (a as i16, b as i16, c as i16);
    let p = a + b - c;
    let pa = (p - a).abs();
    let pb = (p - b).abs();
    let pc = (p - c).abs();
    if pa <= pb && pa <= pc {
        a as u8
    } else if pb <= pc {
        b as u8
    } else {
        c as u8
    }
}
