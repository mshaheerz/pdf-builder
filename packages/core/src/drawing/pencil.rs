use super::DrawingStroke;
use crate::geometry::path::smooth_points;
use crate::geometry::Point;
use crate::pdf::content_stream::ContentStream;
use crate::pdf::color::Color;

/// Render a pencil stroke to a content stream
pub fn render_pencil_stroke(cs: &mut ContentStream, stroke: &DrawingStroke) {
    if stroke.points.len() < 2 { return; }

    let points: Vec<Point> = stroke.points.iter().map(|p| p.to_point()).collect();
    let path = smooth_points(&points, 0.3);

    cs.save_state();
    if let Some(color) = Color::from_hex(&stroke.color) {
        cs.set_stroke_color(&color);
    }
    cs.set_line_width(stroke.width);

    // Round line cap and join for smooth appearance
    cs.set_line_cap(crate::pdf::graphics_state::LineCap::Round);
    cs.set_line_join(crate::pdf::graphics_state::LineJoin::Round);

    path.write_to(cs);
    cs.stroke();
    cs.restore_state();
}
