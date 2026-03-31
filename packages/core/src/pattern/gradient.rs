use super::fill::{LinearGradient, RadialGradient, GradientStop};
use crate::pdf::objects::{ObjectId, PdfObject, PdfDict};
use crate::pdf::writer::PdfWriter;
use crate::pdf::color::Color;

/// Create a PDF shading object for a linear gradient
pub fn create_linear_gradient_shading(
    writer: &mut PdfWriter,
    gradient: &LinearGradient,
    x: f64, y: f64, width: f64, height: f64,
) -> ObjectId {
    let angle_rad = gradient.angle * std::f64::consts::PI / 180.0;
    let dx = angle_rad.cos();
    let dy = angle_rad.sin();

    // Calculate start/end coordinates
    let half_w = width / 2.0;
    let half_h = height / 2.0;
    let x0 = x + half_w - dx * half_w;
    let y0 = y + half_h - dy * half_h;
    let x1 = x + half_w + dx * half_w;
    let y1 = y + half_h + dy * half_h;

    // Create function for color interpolation
    let function_id = create_gradient_function(writer, &gradient.stops);

    let mut shading = PdfDict::new();
    shading.set("ShadingType", PdfObject::int(2)); // Axial
    shading.set("ColorSpace", PdfObject::name("DeviceRGB"));
    shading.set("Coords", PdfObject::array(vec![
        PdfObject::real(x0), PdfObject::real(y0),
        PdfObject::real(x1), PdfObject::real(y1),
    ]));
    shading.set("Function", PdfObject::reference(function_id));
    shading.set("Extend", PdfObject::array(vec![
        PdfObject::bool(true), PdfObject::bool(true),
    ]));

    writer.add(PdfObject::dict(shading))
}

/// Create a PDF shading object for a radial gradient
pub fn create_radial_gradient_shading(
    writer: &mut PdfWriter,
    gradient: &RadialGradient,
    x: f64, y: f64, width: f64, height: f64,
) -> ObjectId {
    let cx = x + gradient.cx * width;
    let cy = y + gradient.cy * height;
    let r = gradient.r * width.max(height);

    let function_id = create_gradient_function(writer, &gradient.stops);

    let mut shading = PdfDict::new();
    shading.set("ShadingType", PdfObject::int(3)); // Radial
    shading.set("ColorSpace", PdfObject::name("DeviceRGB"));
    shading.set("Coords", PdfObject::array(vec![
        PdfObject::real(cx), PdfObject::real(cy), PdfObject::real(0.0),
        PdfObject::real(cx), PdfObject::real(cy), PdfObject::real(r),
    ]));
    shading.set("Function", PdfObject::reference(function_id));
    shading.set("Extend", PdfObject::array(vec![
        PdfObject::bool(true), PdfObject::bool(true),
    ]));

    writer.add(PdfObject::dict(shading))
}

fn create_gradient_function(writer: &mut PdfWriter, stops: &[GradientStop]) -> ObjectId {
    if stops.len() == 2 {
        // Simple two-color interpolation
        let c0 = Color::from_hex(&stops[0].color).unwrap_or(Color::black()).to_rgb();
        let c1 = Color::from_hex(&stops[1].color).unwrap_or(Color::white()).to_rgb();

        let mut func = PdfDict::new();
        func.set("FunctionType", PdfObject::int(2));
        func.set("Domain", PdfObject::array(vec![PdfObject::real(0.0), PdfObject::real(1.0)]));
        func.set("C0", PdfObject::array(vec![
            PdfObject::real(c0.0), PdfObject::real(c0.1), PdfObject::real(c0.2),
        ]));
        func.set("C1", PdfObject::array(vec![
            PdfObject::real(c1.0), PdfObject::real(c1.1), PdfObject::real(c1.2),
        ]));
        func.set("N", PdfObject::real(1.0));

        writer.add(PdfObject::dict(func))
    } else {
        // Multi-stop: stitching function
        let mut functions = Vec::new();
        let mut bounds = Vec::new();
        let mut encode = Vec::new();

        for i in 0..stops.len() - 1 {
            let c0 = Color::from_hex(&stops[i].color).unwrap_or(Color::black()).to_rgb();
            let c1 = Color::from_hex(&stops[i + 1].color).unwrap_or(Color::white()).to_rgb();

            let mut func = PdfDict::new();
            func.set("FunctionType", PdfObject::int(2));
            func.set("Domain", PdfObject::array(vec![PdfObject::real(0.0), PdfObject::real(1.0)]));
            func.set("C0", PdfObject::array(vec![
                PdfObject::real(c0.0), PdfObject::real(c0.1), PdfObject::real(c0.2),
            ]));
            func.set("C1", PdfObject::array(vec![
                PdfObject::real(c1.0), PdfObject::real(c1.1), PdfObject::real(c1.2),
            ]));
            func.set("N", PdfObject::real(1.0));

            let fid = writer.add(PdfObject::dict(func));
            functions.push(PdfObject::reference(fid));

            if i < stops.len() - 2 {
                bounds.push(PdfObject::real(stops[i + 1].offset));
            }
            encode.push(PdfObject::real(0.0));
            encode.push(PdfObject::real(1.0));
        }

        let mut stitch = PdfDict::new();
        stitch.set("FunctionType", PdfObject::int(3));
        stitch.set("Domain", PdfObject::array(vec![PdfObject::real(0.0), PdfObject::real(1.0)]));
        stitch.set("Functions", PdfObject::array(functions));
        stitch.set("Bounds", PdfObject::array(bounds));
        stitch.set("Encode", PdfObject::array(encode));

        writer.add(PdfObject::dict(stitch))
    }
}
