import { generateId } from '@pdf-builder/sdk';
import type { Page, Element } from '@pdf-builder/sdk';

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
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
// Registry
// --------------------------------------------------------------------------
export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank', description: 'Start from scratch', icon: '📄', build: () => [blankPage()] },
  { id: 'resume', name: 'Resume', description: 'Professional CV layout', icon: '👤', build: buildResume },
  { id: 'invoice', name: 'Invoice', description: 'Billing with line items', icon: '🧾', build: buildInvoice },
  { id: 'letter', name: 'Letter', description: 'Formal business letter', icon: '✉️', build: buildLetter },
  { id: 'report', name: 'Report', description: 'Quarterly business report', icon: '📊', build: buildReport },
  { id: 'flyer', name: 'Flyer', description: 'Event announcement', icon: '🎉', build: buildFlyer },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
