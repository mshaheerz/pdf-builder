/// Page break types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PageBreak {
    /// Content naturally overflows to next page
    Auto,
    /// User-forced page break
    Forced,
    /// Avoid breaking inside this element
    AvoidInside,
}

/// Determine where to split content across pages
pub fn calculate_page_breaks(
    elements: &[ElementBox],
    page_height: f64,
    margin_top: f64,
    margin_bottom: f64,
) -> Vec<PageBreakPoint> {
    let content_height = page_height - margin_top - margin_bottom;
    let mut breaks = Vec::new();
    let mut current_y = 0.0;
    let mut page_start_idx = 0;

    for (i, elem) in elements.iter().enumerate() {
        if elem.page_break == PageBreak::Forced && i > page_start_idx {
            breaks.push(PageBreakPoint {
                after_element: i - 1,
                y_position: current_y,
            });
            current_y = 0.0;
            page_start_idx = i;
            continue;
        }

        if current_y + elem.height > content_height && i > page_start_idx {
            // Need page break before this element
            breaks.push(PageBreakPoint {
                after_element: i - 1,
                y_position: current_y,
            });
            current_y = 0.0;
            page_start_idx = i;
        }

        current_y += elem.height + elem.margin_bottom;
    }

    breaks
}

/// An element box for page break calculation
#[derive(Debug, Clone)]
pub struct ElementBox {
    pub height: f64,
    pub margin_bottom: f64,
    pub page_break: PageBreak,
    pub can_split: bool,  // e.g., text paragraphs can split, images cannot
}

#[derive(Debug, Clone)]
pub struct PageBreakPoint {
    pub after_element: usize,
    pub y_position: f64,
}
