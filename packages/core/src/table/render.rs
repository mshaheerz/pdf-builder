use super::layout::{Table, ComputedTableLayout};
use super::border::BorderLineStyle;
use crate::pdf::content_stream::ContentStream;
use crate::pdf::color::Color;

/// Render a computed table layout to a PDF content stream
pub fn render_table(
    cs: &mut ContentStream,
    table: &Table,
    layout: &ComputedTableLayout,
    origin_x: f64,
    origin_y: f64,
    font_name: &str,
    font_size: f64,
) {
    for cc in &layout.cells {
        let cx = origin_x + cc.x;
        // PDF y is bottom-up, so we subtract
        let cy = origin_y - cc.y - cc.height;

        // Cell background
        if let Some(ref bg) = cc.cell.background {
            if let Some(color) = Color::from_hex(bg) {
                cs.save_state();
                cs.set_fill_color(&color);
                cs.rect(cx, cy, cc.width, cc.height);
                cs.fill();
                cs.restore_state();
            }
        }

        // Cell borders
        let border = &table.default_border;
        render_cell_borders(cs, cx, cy, cc.width, cc.height, &cc.cell.border, border);

        // Cell text content
        match &cc.cell.content {
            super::cell::CellContent::Text(text) => {
                let pad = &cc.cell.padding;
                let text_x = cx + pad.left;
                let text_y = cy + cc.height - pad.top - font_size;

                cs.begin_text();
                cs.set_font(font_name, font_size);
                cs.set_fill_color(&Color::black());
                cs.text_move(text_x, text_y);
                cs.show_text(text);
                cs.end_text();
            }
            super::cell::CellContent::RichText(_spans) => {
                // TODO: Rich text rendering in cells
            }
            super::cell::CellContent::Empty => {}
        }
    }
}

fn render_cell_borders(
    cs: &mut ContentStream,
    x: f64, y: f64, w: f64, h: f64,
    cell_borders: &super::cell::CellBorders,
    default: &super::border::BorderStyle,
) {
    // Top border
    let top = cell_borders.top.as_ref().unwrap_or(default);
    draw_border_line(cs, x, y + h, x + w, y + h, top);

    // Bottom border
    let bottom = cell_borders.bottom.as_ref().unwrap_or(default);
    draw_border_line(cs, x, y, x + w, y, bottom);

    // Left border
    let left = cell_borders.left.as_ref().unwrap_or(default);
    draw_border_line(cs, x, y, x, y + h, left);

    // Right border
    let right = cell_borders.right.as_ref().unwrap_or(default);
    draw_border_line(cs, x + w, y, x + w, y + h, right);
}

fn draw_border_line(
    cs: &mut ContentStream,
    x1: f64, y1: f64, x2: f64, y2: f64,
    style: &super::border::BorderStyle,
) {
    if style.style == BorderLineStyle::None || style.width <= 0.0 {
        return;
    }

    cs.save_state();
    if let Some(color) = Color::from_hex(&style.color) {
        cs.set_stroke_color(&color);
    }
    cs.set_line_width(style.width);

    let dash = style.dash_array();
    if !dash.is_empty() {
        cs.set_dash(&dash, 0.0);
    }

    cs.move_to(x1, y1);
    cs.line_to(x2, y2);
    cs.stroke();
    cs.restore_state();
}
