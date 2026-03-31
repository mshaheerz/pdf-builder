use crate::geometry::Rect;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HorizontalAlign {
    Left, Center, Right,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum VerticalAlign {
    Top, Middle, Bottom,
}

/// Align a set of element rects
pub fn align_elements(
    elements: &mut [Rect],
    container: &Rect,
    h_align: Option<HorizontalAlign>,
    v_align: Option<VerticalAlign>,
) {
    if elements.is_empty() { return; }

    if let Some(ha) = h_align {
        match ha {
            HorizontalAlign::Left => {
                for el in elements.iter_mut() {
                    el.x = container.x;
                }
            }
            HorizontalAlign::Center => {
                let cx = container.x + container.width / 2.0;
                for el in elements.iter_mut() {
                    el.x = cx - el.width / 2.0;
                }
            }
            HorizontalAlign::Right => {
                for el in elements.iter_mut() {
                    el.x = container.x + container.width - el.width;
                }
            }
        }
    }

    if let Some(va) = v_align {
        match va {
            VerticalAlign::Top => {
                for el in elements.iter_mut() {
                    el.y = container.y;
                }
            }
            VerticalAlign::Middle => {
                let cy = container.y + container.height / 2.0;
                for el in elements.iter_mut() {
                    el.y = cy - el.height / 2.0;
                }
            }
            VerticalAlign::Bottom => {
                for el in elements.iter_mut() {
                    el.y = container.y + container.height - el.height;
                }
            }
        }
    }
}

/// Distribute elements evenly across horizontal space
pub fn distribute_horizontal(elements: &mut [Rect], container: &Rect) {
    if elements.len() < 2 { return; }
    elements.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap());

    let total_width: f64 = elements.iter().map(|e| e.width).sum();
    let gap = (container.width - total_width) / (elements.len() - 1) as f64;
    let mut x = container.x;

    for el in elements.iter_mut() {
        el.x = x;
        x += el.width + gap;
    }
}

/// Distribute elements evenly across vertical space
pub fn distribute_vertical(elements: &mut [Rect], container: &Rect) {
    if elements.len() < 2 { return; }
    elements.sort_by(|a, b| a.y.partial_cmp(&b.y).unwrap());

    let total_height: f64 = elements.iter().map(|e| e.height).sum();
    let gap = (container.height - total_height) / (elements.len() - 1) as f64;
    let mut y = container.y;

    for el in elements.iter_mut() {
        el.y = y;
        y += el.height + gap;
    }
}
