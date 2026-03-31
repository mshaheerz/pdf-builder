pub mod pencil;
pub mod marker;
pub mod eraser;
pub mod brush;

use crate::geometry::Point;

/// Drawing tool type
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DrawingTool {
    Pencil,
    Marker,
    Eraser,
}

/// A single drawing stroke
#[derive(Debug, Clone)]
pub struct DrawingStroke {
    pub points: Vec<DrawingPoint>,
    pub tool: DrawingTool,
    pub color: String,     // hex
    pub width: f64,
    pub opacity: f64,
}

/// Point with optional pressure sensitivity
#[derive(Debug, Clone, Copy)]
pub struct DrawingPoint {
    pub x: f64,
    pub y: f64,
    pub pressure: f64,     // 0.0-1.0
}

impl DrawingPoint {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y, pressure: 1.0 }
    }

    pub fn with_pressure(x: f64, y: f64, pressure: f64) -> Self {
        Self { x, y, pressure }
    }

    pub fn to_point(&self) -> Point {
        Point::new(self.x, self.y)
    }
}
