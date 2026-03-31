use miniz_oxide::deflate::compress_to_vec_zlib;
use miniz_oxide::inflate::decompress_to_vec_zlib;

/// Compress data using Flate/Deflate (zlib)
pub fn deflate(data: &[u8]) -> Option<Vec<u8>> {
    let compressed = compress_to_vec_zlib(data, 6);
    if compressed.len() < data.len() {
        Some(compressed)
    } else {
        // Don't compress if it makes it larger
        None
    }
}

/// Decompress Flate/Deflate data
pub fn inflate(data: &[u8]) -> Option<Vec<u8>> {
    decompress_to_vec_zlib(data).ok()
}

/// ASCII85 encode
pub fn ascii85_encode(data: &[u8]) -> Vec<u8> {
    let mut result = Vec::new();
    result.extend_from_slice(b"<~");

    let chunks = data.chunks(4);
    for chunk in chunks {
        let mut val: u32 = 0;
        for (i, &byte) in chunk.iter().enumerate() {
            val |= (byte as u32) << (24 - i * 8);
        }

        if chunk.len() == 4 && val == 0 {
            result.push(b'z');
        } else {
            let mut encoded = [0u8; 5];
            for i in (0..5).rev() {
                encoded[i] = (val % 85 + 33) as u8;
                val /= 85;
            }
            let count = chunk.len() + 1;
            result.extend_from_slice(&encoded[..count]);
        }
    }

    result.extend_from_slice(b"~>");
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deflate_inflate() {
        let data = b"Hello, World! Hello, World! Hello, World!";
        let compressed = deflate(data).unwrap();
        let decompressed = inflate(&compressed).unwrap();
        assert_eq!(decompressed, data);
    }
}
