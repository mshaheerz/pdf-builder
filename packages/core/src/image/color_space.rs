/// Convert RGB pixel data to Grayscale
pub fn rgb_to_grayscale(data: &[u8]) -> Vec<u8> {
    data.chunks(3)
        .map(|rgb| {
            let r = rgb[0] as f64;
            let g = rgb[1] as f64;
            let b = rgb[2] as f64;
            (0.299 * r + 0.587 * g + 0.114 * b) as u8
        })
        .collect()
}

/// Convert RGB pixel data to CMYK
pub fn rgb_to_cmyk(data: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(data.len() / 3 * 4);
    for rgb in data.chunks(3) {
        let r = rgb[0] as f64 / 255.0;
        let g = rgb[1] as f64 / 255.0;
        let b = rgb[2] as f64 / 255.0;
        let k = 1.0 - r.max(g).max(b);
        if k >= 1.0 {
            result.extend_from_slice(&[0, 0, 0, 255]);
        } else {
            let c = ((1.0 - r - k) / (1.0 - k) * 255.0) as u8;
            let m = ((1.0 - g - k) / (1.0 - k) * 255.0) as u8;
            let y = ((1.0 - b - k) / (1.0 - k) * 255.0) as u8;
            let k = (k * 255.0) as u8;
            result.extend_from_slice(&[c, m, y, k]);
        }
    }
    result
}

/// Convert CMYK pixel data to RGB
pub fn cmyk_to_rgb(data: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(data.len() / 4 * 3);
    for cmyk in data.chunks(4) {
        let c = cmyk[0] as f64 / 255.0;
        let m = cmyk[1] as f64 / 255.0;
        let y = cmyk[2] as f64 / 255.0;
        let k = cmyk[3] as f64 / 255.0;
        let r = ((1.0 - c) * (1.0 - k) * 255.0) as u8;
        let g = ((1.0 - m) * (1.0 - k) * 255.0) as u8;
        let b = ((1.0 - y) * (1.0 - k) * 255.0) as u8;
        result.extend_from_slice(&[r, g, b]);
    }
    result
}
