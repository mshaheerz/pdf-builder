use super::Point;
use crate::pdf::content_stream::ContentStream;

/// Path segment types
#[derive(Debug, Clone)]
pub enum PathSegment {
    MoveTo(Point),
    LineTo(Point),
    CurveTo { cp1: Point, cp2: Point, end: Point },
    QuadTo { cp: Point, end: Point },
    Arc { center: Point, rx: f64, ry: f64, start_angle: f64, end_angle: f64 },
    Close,
}

/// A vector path composed of segments
#[derive(Debug, Clone, Default)]
pub struct Path {
    pub segments: Vec<PathSegment>,
}

impl Path {
    pub fn new() -> Self {
        Self { segments: Vec::new() }
    }

    pub fn move_to(&mut self, x: f64, y: f64) -> &mut Self {
        self.segments.push(PathSegment::MoveTo(Point::new(x, y)));
        self
    }

    pub fn line_to(&mut self, x: f64, y: f64) -> &mut Self {
        self.segments.push(PathSegment::LineTo(Point::new(x, y)));
        self
    }

    pub fn curve_to(&mut self, cp1x: f64, cp1y: f64, cp2x: f64, cp2y: f64, x: f64, y: f64) -> &mut Self {
        self.segments.push(PathSegment::CurveTo {
            cp1: Point::new(cp1x, cp1y),
            cp2: Point::new(cp2x, cp2y),
            end: Point::new(x, y),
        });
        self
    }

    pub fn quad_to(&mut self, cpx: f64, cpy: f64, x: f64, y: f64) -> &mut Self {
        self.segments.push(PathSegment::QuadTo {
            cp: Point::new(cpx, cpy),
            end: Point::new(x, y),
        });
        self
    }

    pub fn arc(&mut self, cx: f64, cy: f64, rx: f64, ry: f64, start: f64, end: f64) -> &mut Self {
        self.segments.push(PathSegment::Arc {
            center: Point::new(cx, cy),
            rx, ry,
            start_angle: start,
            end_angle: end,
        });
        self
    }

    pub fn close(&mut self) -> &mut Self {
        self.segments.push(PathSegment::Close);
        self
    }

    /// Write path to a PDF content stream
    pub fn write_to(&self, cs: &mut ContentStream) {
        for seg in &self.segments {
            match seg {
                PathSegment::MoveTo(p) => cs.move_to(p.x, p.y),
                PathSegment::LineTo(p) => cs.line_to(p.x, p.y),
                PathSegment::CurveTo { cp1, cp2, end } => {
                    cs.curve_to(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
                }
                PathSegment::QuadTo { cp, end } => {
                    // Convert quadratic to cubic Bézier
                    // We need the current point - approximate with cp
                    // Proper implementation would track current point
                    cs.curve_to(cp.x, cp.y, cp.x, cp.y, end.x, end.y);
                }
                PathSegment::Arc { center, rx, ry, start_angle, end_angle } => {
                    write_arc(cs, center.x, center.y, *rx, *ry, *start_angle, *end_angle);
                }
                PathSegment::Close => cs.close_path(),
            }
        }
    }

    /// Bounding box of the path (approximate)
    pub fn bounds(&self) -> super::Rect {
        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;

        for seg in &self.segments {
            let points: Vec<Point> = match seg {
                PathSegment::MoveTo(p) | PathSegment::LineTo(p) => vec![*p],
                PathSegment::CurveTo { cp1, cp2, end } => vec![*cp1, *cp2, *end],
                PathSegment::QuadTo { cp, end } => vec![*cp, *end],
                PathSegment::Arc { center, rx, ry, .. } => vec![
                    Point::new(center.x - rx, center.y - ry),
                    Point::new(center.x + rx, center.y + ry),
                ],
                PathSegment::Close => vec![],
            };
            for p in points {
                min_x = min_x.min(p.x);
                min_y = min_y.min(p.y);
                max_x = max_x.max(p.x);
                max_y = max_y.max(p.y);
            }
        }

        super::Rect::new(min_x, min_y, max_x - min_x, max_y - min_y)
    }
}

/// Write an arc as cubic Bézier curves
fn write_arc(cs: &mut ContentStream, cx: f64, cy: f64, rx: f64, ry: f64, start: f64, end: f64) {
    let mut angle = start;
    let step = std::f64::consts::PI / 2.0;

    while angle < end {
        let segment_end = (angle + step).min(end);
        let da = segment_end - angle;
        let k = 4.0 / 3.0 * (da / 4.0).tan();

        let cos_a = angle.cos();
        let sin_a = angle.sin();
        let cos_b = segment_end.cos();
        let sin_b = segment_end.sin();

        let x0 = cx + rx * cos_a;
        let y0 = cy + ry * sin_a;
        let x1 = x0 - k * rx * sin_a;
        let y1 = y0 + k * ry * cos_a;
        let x3 = cx + rx * cos_b;
        let y3 = cy + ry * sin_b;
        let x2 = x3 + k * rx * sin_b;
        let y2 = y3 - k * ry * cos_b;

        if angle == start {
            cs.move_to(x0, y0);
        }
        cs.curve_to(x1, y1, x2, y2, x3, y3);

        angle = segment_end;
    }
}

/// Smooth a set of freehand points into Bézier curves
pub fn smooth_points(points: &[Point], tension: f64) -> Path {
    let mut path = Path::new();
    if points.is_empty() { return path; }
    if points.len() == 1 {
        path.move_to(points[0].x, points[0].y);
        return path;
    }

    path.move_to(points[0].x, points[0].y);

    if points.len() == 2 {
        path.line_to(points[1].x, points[1].y);
        return path;
    }

    for i in 0..points.len() - 1 {
        let p0 = if i > 0 { &points[i - 1] } else { &points[i] };
        let p1 = &points[i];
        let p2 = &points[i + 1];
        let p3 = if i + 2 < points.len() { &points[i + 2] } else { p2 };

        let cp1x = p1.x + (p2.x - p0.x) * tension / 3.0;
        let cp1y = p1.y + (p2.y - p0.y) * tension / 3.0;
        let cp2x = p2.x - (p3.x - p1.x) * tension / 3.0;
        let cp2y = p2.y - (p3.y - p1.y) * tension / 3.0;

        path.curve_to(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    path
}
