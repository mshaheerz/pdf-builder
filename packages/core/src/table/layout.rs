use super::cell::TableCell;
use super::border::BorderStyle;

/// Table definition
#[derive(Debug, Clone)]
pub struct Table {
    pub columns: Vec<ColumnDef>,
    pub rows: Vec<TableRow>,
    pub default_border: BorderStyle,
    pub cell_padding: f64,
    pub header_rows: u32,
}

#[derive(Debug, Clone)]
pub struct ColumnDef {
    pub width: ColumnWidth,
}

#[derive(Debug, Clone)]
pub enum ColumnWidth {
    Fixed(f64),        // points
    Percent(f64),      // 0.0-1.0
    Auto,
}

#[derive(Debug, Clone)]
pub struct TableRow {
    pub cells: Vec<TableCell>,
    pub height: RowHeight,
}

#[derive(Debug, Clone)]
pub enum RowHeight {
    Auto,
    Fixed(f64),
    Min(f64),
}

/// Computed table layout with absolute positions
#[derive(Debug)]
pub struct ComputedTableLayout {
    pub total_width: f64,
    pub total_height: f64,
    pub column_widths: Vec<f64>,
    pub row_heights: Vec<f64>,
    pub cells: Vec<ComputedCell>,
}

#[derive(Debug)]
pub struct ComputedCell {
    pub row: usize,
    pub col: usize,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub cell: TableCell,
}

impl Table {
    pub fn new(columns: Vec<ColumnDef>, rows: Vec<TableRow>) -> Self {
        Self {
            columns,
            rows,
            default_border: BorderStyle::default(),
            cell_padding: 4.0,
            header_rows: 0,
        }
    }

    /// Compute the final layout given total available width
    pub fn compute_layout(&self, available_width: f64) -> ComputedTableLayout {
        let num_cols = self.columns.len();

        // Resolve column widths
        let mut col_widths = vec![0.0f64; num_cols];
        let mut remaining = available_width;
        let mut auto_count = 0;

        for (i, col) in self.columns.iter().enumerate() {
            match col.width {
                ColumnWidth::Fixed(w) => {
                    col_widths[i] = w;
                    remaining -= w;
                }
                ColumnWidth::Percent(p) => {
                    let w = available_width * p;
                    col_widths[i] = w;
                    remaining -= w;
                }
                ColumnWidth::Auto => {
                    auto_count += 1;
                }
            }
        }

        if auto_count > 0 {
            let auto_width = remaining.max(0.0) / auto_count as f64;
            for (i, col) in self.columns.iter().enumerate() {
                if matches!(col.width, ColumnWidth::Auto) {
                    col_widths[i] = auto_width;
                }
            }
        }

        // Compute row heights (auto for now - minimum based on padding + font size)
        let default_row_height = self.cell_padding * 2.0 + 14.0; // padding + ~12pt font
        let mut row_heights: Vec<f64> = self.rows.iter().map(|row| {
            match row.height {
                RowHeight::Fixed(h) => h,
                RowHeight::Min(min) => min.max(default_row_height),
                RowHeight::Auto => default_row_height,
            }
        }).collect();

        // Build computed cells
        let mut cells = Vec::new();
        let mut y = 0.0;
        for (row_idx, row) in self.rows.iter().enumerate() {
            let mut x = 0.0;
            for (col_idx, cell) in row.cells.iter().enumerate() {
                if col_idx >= num_cols { break; }

                let cell_width: f64 = (col_idx..col_idx + cell.colspan as usize)
                    .filter(|&c| c < num_cols)
                    .map(|c| col_widths[c])
                    .sum();

                let cell_height: f64 = (row_idx..row_idx + cell.rowspan as usize)
                    .filter(|&r| r < row_heights.len())
                    .map(|r| row_heights[r])
                    .sum();

                cells.push(ComputedCell {
                    row: row_idx,
                    col: col_idx,
                    x,
                    y,
                    width: cell_width,
                    height: cell_height,
                    cell: cell.clone(),
                });

                x += col_widths[col_idx];
            }
            y += row_heights[row_idx];
        }

        ComputedTableLayout {
            total_width: col_widths.iter().sum(),
            total_height: row_heights.iter().sum(),
            column_widths: col_widths,
            row_heights,
            cells,
        }
    }
}
