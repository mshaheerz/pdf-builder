use super::objects::{ObjectId, PdfObject, PdfDict, PdfStream};
use super::cross_ref::XRefTable;
use crate::compression;

/// Writes complete PDF binary from objects
pub struct PdfWriter {
    objects: Vec<(ObjectId, PdfObject)>,
    next_id: u32,
    compress: bool,
}

impl PdfWriter {
    pub fn new() -> Self {
        Self {
            objects: Vec::new(),
            next_id: 1,
            compress: true,
        }
    }

    pub fn set_compression(&mut self, enabled: bool) {
        self.compress = enabled;
    }

    /// Allocate next object ID
    pub fn alloc_id(&mut self) -> ObjectId {
        let id = ObjectId(self.next_id, 0);
        self.next_id += 1;
        id
    }

    /// Add an object with a specific ID
    pub fn add_object(&mut self, id: ObjectId, obj: PdfObject) {
        self.objects.push((id, obj));
    }

    /// Allocate ID and add object, return the ID
    pub fn add(&mut self, obj: PdfObject) -> ObjectId {
        let id = self.alloc_id();
        self.objects.push((id, obj));
        id
    }

    /// Add a stream object with optional compression
    pub fn add_stream(&mut self, mut dict: PdfDict, data: Vec<u8>) -> ObjectId {
        let final_data = if self.compress {
            match compression::deflate(&data) {
                Some(compressed) => {
                    dict.set("Filter", PdfObject::name("FlateDecode"));
                    compressed
                }
                None => data,
            }
        } else {
            data
        };

        dict.set("Length", PdfObject::int(final_data.len() as i64));

        self.add(PdfObject::Stream(PdfStream {
            dict,
            data: final_data,
        }))
    }

    /// Write complete PDF to bytes
    pub fn write(&self, catalog_id: ObjectId) -> Vec<u8> {
        let mut buf = Vec::with_capacity(4096);
        let mut xref = XRefTable::new();

        // Header
        buf.extend_from_slice(b"%PDF-1.7\n");
        // Binary comment (signals binary content)
        buf.extend_from_slice(b"%\xE2\xE3\xCF\xD3\n");

        // Body: write each object
        for (id, obj) in &self.objects {
            let offset = buf.len();
            xref.add(*id, offset);

            let header = format!("{} {} obj\n", id.0, id.1);
            buf.extend_from_slice(header.as_bytes());
            obj.write_to(&mut buf);
            buf.extend_from_slice(b"\nendobj\n\n");
        }

        // Cross-reference table
        let xref_offset = xref.write_to(&mut buf);

        // Trailer
        let mut trailer = PdfDict::new();
        trailer.set("Size", PdfObject::int(self.next_id as i64));
        trailer.set("Root", PdfObject::reference(catalog_id));

        buf.extend_from_slice(b"trailer\n");
        let mut trailer_bytes = Vec::new();
        PdfObject::dict(trailer).write_to(&mut trailer_bytes);
        buf.extend_from_slice(&trailer_bytes);
        buf.push(b'\n');

        // startxref
        let s = format!("startxref\n{}\n%%EOF\n", xref_offset);
        buf.extend_from_slice(s.as_bytes());

        buf
    }
}

impl Default for PdfWriter {
    fn default() -> Self {
        Self::new()
    }
}
