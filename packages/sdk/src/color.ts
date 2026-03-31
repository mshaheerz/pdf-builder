/** Full color utility class with hex, rgb, cmyk, hsl support */
export class Color {
  private r: number;
  private g: number;
  private b: number;
  private a: number;

  constructor(r: number, g: number, b: number, a = 1.0) {
    this.r = Math.max(0, Math.min(255, Math.round(r)));
    this.g = Math.max(0, Math.min(255, Math.round(g)));
    this.b = Math.max(0, Math.min(255, Math.round(b)));
    this.a = Math.max(0, Math.min(1, a));
  }

  static hex(hex: string): Color {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return new Color(r, g, b, a);
  }

  static rgb(r: number, g: number, b: number, a = 1.0): Color {
    return new Color(r, g, b, a);
  }

  static hsl(h: number, s: number, l: number, a = 1.0): Color {
    const sn = s / 100, ln = l / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = ln - c / 2;
    let [r, g, b] = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] :
      h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
    return new Color((r+m)*255, (g+m)*255, (b+m)*255, a);
  }

  static cmyk(c: number, m: number, y: number, k: number): Color {
    const r = 255 * (1-c) * (1-k);
    const g = 255 * (1-m) * (1-k);
    const b = 255 * (1-y) * (1-k);
    return new Color(r, g, b);
  }

  toHex(): string {
    const r = this.r.toString(16).padStart(2, '0');
    const g = this.g.toString(16).padStart(2, '0');
    const b = this.b.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  toRgb(): { r: number; g: number; b: number; a: number } {
    return { r: this.r, g: this.g, b: this.b, a: this.a };
  }

  toHsl(): { h: number; s: number; l: number } {
    const r = this.r / 255, g = this.g / 255, b = this.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: l * 100 };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g-b)/d+(g<b?6:0) : max === g ? (b-r)/d+2 : (r-g)/d+4;
    return { h: h * 60, s: s * 100, l: l * 100 };
  }

  toCmyk(): { c: number; m: number; y: number; k: number } {
    const r = this.r / 255, g = this.g / 255, b = this.b / 255;
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 1 };
    return {
      c: (1 - r - k) / (1 - k),
      m: (1 - g - k) / (1 - k),
      y: (1 - b - k) / (1 - k),
      k,
    };
  }

  withAlpha(a: number): Color {
    return new Color(this.r, this.g, this.b, a);
  }

  // Preset colors
  static readonly black = Color.hex('#000000');
  static readonly white = Color.hex('#FFFFFF');
  static readonly red = Color.hex('#FF0000');
  static readonly green = Color.hex('#00FF00');
  static readonly blue = Color.hex('#0000FF');
  static readonly yellow = Color.hex('#FFFF00');
  static readonly cyan = Color.hex('#00FFFF');
  static readonly magenta = Color.hex('#FF00FF');
  static readonly transparent = new Color(0, 0, 0, 0);
}
