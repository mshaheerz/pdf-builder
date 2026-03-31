/// Standard page sizes in points (1 point = 1/72 inch)
#[derive(Debug, Clone, Copy)]
pub enum PageSize {
    A0, A1, A2, A3, A4, A5, A6,
    Letter, Legal, Tabloid,
    Custom(f64, f64),
}

impl PageSize {
    /// Width and height in points (portrait orientation)
    pub fn dimensions(&self) -> (f64, f64) {
        match self {
            PageSize::A0 => (2384.0, 3370.0),
            PageSize::A1 => (1684.0, 2384.0),
            PageSize::A2 => (1191.0, 1684.0),
            PageSize::A3 => (842.0, 1191.0),
            PageSize::A4 => (595.0, 842.0),
            PageSize::A5 => (420.0, 595.0),
            PageSize::A6 => (298.0, 420.0),
            PageSize::Letter => (612.0, 792.0),
            PageSize::Legal => (612.0, 1008.0),
            PageSize::Tabloid => (792.0, 1224.0),
            PageSize::Custom(w, h) => (*w, *h),
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum Orientation {
    Portrait,
    Landscape,
}

#[derive(Debug, Clone, Copy)]
pub struct Margins {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

impl Default for Margins {
    fn default() -> Self {
        Self { top: 72.0, right: 72.0, bottom: 72.0, left: 72.0 } // 1 inch
    }
}

#[derive(Debug, Clone)]
pub struct PageConfig {
    pub size: PageSize,
    pub orientation: Orientation,
    pub margins: Margins,
}

impl Default for PageConfig {
    fn default() -> Self {
        Self {
            size: PageSize::A4,
            orientation: Orientation::Portrait,
            margins: Margins::default(),
        }
    }
}

impl PageConfig {
    pub fn media_box(&self) -> (f64, f64) {
        let (w, h) = self.size.dimensions();
        match self.orientation {
            Orientation::Portrait => (w, h),
            Orientation::Landscape => (h, w),
        }
    }

    pub fn content_area(&self) -> (f64, f64, f64, f64) {
        let (pw, ph) = self.media_box();
        (
            self.margins.left,
            self.margins.bottom,
            pw - self.margins.left - self.margins.right,
            ph - self.margins.top - self.margins.bottom,
        )
    }
}
