/// Eraser works by painting white over content
/// In the editor, it removes drawing strokes from the stroke list
/// In PDF output, it renders as a white stroke

use super::DrawingStroke;
use crate::geometry::path::smooth_points;
use crate::geometry::Point;
use crate::pdf::content_stream::ContentStream;
use crate::pdf::color::Color;

pub fn render_eraser_stroke(cs: &mut ContentStream, stroke: &DrawingStroke) {
    if stroke.points.len() < 2 { return; }

    let points: Vec<Point> = stroke.points.iter().map(|p| p.to_point()).collect();
    let path = smooth_points(&points, 0.3);

    cs.save_state();
    cs.set_stroke_color(&Color::white());
    cs.set_line_width(stroke.width);
    cs.set_line_cap(crate::pdf::graphics_state::LineCap::Round);
    cs.set_line_join(crate::pdf::graphics_state::LineJoin::Round);
    path.write_to(cs);
    cs.stroke();
    cs.restore_state();
}
