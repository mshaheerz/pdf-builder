/// Brush configuration for drawing tools
#[derive(Debug, Clone)]
pub struct BrushConfig {
    pub size: f64,           // base stroke width in points
    pub opacity: f64,        // 0.0-1.0
    pub hardness: f64,       // 0.0 (soft) to 1.0 (hard)
    pub pressure_sensitivity: bool,
    pub smoothing: f64,      // 0.0-1.0 Bézier tension
}

impl Default for BrushConfig {
    fn default() -> Self {
        Self {
            size: 2.0,
            opacity: 1.0,
            hardness: 1.0,
            pressure_sensitivity: false,
            smoothing: 0.3,
        }
    }
}

impl BrushConfig {
    pub fn pencil() -> Self {
        Self { size: 1.5, opacity: 1.0, hardness: 1.0, ..Default::default() }
    }

    pub fn marker() -> Self {
        Self { size: 8.0, opacity: 0.4, hardness: 0.5, ..Default::default() }
    }

    pub fn eraser() -> Self {
        Self { size: 10.0, opacity: 1.0, hardness: 1.0, ..Default::default() }
    }

    /// Calculate effective width at a point given pressure
    pub fn effective_width(&self, pressure: f64) -> f64 {
        if self.pressure_sensitivity {
            self.size * (0.3 + 0.7 * pressure)
        } else {
            self.size
        }
    }
}
