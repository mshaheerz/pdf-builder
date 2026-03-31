use super::objects::{ObjectId, PdfObject, PdfDict};
use super::writer::PdfWriter;
use super::page::{PageConfig, PageSize, Orientation, Margins};
use super::content_stream::ContentStream;
use super::color::Color;
use crate::font::builtin::{BuiltinFont, BUILTIN_FONTS};

/// High-level PDF document builder
pub struct PdfDocument {
    writer: PdfWriter,
    pages: Vec<PageData>,
    fonts: Vec<FontEntry>,
    images: Vec<ImageEntry>,
    ext_gstates: Vec<ExtGStateEntry>,
    metadata: DocumentMetadata,
}

struct PageData {
    config: PageConfig,
    content: ContentStream,
    font_refs: Vec<String>,    // font names used on this page
    image_refs: Vec<String>,   // image names used on this page
    gstate_refs: Vec<String>,  // ext gstate names used on this page
}

struct FontEntry {
    name: String,
    builtin: Option<BuiltinFont>,
    // For custom fonts, we'll add embedded font data later
    custom_data: Option<Vec<u8>>,
}

struct ImageEntry {
    name: String,
    data: Vec<u8>,
    width: u32,
    height: u32,
    color_space: String,
    bits_per_component: u8,
    is_jpeg: bool,
}

struct ExtGStateEntry {
    name: String,
    opacity: Option<f64>,
    stroke_opacity: Option<f64>,
}

#[derive(Default)]
pub struct DocumentMetadata {
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
}

impl PdfDocument {
    pub fn new() -> Self {
        Self {
            writer: PdfWriter::new(),
            pages: Vec::new(),
            fonts: Vec::new(),
            images: Vec::new(),
            ext_gstates: Vec::new(),
            metadata: DocumentMetadata::default(),
        }
    }

    pub fn set_metadata(&mut self, metadata: DocumentMetadata) {
        self.metadata = metadata;
    }

    pub fn set_compression(&mut self, enabled: bool) {
        self.writer.set_compression(enabled);
    }

    /// Add a built-in PDF font, returns the font name to use
    pub fn add_builtin_font(&mut self, font: BuiltinFont) -> String {
        let name = format!("F{}", self.fonts.len() + 1);
        self.fonts.push(FontEntry {
            name: name.clone(),
            builtin: Some(font),
            custom_data: None,
        });
        name
    }

    /// Add a custom TrueType font from raw bytes
    pub fn add_custom_font(&mut self, font_data: Vec<u8>) -> String {
        let name = format!("F{}", self.fonts.len() + 1);
        self.fonts.push(FontEntry {
            name: name.clone(),
            builtin: None,
            custom_data: Some(font_data),
        });
        name
    }

    /// Add a JPEG image
    pub fn add_jpeg_image(&mut self, data: Vec<u8>, width: u32, height: u32) -> String {
        let name = format!("Im{}", self.images.len() + 1);
        self.images.push(ImageEntry {
            name: name.clone(),
            data,
            width,
            height,
            color_space: "DeviceRGB".to_string(),
            bits_per_component: 8,
            is_jpeg: true,
        });
        name
    }

    /// Add a raw RGB image
    pub fn add_rgb_image(&mut self, data: Vec<u8>, width: u32, height: u32) -> String {
        let name = format!("Im{}", self.images.len() + 1);
        self.images.push(ImageEntry {
            name: name.clone(),
            data,
            width,
            height,
            color_space: "DeviceRGB".to_string(),
            bits_per_component: 8,
            is_jpeg: false,
        });
        name
    }

    /// Register an opacity graphics state, returns name
    pub fn add_opacity(&mut self, fill_opacity: f64, stroke_opacity: f64) -> String {
        let name = format!("GS{}", self.ext_gstates.len() + 1);
        self.ext_gstates.push(ExtGStateEntry {
            name: name.clone(),
            opacity: Some(fill_opacity),
            stroke_opacity: Some(stroke_opacity),
        });
        name
    }

    /// Add a new page, returns page index
    pub fn add_page(&mut self, config: PageConfig) -> usize {
        let idx = self.pages.len();
        self.pages.push(PageData {
            config,
            content: ContentStream::new(),
            font_refs: Vec::new(),
            image_refs: Vec::new(),
            gstate_refs: Vec::new(),
        });
        idx
    }

    /// Add a page with default config
    pub fn add_default_page(&mut self) -> usize {
        self.add_page(PageConfig::default())
    }

    /// Get mutable content stream for a page
    pub fn page_content(&mut self, page_idx: usize) -> &mut ContentStream {
        &mut self.pages[page_idx].content
    }

    /// Get page config
    pub fn page_config(&self, page_idx: usize) -> &PageConfig {
        &self.pages[page_idx].config
    }

    /// Mark a font as used on a page
    pub fn use_font_on_page(&mut self, page_idx: usize, font_name: &str) {
        let page = &mut self.pages[page_idx];
        if !page.font_refs.contains(&font_name.to_string()) {
            page.font_refs.push(font_name.to_string());
        }
    }

