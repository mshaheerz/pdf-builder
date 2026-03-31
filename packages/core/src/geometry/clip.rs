use super::path::Path;
use crate::pdf::content_stream::ContentStream;

/// Apply a clipping path to a content stream
pub fn apply_clip(cs: &mut ContentStream, path: &Path, even_odd: bool) {
    cs.save_state();
    path.write_to(cs);
    if even_odd {
        cs.clip_even_odd();
    } else {
        cs.clip();
    }
    cs.end_path();
}

/// Restore after clipping (must pair with apply_clip)
pub fn end_clip(cs: &mut ContentStream) {
    cs.restore_state();
}
