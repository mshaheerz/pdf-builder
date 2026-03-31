use super::ImageData;
use crate::pdf::objects::{ObjectId, PdfObject, PdfDict, PdfStream};
use crate::pdf::writer::PdfWriter;

/// Create a PDF image XObject from decoded image data
pub fn create_image_xobject(
    writer: &mut PdfWriter,
    image: &ImageData,
) -> ObjectId {
    let mut dict = PdfDict::new();
    dict.set("Type", PdfObject::name("XObject"));
    dict.set("Subtype", PdfObject::name("Image"));
    dict.set("Width", PdfObject::int(image.width as i64));
    dict.set("Height", PdfObject::int(image.height as i64));
    dict.set("ColorSpace", PdfObject::name(image.color_space.pdf_name()));
    dict.set("BitsPerComponent", PdfObject::int(image.bits_per_component as i64));

    // Create soft mask for alpha channel
    if let Some(ref alpha) = image.alpha {
        let alpha_id = create_alpha_mask(writer, image.width, image.height, alpha);
        dict.set("SMask", PdfObject::reference(alpha_id));
    }

    writer.add_stream(dict, image.data.clone())
}

/// Create a JPEG image XObject (pass-through, no re-encoding)
pub fn create_jpeg_xobject(
    writer: &mut PdfWriter,
    jpeg_data: &[u8],
    width: u32,
    height: u32,
    components: u8,
) -> ObjectId {
    let color_space = match components {
        1 => "DeviceGray",
        3 => "DeviceRGB",
        4 => "DeviceCMYK",
        _ => "DeviceRGB",
    };

    let mut dict = PdfDict::new();
    dict.set("Type", PdfObject::name("XObject"));
    dict.set("Subtype", PdfObject::name("Image"));
    dict.set("Width", PdfObject::int(width as i64));
    dict.set("Height", PdfObject::int(height as i64));
    dict.set("ColorSpace", PdfObject::name(color_space));
    dict.set("BitsPerComponent", PdfObject::int(8));
    dict.set("Filter", PdfObject::name("DCTDecode"));
    dict.set("Length", PdfObject::int(jpeg_data.len() as i64));

    writer.add(PdfObject::Stream(PdfStream {
        dict,
        data: jpeg_data.to_vec(),
    }))
}

fn create_alpha_mask(
    writer: &mut PdfWriter,
    width: u32,
    height: u32,
    alpha: &[u8],
) -> ObjectId {
    let mut dict = PdfDict::new();
    dict.set("Type", PdfObject::name("XObject"));
    dict.set("Subtype", PdfObject::name("Image"));
    dict.set("Width", PdfObject::int(width as i64));
    dict.set("Height", PdfObject::int(height as i64));
    dict.set("ColorSpace", PdfObject::name("DeviceGray"));
    dict.set("BitsPerComponent", PdfObject::int(8));

    writer.add_stream(dict, alpha.to_vec())
}
