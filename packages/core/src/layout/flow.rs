/// Content flow - distributes elements across multiple pages

#[derive(Debug)]
pub struct FlowLayout {
    pub pages: Vec<FlowPage>,
}

#[derive(Debug)]
pub struct FlowPage {
    pub page_index: usize,
    pub elements: Vec<FlowElement>,
}

#[derive(Debug)]
pub struct FlowElement {
    pub original_index: usize,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    /// If element was split, which part (0 = first, etc.)
    pub split_part: Option<usize>,
}

/// Flow content into pages
pub fn flow_elements(
    elements: &[(f64, f64)], // (width, height) of each element
    page_width: f64,
    page_height: f64,
    margin_top: f64,
    margin_bottom: f64,
    margin_left: f64,
) -> FlowLayout {
    let content_height = page_height - margin_top - margin_bottom;
    let mut pages: Vec<FlowPage> = Vec::new();
    let mut current_page = FlowPage { page_index: 0, elements: Vec::new() };
    let mut y = margin_top;

    for (i, &(w, h)) in elements.iter().enumerate() {
        if y + h > page_height - margin_bottom && !current_page.elements.is_empty() {
            pages.push(current_page);
            current_page = FlowPage {
                page_index: pages.len(),
                elements: Vec::new(),
            };
            y = margin_top;
        }

        current_page.elements.push(FlowElement {
            original_index: i,
            x: margin_left,
            y,
            width: w,
            height: h,
            split_part: None,
        });

        y += h;
    }

    if !current_page.elements.is_empty() {
        pages.push(current_page);
    }

    FlowLayout { pages }
}
