use std::collections::BTreeMap;
use std::fmt;

/// Object ID: (object number, generation number)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ObjectId(pub u32, pub u16);

impl fmt::Display for ObjectId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {} R", self.0, self.1)
    }
}

/// Core PDF object types per PDF 1.7 spec
#[derive(Debug, Clone)]
pub enum PdfObject {
    Null,
    Boolean(bool),
    Integer(i64),
    Real(f64),
    String(PdfString),
    Name(String),
    Array(Vec<PdfObject>),
    Dictionary(PdfDict),
    Stream(PdfStream),
    Reference(ObjectId),
}

#[derive(Debug, Clone)]
pub enum PdfString {
    Literal(Vec<u8>),   // (string)
    Hex(Vec<u8>),       // <hex>
}

#[derive(Debug, Clone, Default)]
pub struct PdfDict {
    pub entries: BTreeMap<String, PdfObject>,
}

#[derive(Debug, Clone)]
pub struct PdfStream {
    pub dict: PdfDict,
    pub data: Vec<u8>,
}

impl PdfDict {
    pub fn new() -> Self {
        Self { entries: BTreeMap::new() }
    }

    pub fn set(&mut self, key: impl Into<String>, value: PdfObject) {
        self.entries.insert(key.into(), value);
    }

    pub fn get(&self, key: &str) -> Option<&PdfObject> {
        self.entries.get(key)
    }
}

impl PdfObject {
    pub fn name(s: impl Into<String>) -> Self {
        PdfObject::Name(s.into())
    }

    pub fn int(v: i64) -> Self {
        PdfObject::Integer(v)
    }

    pub fn real(v: f64) -> Self {
        PdfObject::Real(v)
    }

    pub fn bool(v: bool) -> Self {
        PdfObject::Boolean(v)
    }

    pub fn reference(id: ObjectId) -> Self {
        PdfObject::Reference(id)
    }

    pub fn literal_string(s: impl AsRef<[u8]>) -> Self {
        PdfObject::String(PdfString::Literal(s.as_ref().to_vec()))
    }

    pub fn hex_string(s: impl AsRef<[u8]>) -> Self {
        PdfObject::String(PdfString::Hex(s.as_ref().to_vec()))
    }

    pub fn array(items: Vec<PdfObject>) -> Self {
        PdfObject::Array(items)
    }

    pub fn dict(d: PdfDict) -> Self {
        PdfObject::Dictionary(d)
    }

    /// Write this object to bytes in PDF format
    pub fn write_to(&self, buf: &mut Vec<u8>) {
        match self {
            PdfObject::Null => buf.extend_from_slice(b"null"),
            PdfObject::Boolean(true) => buf.extend_from_slice(b"true"),
            PdfObject::Boolean(false) => buf.extend_from_slice(b"false"),
            PdfObject::Integer(v) => {
                let s = v.to_string();
                buf.extend_from_slice(s.as_bytes());
            }
            PdfObject::Real(v) => {
                // Avoid unnecessary trailing zeros
                let s = format_real(*v);
                buf.extend_from_slice(s.as_bytes());
            }
            PdfObject::String(PdfString::Literal(data)) => {
                buf.push(b'(');
                for &byte in data {
                    match byte {
                        b'(' => buf.extend_from_slice(b"\\("),
                        b')' => buf.extend_from_slice(b"\\)"),
                        b'\\' => buf.extend_from_slice(b"\\\\"),
                        _ => buf.push(byte),
                    }
                }
                buf.push(b')');
            }
            PdfObject::String(PdfString::Hex(data)) => {
                buf.push(b'<');
                for &byte in data {
                    let hex = format!("{:02X}", byte);
                    buf.extend_from_slice(hex.as_bytes());
                }
                buf.push(b'>');
            }
            PdfObject::Name(name) => {
                buf.push(b'/');
                for &byte in name.as_bytes() {
                    if byte == b' ' || byte == b'#' || byte < 0x21 || byte > 0x7E {
                        let hex = format!("#{:02X}", byte);
                        buf.extend_from_slice(hex.as_bytes());
                    } else {
                        buf.push(byte);
                    }
                }
            }
            PdfObject::Array(items) => {
                buf.push(b'[');
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        buf.push(b' ');
                    }
                    item.write_to(buf);
                }
                buf.push(b']');
            }
            PdfObject::Dictionary(dict) => {
                write_dict(dict, buf);
            }
            PdfObject::Stream(stream) => {
                write_dict(&stream.dict, buf);
                buf.extend_from_slice(b"\nstream\n");
                buf.extend_from_slice(&stream.data);
                buf.extend_from_slice(b"\nendstream");
            }
            PdfObject::Reference(id) => {
                let s = format!("{} {} R", id.0, id.1);
                buf.extend_from_slice(s.as_bytes());
            }
        }
    }
}

fn write_dict(dict: &PdfDict, buf: &mut Vec<u8>) {
    buf.extend_from_slice(b"<<");
    for (key, value) in &dict.entries {
        buf.push(b' ');
        PdfObject::name(key.clone()).write_to(buf);
        buf.push(b' ');
        value.write_to(buf);
    }
    buf.extend_from_slice(b" >>");
}

fn format_real(v: f64) -> String {
    if v == v.floor() && v.abs() < 1e15 {
        format!("{:.1}", v)
    } else {
        let s = format!("{:.6}", v);
        let s = s.trim_end_matches('0');
        let s = s.trim_end_matches('.');
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_integer() {
        let mut buf = Vec::new();
        PdfObject::int(42).write_to(&mut buf);
        assert_eq!(String::from_utf8(buf).unwrap(), "42");
    }

    #[test]
    fn test_write_name() {
        let mut buf = Vec::new();
        PdfObject::name("Type").write_to(&mut buf);
        assert_eq!(String::from_utf8(buf).unwrap(), "/Type");
    }

    #[test]
    fn test_write_dict() {
        let mut dict = PdfDict::new();
        dict.set("Type", PdfObject::name("Catalog"));
        let mut buf = Vec::new();
        PdfObject::dict(dict).write_to(&mut buf);
        let s = String::from_utf8(buf).unwrap();
        assert!(s.contains("/Type"));
        assert!(s.contains("/Catalog"));
    }

    #[test]
    fn test_write_reference() {
        let mut buf = Vec::new();
        PdfObject::reference(ObjectId(3, 0)).write_to(&mut buf);
        assert_eq!(String::from_utf8(buf).unwrap(), "3 0 R");
    }

    #[test]
    fn test_write_literal_string() {
        let mut buf = Vec::new();
        PdfObject::literal_string("Hello (World)").write_to(&mut buf);
        assert_eq!(String::from_utf8(buf).unwrap(), "(Hello \\(World\\))");
    }
}
