import { generateId } from '@pdf-builder/sdk';
import type { Page, Element } from '@pdf-builder/sdk';

export type TemplateCategory = 'blank' | 'business' | 'personal' | 'creative' | 'education';

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  accent: string;
}

export interface Template extends TemplateMeta {
  build: () => Page[];
}

// --------------------------------------------------------------------------
// Helpers — keep templates terse
// --------------------------------------------------------------------------

const A4 = { width: 595, height: 842 };

function blankPage(overrides: Partial<Page> = {}): Page {
  return {
    id: generateId(),
    width: A4.width,
    height: A4.height,
    background: '#FFFFFF',
    elements: [],
    ...overrides,
  };
}

type BaseProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  name?: string;
};

function base(p: BaseProps, name: string) {
  return {
    id: generateId(),
    rotation: p.rotation ?? 0,
    opacity: p.opacity ?? 1,
    locked: p.locked ?? false,
    visible: p.visible ?? true,
    name: p.name ?? name,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
  };
}

function text(p: BaseProps, content: string, style: Partial<{
  font: string; fontSize: number; fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic'; color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number; decoration: 'none' | 'underline' | 'strikethrough';
}> = {}): Element {
  return {
    ...base(p, 'Text'),
    type: 'text',
    content,
    font: style.font ?? 'Helvetica',
    fontSize: style.fontSize ?? 12,
    fontWeight: style.fontWeight ?? 'normal',
    fontStyle: style.fontStyle ?? 'normal',
    color: style.color ?? '#111111',
    align: style.align ?? 'left',
    lineHeight: style.lineHeight ?? 1.3,
    decoration: style.decoration ?? 'none',
  } as Element;
}

function rect(p: BaseProps, fillColor: string, opts: { radius?: number; strokeColor?: string; strokeWidth?: number } = {}): Element {
  return {
    ...base(p, 'Shape'),
    type: 'shape',
    shapeType: opts.radius ? 'roundedRect' : 'rect',
    fill: { type: 'solid', color: fillColor },
    stroke: { width: opts.strokeWidth ?? 0, color: opts.strokeColor ?? '#000000', style: opts.strokeWidth ? 'solid' : 'none' },
    borderRadius: opts.radius ?? 0,
  } as Element;
}

function line(p: BaseProps, color: string, strokeWidth = 1): Element {
  return {
    ...base(p, 'Line'),
    type: 'shape',
    shapeType: 'line',
    fill: { type: 'none' },
    stroke: { width: strokeWidth, color, style: 'solid' },
    borderRadius: 0,
  } as Element;
}

export interface WatermarkOptions {
  text: string;
  color?: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  font?: string;
}

/** Build a watermark element that sits behind page content (rotated, low opacity). */
export function buildWatermark(pageWidth: number, pageHeight: number, opts: WatermarkOptions): Element {
  const fontSize = opts.fontSize ?? 96;
  // Place it centered; width/height generous so rotation doesn't clip
  const w = Math.min(pageWidth - 40, 500);
  const h = fontSize * 2;
  return {
    id: generateId(),
    type: 'text',
    x: (pageWidth - w) / 2,
    y: (pageHeight - h) / 2,
    width: w,
    height: h,
    rotation: opts.rotation ?? -30,
    opacity: opts.opacity ?? 0.12,
    locked: false,
    visible: true,
    name: 'Watermark',
    content: opts.text,
    font: opts.font ?? 'Helvetica',
    fontSize,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: opts.color ?? '#000000',
    align: 'center',
    lineHeight: 1,
    decoration: 'none',
  } as Element;
}

function table(p: BaseProps, columns: number[], rows: { cells: string[]; background?: string; height?: number }[], borderColor = '#E0E0E0'): Element {
  return {
    ...base(p, 'Table'),
    type: 'table',
    columns: columns.map((width) => ({ width })),
    rows: rows.map((r) => ({
      height: r.height ?? 28,
      cells: r.cells.map((content, i) => ({ content, background: i === 0 ? r.background : r.background })),
    })),
    borderColor,
  } as Element;
}