    /// Mark an image as used on a page
    pub fn use_image_on_page(&mut self, page_idx: usize, image_name: &str) {
        let page = &mut self.pages[page_idx];
        if !page.image_refs.contains(&image_name.to_string()) {
            page.image_refs.push(image_name.to_string());
        }
    }

    /// Mark a graphics state as used on a page
    pub fn use_gstate_on_page(&mut self, page_idx: usize, gs_name: &str) {
        let page = &mut self.pages[page_idx];
        if !page.gstate_refs.contains(&gs_name.to_string()) {
            page.gstate_refs.push(gs_name.to_string());
        }
    }

    /// Build and return the complete PDF bytes
    pub fn build(mut self) -> Vec<u8> {
        let writer = &mut self.writer;

        // 1. Create font objects
        let mut font_obj_ids: Vec<(String, ObjectId)> = Vec::new();
        for font in &self.fonts {
            let id = if let Some(builtin) = &font.builtin {
                let mut dict = PdfDict::new();
                dict.set("Type", PdfObject::name("Font"));
                dict.set("Subtype", PdfObject::name("Type1"));
                dict.set("BaseFont", PdfObject::name(builtin.pdf_name()));
                if builtin.needs_encoding() {
                    dict.set("Encoding", PdfObject::name("WinAnsiEncoding"));
                }
                writer.add(PdfObject::dict(dict))
            } else if let Some(ref _data) = font.custom_data {
                // TODO: Full TrueType embedding - for now create placeholder
                let mut dict = PdfDict::new();
                dict.set("Type", PdfObject::name("Font"));
                dict.set("Subtype", PdfObject::name("TrueType"));
                dict.set("BaseFont", PdfObject::name("CustomFont"));
                dict.set("Encoding", PdfObject::name("WinAnsiEncoding"));
                writer.add(PdfObject::dict(dict))
            } else {
                unreachable!()
            };
            font_obj_ids.push((font.name.clone(), id));
        }

        // 2. Create image XObject
        let mut image_obj_ids: Vec<(String, ObjectId)> = Vec::new();
        for img in &self.images {
            let mut dict = PdfDict::new();
            dict.set("Type", PdfObject::name("XObject"));
            dict.set("Subtype", PdfObject::name("Image"));
            dict.set("Width", PdfObject::int(img.width as i64));
            dict.set("Height", PdfObject::int(img.height as i64));
            dict.set("ColorSpace", PdfObject::name(&img.color_space));
            dict.set("BitsPerComponent", PdfObject::int(img.bits_per_component as i64));

            let id = if img.is_jpeg {
                dict.set("Filter", PdfObject::name("DCTDecode"));
                dict.set("Length", PdfObject::int(img.data.len() as i64));
                writer.add(PdfObject::Stream(super::objects::PdfStream {
                    dict,
                    data: img.data.clone(),
                }))
            } else {
                writer.add_stream(dict, img.data.clone())
            };
            image_obj_ids.push((img.name.clone(), id));
        }

        // 3. Create ExtGState objects
        let mut gstate_obj_ids: Vec<(String, ObjectId)> = Vec::new();
        for gs in &self.ext_gstates {
            let mut dict = PdfDict::new();
            dict.set("Type", PdfObject::name("ExtGState"));
            if let Some(op) = gs.opacity {
                dict.set("ca", PdfObject::real(op));
            }
            if let Some(op) = gs.stroke_opacity {
                dict.set("CA", PdfObject::real(op));
            }
            let id = writer.add(PdfObject::dict(dict));
            gstate_obj_ids.push((gs.name.clone(), id));
        }

        // 4. Create page objects
        let pages_id = writer.alloc_id();
        let mut page_ids = Vec::new();

        for page in &self.pages {
            let (w, h) = page.config.media_box();

            // Content stream
            let content_data = page.content.data.clone();
            let content_id = writer.add_stream(PdfDict::new(), content_data);

            // Resources dictionary
            let mut resources = PdfDict::new();

            // Font resources
            if !page.font_refs.is_empty() {
                let mut font_dict = PdfDict::new();
                for fname in &page.font_refs {
                    if let Some((_, fid)) = font_obj_ids.iter().find(|(n, _)| n == fname) {
                        font_dict.set(fname.clone(), PdfObject::reference(*fid));
                    }
                }
                resources.set("Font", PdfObject::dict(font_dict));
            }

            // XObject resources (images)
            if !page.image_refs.is_empty() {
                let mut xobj_dict = PdfDict::new();
                for iname in &page.image_refs {
                    if let Some((_, iid)) = image_obj_ids.iter().find(|(n, _)| n == iname) {
                        xobj_dict.set(iname.clone(), PdfObject::reference(*iid));
                    }
                }
                resources.set("XObject", PdfObject::dict(xobj_dict));
            }

            // ExtGState resources
            if !page.gstate_refs.is_empty() {
                let mut gs_dict = PdfDict::new();
                for gname in &page.gstate_refs {
                    if let Some((_, gid)) = gstate_obj_ids.iter().find(|(n, _)| n == gname) {
                        gs_dict.set(gname.clone(), PdfObject::reference(*gid));
                    }
                }
                resources.set("ExtGState", PdfObject::dict(gs_dict));
            }

            // Page object
            let mut page_dict = PdfDict::new();
            page_dict.set("Type", PdfObject::name("Page"));
            page_dict.set("Parent", PdfObject::reference(pages_id));
            page_dict.set("MediaBox", PdfObject::array(vec![
                PdfObject::int(0), PdfObject::int(0),
                PdfObject::real(w), PdfObject::real(h),
            ]));
            page_dict.set("Contents", PdfObject::reference(content_id));
            page_dict.set("Resources", PdfObject::dict(resources));

            let page_id = writer.add(PdfObject::dict(page_dict));
            page_ids.push(page_id);
        }

        // 5. Pages tree
        let mut pages_dict = PdfDict::new();
        pages_dict.set("Type", PdfObject::name("Pages"));
        pages_dict.set("Kids", PdfObject::array(
            page_ids.iter().map(|id| PdfObject::reference(*id)).collect()
        ));
        pages_dict.set("Count", PdfObject::int(page_ids.len() as i64));
        writer.add_object(pages_id, PdfObject::dict(pages_dict));

        // 6. Catalog
        let mut catalog = PdfDict::new();
        catalog.set("Type", PdfObject::name("Catalog"));
        catalog.set("Pages", PdfObject::reference(pages_id));
        let catalog_id = writer.add(PdfObject::dict(catalog));

        // 7. Info dictionary (metadata)
        if self.metadata.title.is_some() || self.metadata.author.is_some() {
            let mut info = PdfDict::new();
            if let Some(ref t) = self.metadata.title {
                info.set("Title", PdfObject::literal_string(t.as_bytes()));
            }
            if let Some(ref a) = self.metadata.author {
                info.set("Author", PdfObject::literal_string(a.as_bytes()));
            }
            if let Some(ref s) = self.metadata.subject {
                info.set("Subject", PdfObject::literal_string(s.as_bytes()));
            }
            info.set("Creator", PdfObject::literal_string(
                self.metadata.creator.as_deref().unwrap_or("PDF Builder").as_bytes()
            ));
            writer.add(PdfObject::dict(info));
        }

        writer.write(catalog_id)
    }
}

