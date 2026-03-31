use super::objects::ObjectId;

/// Entry in the cross-reference table
#[derive(Debug, Clone)]
pub struct XRefEntry {
    pub offset: usize,
    pub generation: u16,
    pub in_use: bool,
}

/// Cross-reference table builder
#[derive(Debug, Default)]
pub struct XRefTable {
    pub entries: Vec<(ObjectId, XRefEntry)>,
}

impl XRefTable {
    pub fn new() -> Self {
        Self { entries: Vec::new() }
    }

    pub fn add(&mut self, id: ObjectId, offset: usize) {
        self.entries.push((id, XRefEntry {
            offset,
            generation: id.1,
            in_use: true,
        }));
    }

    /// Write the cross-reference table in classic format
    pub fn write_to(&self, buf: &mut Vec<u8>) -> usize {
        let xref_offset = buf.len();
        buf.extend_from_slice(b"xref\n");

        // Find max object number
        let max_obj = self.entries.iter().map(|(id, _)| id.0).max().unwrap_or(0);
        let count = max_obj + 1;

        let header = format!("0 {}\n", count);
        buf.extend_from_slice(header.as_bytes());

        // Entry 0: free entry (head of free list)
        buf.extend_from_slice(b"0000000000 65535 f \n");

        // Build a map of object number -> entry
        let mut map = std::collections::BTreeMap::new();
        for (id, entry) in &self.entries {
            map.insert(id.0, entry);
        }

        for obj_num in 1..count {
            if let Some(entry) = map.get(&obj_num) {
                let line = format!("{:010} {:05} n \n", entry.offset, entry.generation);
                buf.extend_from_slice(line.as_bytes());
            } else {
                buf.extend_from_slice(b"0000000000 00000 f \n");
            }
        }

        xref_offset
    }
}