// --------------------------------------------------------------------------
// Template 1 — Resume
// --------------------------------------------------------------------------
function buildResume(): Page[] {
  const M = 48;
  const page = blankPage();
  const els: Element[] = [];

  // Header band
  els.push(rect({ x: 0, y: 0, width: A4.width, height: 120 }, '#1F2937'));
  els.push(text({ x: M, y: 32, width: A4.width - M * 2, height: 36 }, 'JANE DOE',
    { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', font: 'Helvetica' }));
  els.push(text({ x: M, y: 70, width: A4.width - M * 2, height: 18 }, 'Senior Software Engineer',
    { fontSize: 12, color: '#D1D5DB', font: 'Helvetica' }));
  els.push(text({ x: M, y: 94, width: A4.width - M * 2, height: 16 },
    'jane.doe@email.com   •   (555) 123-4567   •   linkedin.com/in/janedoe   •   San Francisco, CA',
    { fontSize: 9, color: '#9CA3AF', font: 'Helvetica' }));

  let y = 150;
  const section = (title: string) => {
    els.push(text({ x: M, y, width: A4.width - M * 2, height: 18 }, title,
      { fontSize: 12, fontWeight: 'bold', color: '#1F2937' }));
    els.push(line({ x: M, y: y + 20, width: A4.width - M * 2, height: 1 }, '#E5E7EB', 1));
    y += 32;
  };

  section('SUMMARY');
  els.push(text({ x: M, y, width: A4.width - M * 2, height: 50 },
    'Full-stack engineer with 8+ years building scalable web applications. Proven track record leading teams and delivering high-impact features across fintech and SaaS products.',
    { fontSize: 10, color: '#374151', lineHeight: 1.5 }));
  y += 60;

  section('EXPERIENCE');
  const exp = [
    { role: 'Senior Software Engineer', co: 'Acme Corp', period: '2022 — Present',
      body: '• Led migration of monolith to microservices, reducing deploy time by 70%.\n• Mentored 5 engineers; owned the payments platform serving 2M+ users.' },
    { role: 'Software Engineer', co: 'StartupXYZ', period: '2019 — 2022',
      body: '• Built core React/TypeScript design system used across 4 product lines.\n• Improved API latency p95 from 800ms to 120ms.' },
    { role: 'Junior Developer', co: 'WebStudio', period: '2017 — 2019',
      body: '• Shipped 12+ client websites using Next.js and headless CMS platforms.' },
  ];
  for (const e of exp) {
    els.push(text({ x: M, y, width: 350, height: 16 }, e.role, { fontSize: 11, fontWeight: 'bold', color: '#111827' }));
    els.push(text({ x: A4.width - M - 150, y, width: 150, height: 16 }, e.period, { fontSize: 9, color: '#6B7280', align: 'right' }));
    els.push(text({ x: M, y: y + 16, width: A4.width - M * 2, height: 14 }, e.co, { fontSize: 10, fontStyle: 'italic', color: '#4B5563' }));
    els.push(text({ x: M, y: y + 34, width: A4.width - M * 2, height: 40 }, e.body, { fontSize: 9.5, color: '#374151', lineHeight: 1.45 }));
    y += 90;
  }

  section('EDUCATION');
  els.push(text({ x: M, y, width: 350, height: 16 }, 'B.S. Computer Science', { fontSize: 11, fontWeight: 'bold', color: '#111827' }));
  els.push(text({ x: A4.width - M - 150, y, width: 150, height: 16 }, '2013 — 2017', { fontSize: 9, color: '#6B7280', align: 'right' }));
  els.push(text({ x: M, y: y + 16, width: A4.width - M * 2, height: 14 }, 'University of California, Berkeley', { fontSize: 10, fontStyle: 'italic', color: '#4B5563' }));
  y += 48;

  section('SKILLS');
  els.push(text({ x: M, y, width: A4.width - M * 2, height: 48 },
    'TypeScript • React • Node.js • Python • PostgreSQL • AWS • Docker • Kubernetes • GraphQL • Redis',
    { fontSize: 10, color: '#374151', lineHeight: 1.6 }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 2 — Invoice
// --------------------------------------------------------------------------
function buildInvoice(): Page[] {
  const M = 48;
  const page = blankPage();
  const els: Element[] = [];

  els.push(text({ x: M, y: M, width: 300, height: 40 }, 'INVOICE',
    { fontSize: 32, fontWeight: 'bold', color: '#0F172A' }));
  els.push(text({ x: A4.width - M - 200, y: M, width: 200, height: 16 }, 'Invoice #INV-2026-001',
    { fontSize: 10, color: '#475569', align: 'right' }));
  els.push(text({ x: A4.width - M - 200, y: M + 20, width: 200, height: 14 }, 'Issued: {{date}}',
    { fontSize: 9, color: '#64748B', align: 'right' }));
  els.push(text({ x: A4.width - M - 200, y: M + 36, width: 200, height: 14 }, 'Due: Net 30',
    { fontSize: 9, color: '#64748B', align: 'right' }));

  // From / To blocks
  els.push(text({ x: M, y: 130, width: 240, height: 14 }, 'FROM',
    { fontSize: 9, fontWeight: 'bold', color: '#64748B' }));
  els.push(text({ x: M, y: 148, width: 240, height: 60 },
    'Your Company Name\n123 Business Ave\nSan Francisco, CA 94103\nhello@yourcompany.com',
    { fontSize: 10, color: '#0F172A', lineHeight: 1.45 }));

  els.push(text({ x: A4.width / 2 + 20, y: 130, width: 240, height: 14 }, 'BILL TO',
    { fontSize: 9, fontWeight: 'bold', color: '#64748B' }));
  els.push(text({ x: A4.width / 2 + 20, y: 148, width: 240, height: 60 },
    'Client Company\n456 Client Street\nNew York, NY 10001\nbilling@client.com',
    { fontSize: 10, color: '#0F172A', lineHeight: 1.45 }));

  // Items table
  els.push(table(
    { x: M, y: 240, width: A4.width - M * 2, height: 200 },
    [280, 70, 80, 70],
    [
      { cells: ['Description', 'Qty', 'Rate', 'Amount'], background: '#0F172A', height: 30 },
      { cells: ['Website redesign — landing + 4 pages', '1', '$4,000', '$4,000'] },
      { cells: ['UX audit & recommendations', '1', '$1,500', '$1,500'] },
      { cells: ['Monthly support retainer', '3', '$500', '$1,500'] },
      { cells: ['Hosting & deployment setup', '1', '$350', '$350'] },
    ],
    '#E2E8F0'
  ));

  // Totals
  const totalsY = 470;
  els.push(text({ x: A4.width - M - 260, y: totalsY, width: 160, height: 16 }, 'Subtotal',
    { fontSize: 10, color: '#475569', align: 'right' }));
  els.push(text({ x: A4.width - M - 90, y: totalsY, width: 90, height: 16 }, '$7,350.00',
    { fontSize: 10, color: '#0F172A', align: 'right' }));
  els.push(text({ x: A4.width - M - 260, y: totalsY + 20, width: 160, height: 16 }, 'Tax (10%)',
    { fontSize: 10, color: '#475569', align: 'right' }));
  els.push(text({ x: A4.width - M - 90, y: totalsY + 20, width: 90, height: 16 }, '$735.00',
    { fontSize: 10, color: '#0F172A', align: 'right' }));
  els.push(line({ x: A4.width - M - 260, y: totalsY + 44, width: 260, height: 1 }, '#CBD5E1', 1));
  els.push(text({ x: A4.width - M - 260, y: totalsY + 52, width: 160, height: 20 }, 'Total Due',
    { fontSize: 13, fontWeight: 'bold', color: '#0F172A', align: 'right' }));
  els.push(text({ x: A4.width - M - 90, y: totalsY + 52, width: 90, height: 20 }, '$8,085.00',
    { fontSize: 13, fontWeight: 'bold', color: '#0F172A', align: 'right' }));

  // Footer note
  els.push(text({ x: M, y: 650, width: A4.width - M * 2, height: 40 },
    'Thank you for your business! Please remit payment by bank transfer or check within 30 days.',
    { fontSize: 9, color: '#64748B', align: 'center' }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 3 — Business Letter
// --------------------------------------------------------------------------
function buildLetter(): Page[] {
  const M = 72;
  const page = blankPage();
  const els: Element[] = [];

  // Sender block
  els.push(text({ x: M, y: M, width: 300, height: 60 },
    'Your Name\n123 Main Street\nCity, State 12345',
    { fontSize: 11, color: '#111111', lineHeight: 1.4 }));

  // Date
  els.push(text({ x: M, y: 180, width: A4.width - M * 2, height: 16 }, '{{date}}',
    { fontSize: 11, color: '#111111' }));

  // Recipient
  els.push(text({ x: M, y: 220, width: 300, height: 60 },
    'Recipient Name\nCompany Name\n456 Business Rd\nCity, State 67890',
    { fontSize: 11, color: '#111111', lineHeight: 1.4 }));

  // Salutation
  els.push(text({ x: M, y: 310, width: A4.width - M * 2, height: 18 }, 'Dear Recipient,',
    { fontSize: 11, color: '#111111' }));

  // Body
  els.push(text({ x: M, y: 345, width: A4.width - M * 2, height: 300 },
    'I am writing to formally introduce myself and express my interest in your organization. Over the past several years, I have developed expertise that I believe would bring significant value to your team.\n\nI would welcome the opportunity to discuss this further at your convenience. Please find attached my resume and references for your review.\n\nThank you for your time and consideration. I look forward to hearing from you soon.',
    { fontSize: 11, color: '#111111', align: 'justify', lineHeight: 1.6 }));

  // Closing
  els.push(text({ x: M, y: 680, width: A4.width - M * 2, height: 16 }, 'Sincerely,',
    { fontSize: 11, color: '#111111' }));
  els.push(text({ x: M, y: 740, width: A4.width - M * 2, height: 16 }, 'Your Name',
    { fontSize: 11, fontWeight: 'bold', color: '#111111' }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 4 — Business Report
// --------------------------------------------------------------------------
function buildReport(): Page[] {
  const M = 56;
  const page = blankPage({
    header: { enabled: true, text: 'Quarterly Business Report — Q1 2026', fontSize: 9, color: '#6B7280', align: 'center' },
    footer: { enabled: true, text: 'Confidential', fontSize: 9, color: '#6B7280', align: 'center' },
    pageNumber: { enabled: true, position: 'bottom-right', format: 'Page 1 of N', fontSize: 9, color: '#6B7280' },
  });
  const els: Element[] = [];

  // Title
  els.push(rect({ x: 0, y: 60, width: 8, height: 80 }, '#2563EB'));
  els.push(text({ x: M, y: 70, width: A4.width - M * 2, height: 40 }, 'Quarterly Business Report',
    { fontSize: 24, fontWeight: 'bold', color: '#0F172A' }));
  els.push(text({ x: M, y: 108, width: A4.width - M * 2, height: 20 }, 'Q1 2026  •  Prepared by the Strategy Team',
    { fontSize: 11, color: '#6B7280' }));

  // Executive summary box
  els.push(rect({ x: M, y: 170, width: A4.width - M * 2, height: 110 }, '#F1F5F9', { radius: 8 }));
  els.push(text({ x: M + 20, y: 185, width: A4.width - M * 2 - 40, height: 20 }, 'EXECUTIVE SUMMARY',
    { fontSize: 10, fontWeight: 'bold', color: '#2563EB' }));
  els.push(text({ x: M + 20, y: 210, width: A4.width - M * 2 - 40, height: 70 },
    'Q1 delivered record-breaking performance across all major KPIs. Revenue grew 28% year-over-year to $12.4M, customer retention reached an all-time high of 94%, and we successfully launched two strategic product lines ahead of schedule.',
    { fontSize: 10, color: '#1E293B', lineHeight: 1.5 }));

  // Metrics row
  const cardY = 310;
  const cardW = (A4.width - M * 2 - 30) / 3;
  const metrics = [
    { label: 'Revenue', value: '$12.4M', delta: '+28% YoY', color: '#10B981' },
    { label: 'Retention', value: '94%', delta: '+3 pts', color: '#2563EB' },
    { label: 'New Customers', value: '1,847', delta: '+41% QoQ', color: '#F59E0B' },
  ];
  metrics.forEach((m, i) => {
    const x = M + i * (cardW + 15);
    els.push(rect({ x, y: cardY, width: cardW, height: 90 }, '#FFFFFF', { radius: 6, strokeColor: '#E2E8F0', strokeWidth: 1 }));
    els.push(text({ x: x + 14, y: cardY + 14, width: cardW - 28, height: 14 }, m.label.toUpperCase(),
      { fontSize: 9, fontWeight: 'bold', color: '#64748B' }));
    els.push(text({ x: x + 14, y: cardY + 32, width: cardW - 28, height: 30 }, m.value,
      { fontSize: 22, fontWeight: 'bold', color: '#0F172A' }));
    els.push(text({ x: x + 14, y: cardY + 64, width: cardW - 28, height: 14 }, m.delta,
      { fontSize: 10, color: m.color }));
  });

  // Section heading
  els.push(text({ x: M, y: 430, width: A4.width - M * 2, height: 22 }, 'Key Highlights',
    { fontSize: 16, fontWeight: 'bold', color: '#0F172A' }));
  els.push(line({ x: M, y: 456, width: 60, height: 2 }, '#2563EB', 2));

  els.push(text({ x: M, y: 472, width: A4.width - M * 2, height: 180 },
    '• Launched two flagship products — AnalyticsPro and TeamSync — both exceeding adoption targets in their first 30 days.\n\n• Expanded into EMEA with new offices in London and Berlin; early pipeline indicates strong demand in financial services vertical.\n\n• Invested $2.1M in R&D focused on AI-assisted workflows, with first features rolling out to beta users in April.\n\n• Strengthened leadership bench with three senior hires in engineering, marketing, and customer success.',
    { fontSize: 10.5, color: '#1E293B', lineHeight: 1.6 }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 5 — Event Flyer
// --------------------------------------------------------------------------
function buildFlyer(): Page[] {
  const page = blankPage({ background: '#FEF3C7' });
  const els: Element[] = [];

  // Colored top band
  els.push(rect({ x: 0, y: 0, width: A4.width, height: 220 }, '#DC2626'));
  els.push(rect({ x: 0, y: 200, width: A4.width, height: 30 }, '#991B1B'));

  // Overline
  els.push(text({ x: 40, y: 60, width: A4.width - 80, height: 16 }, '• • •   YOU ARE INVITED   • • •',
    { fontSize: 11, fontWeight: 'bold', color: '#FEF3C7', align: 'center' }));

  // Title
  els.push(text({ x: 40, y: 90, width: A4.width - 80, height: 70 }, 'SUMMER FESTIVAL',
    { fontSize: 48, fontWeight: 'bold', color: '#FFFFFF', align: 'center' }));
  els.push(text({ x: 40, y: 160, width: A4.width - 80, height: 30 }, 'Live Music  •  Food Trucks  •  Art Market',
    { fontSize: 14, color: '#FEE2E2', align: 'center' }));

  // Date block
  els.push(rect({ x: A4.width / 2 - 120, y: 260, width: 240, height: 120 }, '#FFFFFF', { radius: 16, strokeColor: '#DC2626', strokeWidth: 3 }));
  els.push(text({ x: A4.width / 2 - 120, y: 280, width: 240, height: 22 }, 'SATURDAY',
    { fontSize: 14, fontWeight: 'bold', color: '#DC2626', align: 'center' }));
  els.push(text({ x: A4.width / 2 - 120, y: 305, width: 240, height: 56 }, 'JULY 15',
    { fontSize: 44, fontWeight: 'bold', color: '#0F172A', align: 'center' }));
  els.push(text({ x: A4.width / 2 - 120, y: 355, width: 240, height: 20 }, '2026  •  12pm — 10pm',
    { fontSize: 12, color: '#475569', align: 'center' }));

  // Details
  els.push(text({ x: 40, y: 430, width: A4.width - 80, height: 26 }, 'WHAT TO EXPECT',
    { fontSize: 14, fontWeight: 'bold', color: '#0F172A', align: 'center' }));
  els.push(text({ x: 80, y: 466, width: A4.width - 160, height: 150 },
    '🎸  Headline acts on the main stage all afternoon\n\n🍔  20+ food trucks offering cuisine from around the world\n\n🎨  Local artisan market with handmade goods\n\n🎡  Family-friendly games and kid zone',
    { fontSize: 13, color: '#1E293B', align: 'left', lineHeight: 1.8 }));

  // Location
  els.push(rect({ x: 40, y: 640, width: A4.width - 80, height: 90 }, '#0F172A', { radius: 12 }));
  els.push(text({ x: 60, y: 658, width: A4.width - 120, height: 18 }, 'LOCATION',
    { fontSize: 10, fontWeight: 'bold', color: '#FCA5A5' }));
  els.push(text({ x: 60, y: 678, width: A4.width - 120, height: 24 }, 'Riverfront Park',
    { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }));
  els.push(text({ x: 60, y: 704, width: A4.width - 120, height: 18 }, '500 Waterfront Dr, Your City',
    { fontSize: 11, color: '#CBD5E1' }));

  // Footer
  els.push(text({ x: 40, y: 760, width: A4.width - 80, height: 20 }, 'Free entry  •  rsvp@summerfest.example',
    { fontSize: 11, fontWeight: 'bold', color: '#0F172A', align: 'center' }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 6 — Confidential Report (watermark example)
// --------------------------------------------------------------------------
function buildConfidentialReport(): Page[] {
  const M = 56;
  const page = blankPage({
    header: { enabled: true, text: 'INTERNAL — DO NOT DISTRIBUTE', fontSize: 9, color: '#DC2626', align: 'center' },
    footer: { enabled: true, text: 'Classified • Page {{pageNumber}} of {{totalPages}}', fontSize: 9, color: '#6B7280', align: 'center' },
  });
  const els: Element[] = [];

  // Watermark behind content
  els.push(buildWatermark(A4.width, A4.height, {
    text: 'CONFIDENTIAL', color: '#DC2626', opacity: 0.08, fontSize: 110, rotation: -30,
  }));

  // Red title stripe
  els.push(rect({ x: 0, y: 70, width: A4.width, height: 6 }, '#DC2626'));
  els.push(text({ x: M, y: 96, width: A4.width - M * 2, height: 34 }, 'Security Incident Review',
    { fontSize: 22, fontWeight: 'bold', color: '#0F172A' }));
  els.push(text({ x: M, y: 132, width: A4.width - M * 2, height: 16 }, 'Prepared: {{date}}   •   Classification: Internal',
    { fontSize: 10, color: '#64748B' }));

  // Executive summary
  els.push(text({ x: M, y: 180, width: A4.width - M * 2, height: 20 }, 'EXECUTIVE SUMMARY',
    { fontSize: 11, fontWeight: 'bold', color: '#DC2626' }));
  els.push(line({ x: M, y: 200, width: A4.width - M * 2, height: 1 }, '#FCA5A5', 1));
  els.push(text({ x: M, y: 212, width: A4.width - M * 2, height: 90 },
    'This document summarizes the findings of an internal security incident review conducted in Q1 2026. All findings within are classified as Internal and must not be shared outside the organization without written approval from the Security & Compliance lead.',
    { fontSize: 10.5, color: '#1E293B', lineHeight: 1.55, align: 'justify' }));

  // Severity table
  els.push(text({ x: M, y: 320, width: A4.width - M * 2, height: 20 }, 'FINDINGS BY SEVERITY',
    { fontSize: 11, fontWeight: 'bold', color: '#0F172A' }));
  els.push(table(
    { x: M, y: 348, width: A4.width - M * 2, height: 160 },
    [120, 80, 283],
    [
      { cells: ['Severity', 'Count', 'Notes'], background: '#0F172A', height: 28 },
      { cells: ['Critical', '2', 'Remediation in progress; fix ETA 14 days.'] },
      { cells: ['High', '4', 'Two patched; two scheduled for next cycle.'] },
      { cells: ['Medium', '7', 'All triaged; tracked in jira.'] },
      { cells: ['Low', '11', 'Backlog for hardening sprint.'] },
    ],
    '#E2E8F0'
  ));

  // Next steps
  els.push(text({ x: M, y: 540, width: A4.width - M * 2, height: 20 }, 'NEXT STEPS',
    { fontSize: 11, fontWeight: 'bold', color: '#0F172A' }));
  els.push(text({ x: M, y: 566, width: A4.width - M * 2, height: 180 },
    '1. Complete remediation of the two critical findings before the end of the month.\n\n2. Re-run full penetration test after remediation is deployed.\n\n3. Present updated risk register to the Executive Committee in the May all-hands.\n\n4. Expand employee security-awareness training to cover phishing scenarios identified in Finding #3.',
    { fontSize: 10.5, color: '#1E293B', lineHeight: 1.7 }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 7 — Business Card (2x5 on A4)
// --------------------------------------------------------------------------
function buildBusinessCard(): Page[] {
  const page = blankPage();
  const els: Element[] = [];

  const cardW = 252; // 3.5" at 72dpi
  const cardH = 144; // 2"
  const gapX = 20; const gapY = 20;
  const startX = (A4.width - cardW * 2 - gapX) / 2;
  const startY = 60;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // Card background
      els.push(rect({ x, y, width: cardW, height: cardH }, '#FFFFFF', { radius: 6, strokeColor: '#CBD5E1', strokeWidth: 1 }));
      // Left accent bar
      els.push(rect({ x, y, width: 6, height: cardH }, '#2563EB', { radius: 0 }));

      // Logo circle
      els.push(rect({ x: x + 22, y: y + 20, width: 32, height: 32 }, '#2563EB', { radius: 16 }));
      els.push(text({ x: x + 22, y: y + 30, width: 32, height: 18 }, 'YC',
        { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', align: 'center' }));

      // Name & role
      els.push(text({ x: x + 62, y: y + 22, width: cardW - 70, height: 18 }, 'Your Name',
        { fontSize: 13, fontWeight: 'bold', color: '#0F172A' }));
      els.push(text({ x: x + 62, y: y + 40, width: cardW - 70, height: 14 }, 'Job Title',
        { fontSize: 10, color: '#64748B' }));

      // Separator
      els.push(line({ x: x + 22, y: y + 70, width: cardW - 44, height: 1 }, '#E2E8F0', 1));

      // Contact info
      els.push(text({ x: x + 22, y: y + 80, width: cardW - 44, height: 14 }, 'hello@yourcompany.com',
        { fontSize: 9, color: '#1E293B' }));
      els.push(text({ x: x + 22, y: y + 96, width: cardW - 44, height: 14 }, '+1 (555) 123-4567',
        { fontSize: 9, color: '#1E293B' }));
      els.push(text({ x: x + 22, y: y + 112, width: cardW - 44, height: 14 }, 'yourcompany.com',
        { fontSize: 9, color: '#2563EB' }));
    }
  }

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 8 — Newsletter
// --------------------------------------------------------------------------
function buildNewsletter(): Page[] {
  const M = 40;
  const page = blankPage();
  const els: Element[] = [];

  // Masthead
  els.push(rect({ x: 0, y: 0, width: A4.width, height: 110 }, '#0F172A'));
  els.push(text({ x: M, y: 24, width: A4.width - M * 2, height: 20 }, 'ISSUE #24   •   APRIL 2026',
    { fontSize: 10, fontWeight: 'bold', color: '#94A3B8' }));
  els.push(text({ x: M, y: 48, width: A4.width - M * 2, height: 42 }, 'THE MONTHLY DIGEST',
    { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' }));

  // Lead story
  els.push(text({ x: M, y: 135, width: A4.width - M * 2, height: 18 }, 'LEAD STORY',
    { fontSize: 9, fontWeight: 'bold', color: '#2563EB' }));
  els.push(text({ x: M, y: 155, width: A4.width - M * 2, height: 60 },
    'The Future of Remote Work: What the Data Tells Us',
    { fontSize: 24, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.2 }));
  els.push(text({ x: M, y: 220, width: A4.width - M * 2, height: 80 },
    'New research from our analytics team suggests that hybrid arrangements are becoming the default across knowledge-worker industries. We break down the numbers and explore what this shift means for hiring, culture, and productivity.',
    { fontSize: 11, color: '#334155', lineHeight: 1.6 }));

  // Two-column section
  const colW = (A4.width - M * 2 - 20) / 2;
  const colY = 330;
  const stories = [
    { tag: 'INDUSTRY', title: '5 Tools Changing How Teams Collaborate', body: 'From async video to AI-assisted writing, these platforms are reshaping daily workflows across sectors.' },
    { tag: 'OPINION', title: 'Why Small Teams Outperform Big Ones', body: 'A case study of three startups that scaled revenue 10x while keeping headcount under 20 people.' },
  ];
  stories.forEach((s, i) => {
    const x = M + i * (colW + 20);
    els.push(rect({ x, y: colY, width: colW, height: 4 }, '#2563EB'));
    els.push(text({ x, y: colY + 14, width: colW, height: 14 }, s.tag,
      { fontSize: 9, fontWeight: 'bold', color: '#2563EB' }));
    els.push(text({ x, y: colY + 32, width: colW, height: 40 }, s.title,
      { fontSize: 16, fontWeight: 'bold', color: '#0F172A', lineHeight: 1.25 }));
    els.push(text({ x, y: colY + 78, width: colW, height: 100 }, s.body,
      { fontSize: 10.5, color: '#475569', lineHeight: 1.6 }));
  });

  // Quote block
  els.push(rect({ x: M, y: 490, width: A4.width - M * 2, height: 90 }, '#F1F5F9', { radius: 8 }));
  els.push(rect({ x: M, y: 490, width: 4, height: 90 }, '#2563EB'));
  els.push(text({ x: M + 20, y: 506, width: A4.width - M * 2 - 40, height: 40 },
    '"The companies that win the next decade will be those that treat flexibility as a feature, not a favor."',
    { fontSize: 14, fontStyle: 'italic', color: '#0F172A', lineHeight: 1.5 }));
  els.push(text({ x: M + 20, y: 556, width: A4.width - M * 2 - 40, height: 14 }, '— Jane Doe, Chief People Officer',
    { fontSize: 10, color: '#64748B' }));

  // Upcoming events table
  els.push(text({ x: M, y: 610, width: A4.width - M * 2, height: 20 }, 'UPCOMING EVENTS',
    { fontSize: 10, fontWeight: 'bold', color: '#2563EB' }));
  els.push(table(
    { x: M, y: 634, width: A4.width - M * 2, height: 120 },
    [100, 300, 115],
    [
      { cells: ['Date', 'Event', 'Location'], background: '#0F172A', height: 26 },
      { cells: ['Apr 22', 'Q2 Kickoff Webinar', 'Online'] },
      { cells: ['May 05', 'Product Launch: AnalyticsPro', 'San Francisco'] },
      { cells: ['May 18', 'Engineering All-Hands', 'New York'] },
    ],
    '#E2E8F0'
  ));

  // Footer
  els.push(text({ x: M, y: 780, width: A4.width - M * 2, height: 16 }, 'yourcompany.com/newsletter   •   unsubscribe anytime',
    { fontSize: 9, color: '#94A3B8', align: 'center' }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 9 — Certificate
// --------------------------------------------------------------------------
function buildCertificate(): Page[] {
  // Landscape
  const page = blankPage({ width: 842, height: 595, background: '#FFFCF5' });
  const W = 842, H = 595;
  const els: Element[] = [];

  // Watermark — subtle seal
  els.push(buildWatermark(W, H, {
    text: 'OFFICIAL', color: '#B45309', opacity: 0.06, fontSize: 120, rotation: -20,
  }));

  // Ornamental borders
  els.push(rect({ x: 24, y: 24, width: W - 48, height: H - 48 }, '#FFFCF5',
    { strokeColor: '#B45309', strokeWidth: 3 }));
  els.push(rect({ x: 36, y: 36, width: W - 72, height: H - 72 }, '#FFFCF5',
    { strokeColor: '#D97706', strokeWidth: 1 }));

  // Header ornament
  els.push(text({ x: 0, y: 80, width: W, height: 20 }, '✦  ✦  ✦',
    { fontSize: 14, color: '#B45309', align: 'center' }));

  // Title
  els.push(text({ x: 60, y: 110, width: W - 120, height: 56 }, 'Certificate of Achievement',
    { fontSize: 40, fontWeight: 'bold', color: '#78350F', align: 'center', font: 'Georgia' }));
  els.push(line({ x: W / 2 - 120, y: 176, width: 240, height: 2 }, '#D97706', 2));

  // Subheading
  els.push(text({ x: 60, y: 200, width: W - 120, height: 20 }, 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
    { fontSize: 11, color: '#92400E', align: 'center' }));

  // Name
  els.push(text({ x: 60, y: 240, width: W - 120, height: 60 }, 'Recipient Name',
    { fontSize: 48, fontStyle: 'italic', color: '#0F172A', align: 'center', font: 'Georgia' }));
  els.push(line({ x: W / 2 - 200, y: 310, width: 400, height: 1 }, '#D97706', 1));

  // Body
  els.push(text({ x: 120, y: 340, width: W - 240, height: 60 },
    'For outstanding performance and dedication demonstrated throughout the program. Awarded in recognition of exceptional commitment and hard work.',
    { fontSize: 12, color: '#44403C', align: 'center', lineHeight: 1.6 }));

  // Signatures
  const sigY = 470;
  els.push(line({ x: 120, y: sigY, width: 180, height: 1 }, '#78716C', 1));
  els.push(text({ x: 120, y: sigY + 6, width: 180, height: 14 }, 'Director',
    { fontSize: 10, color: '#78716C', align: 'center' }));
  els.push(line({ x: W - 300, y: sigY, width: 180, height: 1 }, '#78716C', 1));
  els.push(text({ x: W - 300, y: sigY + 6, width: 180, height: 14 }, 'Date',
    { fontSize: 10, color: '#78716C', align: 'center' }));

  // Seal
  els.push(rect({ x: W / 2 - 40, y: 440, width: 80, height: 80 }, '#FEF3C7', { radius: 40, strokeColor: '#B45309', strokeWidth: 2 }));
  els.push(text({ x: W / 2 - 40, y: 470, width: 80, height: 20 }, 'SEAL',
    { fontSize: 10, fontWeight: 'bold', color: '#B45309', align: 'center' }));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 10 — Meeting Notes
// --------------------------------------------------------------------------
function buildMeetingNotes(): Page[] {
  const M = 56;
  const page = blankPage();
  const els: Element[] = [];

  // Header box
  els.push(rect({ x: M, y: 50, width: A4.width - M * 2, height: 110 }, '#F1F5F9', { radius: 8 }));
  els.push(text({ x: M + 20, y: 66, width: A4.width - M * 2 - 40, height: 30 }, 'Meeting Notes',
    { fontSize: 22, fontWeight: 'bold', color: '#0F172A' }));
  els.push(text({ x: M + 20, y: 100, width: 180, height: 16 }, 'Date',
    { fontSize: 9, fontWeight: 'bold', color: '#64748B' }));
  els.push(text({ x: M + 20, y: 116, width: 180, height: 16 }, '{{date}}',
    { fontSize: 11, color: '#0F172A' }));
  els.push(text({ x: M + 220, y: 100, width: 180, height: 16 }, 'Time',
    { fontSize: 9, fontWeight: 'bold', color: '#64748B' }));
  els.push(text({ x: M + 220, y: 116, width: 180, height: 16 }, '{{time}}',
    { fontSize: 11, color: '#0F172A' }));
  els.push(text({ x: M + 20, y: 136, width: A4.width - M * 2 - 40, height: 16 }, 'Attendees: Add names here',
    { fontSize: 10, color: '#475569' }));

  // Agenda
  els.push(text({ x: M, y: 190, width: A4.width - M * 2, height: 20 }, 'AGENDA',
    { fontSize: 11, fontWeight: 'bold', color: '#2563EB' }));
  els.push(line({ x: M, y: 212, width: A4.width - M * 2, height: 1 }, '#CBD5E1', 1));
  els.push(text({ x: M, y: 224, width: A4.width - M * 2, height: 90 },
    '1. Project status update\n2. Q2 roadmap review\n3. Blockers & dependencies\n4. Action items',
    { fontSize: 11, color: '#1E293B', lineHeight: 1.8 }));

  // Discussion
  els.push(text({ x: M, y: 330, width: A4.width - M * 2, height: 20 }, 'DISCUSSION',
    { fontSize: 11, fontWeight: 'bold', color: '#2563EB' }));
  els.push(line({ x: M, y: 352, width: A4.width - M * 2, height: 1 }, '#CBD5E1', 1));
  els.push(rect({ x: M, y: 365, width: A4.width - M * 2, height: 140 }, '#FFFFFF',
    { radius: 4, strokeColor: '#E2E8F0', strokeWidth: 1 }));
  els.push(text({ x: M + 16, y: 378, width: A4.width - M * 2 - 32, height: 120 }, 'Write notes here...',
    { fontSize: 10, color: '#94A3B8', fontStyle: 'italic', lineHeight: 1.6 }));

  // Action items
  els.push(text({ x: M, y: 525, width: A4.width - M * 2, height: 20 }, 'ACTION ITEMS',
    { fontSize: 11, fontWeight: 'bold', color: '#2563EB' }));
  els.push(table(
    { x: M, y: 552, width: A4.width - M * 2, height: 160 },
    [36, 240, 120, 87],
    [
      { cells: ['', 'Task', 'Owner', 'Due'], background: '#0F172A', height: 26 },
      { cells: ['☐', 'Task description', 'Name', 'Date'] },
      { cells: ['☐', 'Task description', 'Name', 'Date'] },
      { cells: ['☐', 'Task description', 'Name', 'Date'] },
      { cells: ['☐', 'Task description', 'Name', 'Date'] },
    ],
    '#E2E8F0'
  ));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Template 11 — Project Proposal
// --------------------------------------------------------------------------
function buildProposal(): Page[] {
  const M = 48;
  const page = blankPage({
    footer: { enabled: true, text: 'Proposal • {{pageNumber}} of {{totalPages}}', fontSize: 9, color: '#94A3B8', align: 'center' },
  });
  const els: Element[] = [];

  // Watermark
  els.push(buildWatermark(A4.width, A4.height, {
    text: 'DRAFT', color: '#94A3B8', opacity: 0.06, fontSize: 140, rotation: -30,
  }));

  // Cover
  els.push(rect({ x: 0, y: 0, width: A4.width, height: 380 }, '#1E40AF'));
  els.push(rect({ x: 0, y: 350, width: A4.width, height: 30 }, '#1E3A8A'));
  els.push(text({ x: M, y: 60, width: A4.width - M * 2, height: 18 }, 'PROJECT PROPOSAL',
    { fontSize: 10, fontWeight: 'bold', color: '#BFDBFE' }));
  els.push(text({ x: M, y: 90, width: A4.width - M * 2, height: 120 }, 'Transforming the\nCustomer Experience',
    { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', lineHeight: 1.15 }));
  els.push(text({ x: M, y: 240, width: A4.width - M * 2, height: 20 }, 'Prepared for: Client Name',
    { fontSize: 12, color: '#BFDBFE' }));
  els.push(text({ x: M, y: 264, width: A4.width - M * 2, height: 20 }, 'Prepared by: Your Company',
    { fontSize: 12, color: '#BFDBFE' }));
  els.push(text({ x: M, y: 288, width: A4.width - M * 2, height: 20 }, 'Date: {{date}}',
    { fontSize: 12, color: '#BFDBFE' }));

  // Overview
  els.push(text({ x: M, y: 420, width: A4.width - M * 2, height: 20 }, 'PROJECT OVERVIEW',
    { fontSize: 11, fontWeight: 'bold', color: '#1E40AF' }));
  els.push(line({ x: M, y: 442, width: 60, height: 2 }, '#1E40AF', 2));
  els.push(text({ x: M, y: 458, width: A4.width - M * 2, height: 100 },
    'We propose a comprehensive 12-week engagement to rebuild your customer-facing web experience. The project will deliver a modernized design system, a re-architected frontend, and a measurement framework to track ongoing improvements.',
    { fontSize: 11, color: '#1E293B', lineHeight: 1.6, align: 'justify' }));

  // Deliverables
  els.push(text({ x: M, y: 590, width: A4.width - M * 2, height: 20 }, 'DELIVERABLES & TIMELINE',
    { fontSize: 11, fontWeight: 'bold', color: '#1E40AF' }));
  els.push(line({ x: M, y: 612, width: 60, height: 2 }, '#1E40AF', 2));
  els.push(table(
    { x: M, y: 628, width: A4.width - M * 2, height: 150 },
    [80, 260, 80, 79],
    [
      { cells: ['Phase', 'Deliverable', 'Timeline', 'Cost'], background: '#1E40AF', height: 28 },
      { cells: ['1', 'Discovery & research', '2 weeks', '$8,000'] },
      { cells: ['2', 'Design system & wireframes', '3 weeks', '$14,000'] },
      { cells: ['3', 'Implementation & QA', '6 weeks', '$32,000'] },
      { cells: ['4', 'Launch & measurement', '1 week', '$4,000'] },
    ],
    '#E2E8F0'
  ));

  page.elements = els;
  return [page];
}

// --------------------------------------------------------------------------
// Registry
// --------------------------------------------------------------------------
export const TEMPLATES: Template[] = [
  { id: 'blank',        name: 'Blank',             description: 'Start from scratch',              icon: '📄', category: 'blank',     accent: '#94A3B8', build: () => [blankPage()] },
  { id: 'resume',       name: 'Resume',            description: 'Professional CV layout',          icon: '👤', category: 'personal',  accent: '#1F2937', build: buildResume },
  { id: 'invoice',      name: 'Invoice',           description: 'Billing with line items',         icon: '🧾', category: 'business',  accent: '#0F172A', build: buildInvoice },
  { id: 'letter',       name: 'Letter',            description: 'Formal business letter',          icon: '✉️', category: 'business',  accent: '#374151', build: buildLetter },
  { id: 'report',       name: 'Report',            description: 'Quarterly business report',       icon: '📊', category: 'business',  accent: '#2563EB', build: buildReport },
  { id: 'confidential', name: 'Confidential Report', description: 'Watermarked internal report',  icon: '🔒', category: 'business',  accent: '#DC2626', build: buildConfidentialReport },
  { id: 'card',         name: 'Business Cards',    description: '10 cards on one A4 sheet',        icon: '💳', category: 'business',  accent: '#2563EB', build: buildBusinessCard },
  { id: 'newsletter',   name: 'Newsletter',        description: 'Monthly digest layout',           icon: '📰', category: 'creative',  accent: '#0F172A', build: buildNewsletter },
  { id: 'certificate',  name: 'Certificate',       description: 'Award certificate (landscape)',   icon: '🏆', category: 'education', accent: '#B45309', build: buildCertificate },
  { id: 'meeting',      name: 'Meeting Notes',     description: 'Agenda, notes, action items',     icon: '📝', category: 'business',  accent: '#2563EB', build: buildMeetingNotes },
  { id: 'proposal',     name: 'Project Proposal',  description: 'Cover + deliverables table',      icon: '📎', category: 'business',  accent: '#1E40AF', build: buildProposal },
  { id: 'flyer',        name: 'Event Flyer',       description: 'Bold announcement poster',        icon: '🎉', category: 'creative',  accent: '#DC2626', build: buildFlyer },
];

export const CATEGORIES: { id: 'all' | TemplateCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business' },
  { id: 'personal', label: 'Personal' },
  { id: 'creative', label: 'Creative' },
  { id: 'education', label: 'Education' },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