impl Default for PdfDocument {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::font::builtin::BuiltinFont;

    #[test]
    fn test_empty_document() {
        let mut doc = PdfDocument::new();
        doc.add_default_page();
        let bytes = doc.build();
        let s = String::from_utf8_lossy(&bytes);
        assert!(s.starts_with("%PDF-1.7"));
        assert!(s.contains("%%EOF"));
    }

    #[test]
    fn test_document_with_text() {
        let mut doc = PdfDocument::new();
        let font = doc.add_builtin_font(BuiltinFont::Helvetica);
        let page = doc.add_default_page();
        doc.use_font_on_page(page, &font);

        let cs = doc.page_content(page);
        cs.begin_text();
        cs.set_font(&font, 24.0);
        cs.text_move(100.0, 700.0);
        cs.show_text("Hello, World!");
        cs.end_text();

        let bytes = doc.build();
        assert!(bytes.len() > 100);
        let s = String::from_utf8_lossy(&bytes);
        assert!(s.contains("/Helvetica"));
        assert!(s.contains("Hello, World!"));
    }

    #[test]
    fn test_document_with_shapes() {
        let mut doc = PdfDocument::new();
        let page = doc.add_default_page();

        let cs = doc.page_content(page);
        cs.save_state();
        cs.set_fill_color(&Color::from_hex("#FF6B6B").unwrap());
        cs.set_stroke_color(&Color::black());
        cs.set_line_width(2.0);
        cs.rounded_rect(100.0, 600.0, 200.0, 100.0, 10.0);
        cs.fill_and_stroke();
        cs.restore_state();

        cs.save_state();
        cs.set_fill_color(&Color::from_hex("#4ECDC4").unwrap());
        cs.circle(300.0, 400.0, 50.0);
        cs.fill();
        cs.restore_state();

        let bytes = doc.build();
        assert!(bytes.len() > 100);
    }

    #[test]
    fn test_multi_page() {
        let mut doc = PdfDocument::new();
        let font = doc.add_builtin_font(BuiltinFont::Helvetica);

        for i in 0..3 {
            let page = doc.add_default_page();
            doc.use_font_on_page(page, &font);
            let cs = doc.page_content(page);
            cs.begin_text();
            cs.set_font(&font, 18.0);
            cs.text_move(100.0, 700.0);
            cs.show_text(&format!("Page {}", i + 1));
            cs.end_text();
        }

        let bytes = doc.build();
        let s = String::from_utf8_lossy(&bytes);
        assert!(s.contains("/Count 3"));
    }
}
