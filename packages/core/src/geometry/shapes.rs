use super::path::Path;
use super::Point;

/// Generate common shape paths
pub fn rectangle(x: f64, y: f64, w: f64, h: f64) -> Path {
    let mut p = Path::new();
    p.move_to(x, y);
    p.line_to(x + w, y);
    p.line_to(x + w, y + h);
    p.line_to(x, y + h);
    p.close();
    p
}

pub fn rounded_rectangle(x: f64, y: f64, w: f64, h: f64, r: f64) -> Path {
    let r = r.min(w / 2.0).min(h / 2.0);
    let k = 0.5522847498 * r;
    let mut p = Path::new();
    p.move_to(x + r, y);
    p.line_to(x + w - r, y);
    p.curve_to(x + w - r + k, y, x + w, y + r - k, x + w, y + r);
    p.line_to(x + w, y + h - r);
    p.curve_to(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h);
    p.line_to(x + r, y + h);
    p.curve_to(x + r - k, y + h, x, y + h - r + k, x, y + h - r);
    p.line_to(x, y + r);
    p.curve_to(x, y + r - k, x + r - k, y, x + r, y);
    p.close();
    p
}

pub fn circle(cx: f64, cy: f64, r: f64) -> Path {
    ellipse(cx, cy, r, r)
}

pub fn ellipse(cx: f64, cy: f64, rx: f64, ry: f64) -> Path {
    let k = 0.5522847498;
    let kx = k * rx;
    let ky = k * ry;
    let mut p = Path::new();
    p.move_to(cx + rx, cy);
    p.curve_to(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry);
    p.curve_to(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy);
    p.curve_to(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry);
    p.curve_to(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy);
    p.close();
    p
}

pub fn triangle(cx: f64, cy: f64, size: f64) -> Path {
    polygon(cx, cy, size, 3)
}

pub fn polygon(cx: f64, cy: f64, r: f64, sides: u32) -> Path {
    let mut p = Path::new();
    for i in 0..sides {
        let angle = (i as f64) * 2.0 * std::f64::consts::PI / (sides as f64) - std::f64::consts::FRAC_PI_2;
        let x = cx + r * angle.cos();
        let y = cy + r * angle.sin();
        if i == 0 { p.move_to(x, y); } else { p.line_to(x, y); }
    }
    p.close();
    p
}

pub fn star(cx: f64, cy: f64, outer_r: f64, inner_r: f64, points: u32) -> Path {
    let mut p = Path::new();
    let total = points * 2;
    for i in 0..total {
        let angle = (i as f64) * std::f64::consts::PI / (points as f64) - std::f64::consts::FRAC_PI_2;
        let r = if i % 2 == 0 { outer_r } else { inner_r };
        let x = cx + r * angle.cos();
        let y = cy + r * angle.sin();
        if i == 0 { p.move_to(x, y); } else { p.line_to(x, y); }
    }
    p.close();
    p
}

pub fn arrow_line(from: Point, to: Point, head_size: f64) -> Path {
    let mut p = Path::new();
    let angle = (to.y - from.y).atan2(to.x - from.x);
    let ha = std::f64::consts::PI / 6.0; // 30 degrees

    p.move_to(from.x, from.y);
    p.line_to(to.x, to.y);

    let a1 = angle + std::f64::consts::PI + ha;
    let a2 = angle + std::f64::consts::PI - ha;
    p.move_to(to.x, to.y);
    p.line_to(to.x + head_size * a1.cos(), to.y + head_size * a1.sin());
    p.move_to(to.x, to.y);
    p.line_to(to.x + head_size * a2.cos(), to.y + head_size * a2.sin());

    p
}
