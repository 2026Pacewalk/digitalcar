/* ─── DigitalCarda Template System ───
 * 30 templates with placeholder-based rendering
 * Placeholders: {{business_logo}}, {{business_name}}, {{owner_name}}, {{designation}},
 * {{phone}}, {{whatsapp}}, {{email}}, {{website}}, {{address}}, {{social_icons}},
 * {{cta_buttons}}, {{bottom_navigation}}
 */

export interface TemplateColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface TemplateData {
  id: number;
  name: string;
  slug: string;
  category: string;
  layoutType: string;
  isPremium: boolean;
  isActive: boolean;
  sortOrder: number;
  colors: TemplateColors;
  render: (data: CardData, colors: TemplateColors) => string;
}

export interface CardData {
  businessLogo?: string;
  businessName?: string;
  ownerName?: string;
  designation?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  services?: Array<{ name: string }>;
  about?: string;
}

const defaultData: CardData = {
  businessName: "Business Name",
  ownerName: "Owner Name",
  designation: "Your Designation",
  phone: "Add Phone Number",
  whatsapp: "",
  email: "Add Email",
  website: "Add Website",
  address: "Add Address",
  socialLinks: [],
};

function safe(val: string | undefined, fallback: string) {
  return val && val.trim() ? val : fallback;
}

/* ─── Social Icons Render Helper ─── */
function renderSocials(links?: Array<{ platform: string; url: string }>) {
  if (!links?.length) return '<div class="flex justify-center gap-3 mt-3"><div class="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div></div>';
  const icons: Record<string, string> = {
    facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    instagram: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7.5 3h9a4.5 4.5 0 0 1 4.5 4.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3z',
    youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z M9.75 15.02V8.48l5.75 3.27-5.75 3.27z',
    twitter: 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z',
    linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 1-2-2 2 2 0 0 1 2 2z',
    whatsapp: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  };
  return '<div class="flex justify-center gap-3 mt-3">' + links.map(l => {
    const d = icons[l.platform.toLowerCase()] || icons.facebook;
    return `<a href="${l.url}" target="_blank" class="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style="background:var(--primary)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></a>`;
  }).join('') + '</div>';
}

function ctaButtons(_c: TemplateColors, phone?: string, whatsapp?: string) {
  const p = phone || '#';
  const w = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g,'')}` : '#';
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:12px;border-radius:12px;overflow:hidden">
      <a href="tel:${p}" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;background:var(--primary);color:#fff;text-decoration:none;font-size:12px;font-weight:600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> CALL
      </a>
      <a href="${w}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;background:var(--accent);color:#fff;text-decoration:none;font-size:12px;font-weight:600;border-left:1px solid rgba(255,255,255,0.2)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> WHATSAPP
      </a>
    </div>`;
}

function bottomNav(_c: TemplateColors) {
  const items = [
    { label: 'HOME', d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { label: 'ABOUT', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 12h20' },
    { label: 'SERVICES', d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { label: 'PAYMENT', d: 'M1 4h22M1 8h22M1 4v16h22V4' },
    { label: 'QR', d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7 M14 17h4 M17 14v7' },
    { label: 'GALLERY', d: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4 5 5 4-4 5 5z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { label: 'VIDEO', d: 'M23 7l-7 5 7 5V7z M2 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' },
    { label: 'ENQUIRY', d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z m2 4h12M4 12h16' },
  ];
  return `<div style="display:grid;grid-template-columns:repeat(${items.length},1fr);gap:0;background:#fff;border-top:1px solid #E2E8F0;margin-top:auto">
    ${items.map(it => `<button style="display:flex;flex-direction:column;align-items:center;padding:6px 2px;gap:2px;border:none;background:none;cursor:pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${it.d}"/></svg><span style="font-size:6px;font-weight:600;color:#64748B">${it.label}</span></button>`).join('')}
  </div>`;
}

/* ─── Contact Row Helper ─── */
function contactRow(icon: string, _label: string, value: string, href?: string) {
  const content = `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px"><div style="width:32px;height:32px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div><span style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:500">${value}</span></div>`;
  return href ? `<a href="${href}" style="text-decoration:none;display:block">${content}</a>` : content;
}

/* ─── 30 Templates ─── */
export const TEMPLATES: TemplateData[] = [
  /* ─── 01: Classic Yellow Header ─── */
  {
    id: 1, name: "Classic Yellow Header", slug: "classic-yellow", category: "Classic",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 1,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:12px 16px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span style="color:white;font-size:10px;font-weight:600">2,847 views</span></div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
        <div style="text-align:center;padding:20px 16px 12px"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#D97706);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 4px 12px rgba(247,179,28,0.3)"><span style="color:white;font-size:24px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:var(--secondary)">${safe(d.businessName,'Business Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p>${renderSocials(d.socialLinks)}</div>
        <div style="margin:0 16px"><div style="background:var(--primary);padding:10px 24px;text-align:center;clip-path:polygon(8% 0%,92% 0%,100% 100%,0% 100%)"><p style="margin:0;color:white;font-size:14px;font-weight:bold;letter-spacing:0.5px">${safe(d.ownerName,'Owner Name')}</p><p style="margin:2px 0 0;color:rgba(255,255,255,0.8);font-size:10px">${safe(d.designation,'Your Designation')}</p></div></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#374151">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.94.37 1.87.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.94.33 1.87.57 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone Number'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>','Website',safe(d.website,'Add Website'),d.website)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:12px 16px;text-align:center;border-top:1px solid #F1F5F9;margin-top:8px"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 02: Black Gold Professional ─── */
  {
    id: 2, name: "Black Gold Professional", slug: "black-gold-pro", category: "Professional",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 2,
    colors: { primary: "#D4AF37", secondary: "#0a0a0a", accent: "#F7B31C" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:var(--secondary);border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);color:#fff">
        <div style="padding:20px 16px;text-align:center;border-bottom:2px solid var(--primary)"><div style="width:70px;height:70px;border-radius:50%;border:3px solid var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><span style="color:var(--primary);font-size:28px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:18px;font-weight:bold;color:var(--primary);letter-spacing:1px">${safe(d.businessName,'Business Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:2px">${safe(d.designation,'Your Designation')}</p></div>
        <div style="padding:16px"><div style="background:rgba(212,175,55,0.08);border-radius:12px;padding:12px;margin-bottom:12px">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(212,175,55,0.15)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(212,175,55,0.15)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>${ctaButtons(c,d.phone,d.whatsapp)}</div>
        <div style="padding:8px;text-align:center"><p style="font-size:8px;color:#64748B;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 03: White Minimal Gold ─── */
  {
    id: 3, name: "White Minimal Gold", slug: "white-minimal-gold", category: "Minimal",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 3,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#0F172A" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="padding:28px 20px 16px;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 12px"><span style="color:#0F172A;font-size:22px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:20px;font-weight:700;color:var(--secondary);letter-spacing:-0.5px">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:12px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p><p style="margin:2px 0 0;font-size:10px;color:#CBD5E1">${safe(d.businessName,'Business Name')}</p>${renderSocials(d.socialLinks)}</div>
        <div style="margin:0 16px;border-radius:14px;overflow:hidden;background:#F8FAFC;border:1px solid #F1F5F9">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone Number'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>','Website',safe(d.website,'Add Website'),d.website)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:12px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 04: Dark Corporate Card ─── */
  {
    id: 4, name: "Dark Corporate Card", slug: "dark-corporate", category: "Corporate",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 4,
    colors: { primary: "#1E293B", secondary: "#0F172A", accent: "#F7B31C" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:linear-gradient(180deg,#1E293B 0%,#0F172A 100%);border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.12)">
        <div style="background:var(--accent);height:4px"></div>
        <div style="padding:24px 20px;text-align:center"><div style="width:64px;height:64px;border-radius:16px;background:rgba(247,179,28,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;border:1px solid rgba(247,179,28,0.3)"><span style="color:var(--accent);font-size:24px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:700;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#64748B">${safe(d.designation,'Your Designation')}</p><div style="width:30px;height:2px;background:var(--accent);margin:10px auto;border-radius:1px"></div></div>
        <div style="margin:0 16px 16px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.06)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.06)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#475569;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 05: Curved Wave Header ─── */
  {
    id: 5, name: "Curved Wave Header", slug: "curved-wave", category: "Modern",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 5,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:linear-gradient(135deg,var(--primary),var(--accent));padding:24px 16px 36px;text-align:center;position:relative;border-radius:0 0 50% 50%/0 0 20% 20%"><div style="width:60px;height:60px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 4px 12px rgba(0,0,0,0.15)"><span style="color:var(--primary);font-size:24px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:-16px 16px 0;position:relative;z-index:2;border-radius:12px;overflow:hidden;background:#374151;box-shadow:0 4px 16px rgba(0,0,0,0.1)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:12px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 06: Side Icon Strip Layout ─── */
  {
    id: 6, name: "Side Icon Strip", slug: "side-icon-strip", category: "Modern",
    layoutType: "sidebar", isPremium: true, isActive: true, sortOrder: 6,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#D97706" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);display:flex">
        <div style="width:48px;background:var(--primary);display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:16px;flex-shrink:0">
          <a href="tel:${d.phone||'#'}" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;text-decoration:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.94.37 1.87.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.94.33 1.87.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>
          <a href="mailto:${d.email||'#'}" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;text-decoration:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        </div>
        <div style="flex:1;padding:16px 12px">
          <div style="text-align:center;margin-bottom:12px"><h2 style="margin:0;font-size:15px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:10px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:8px;padding:8px;background:#F8FAFC;border-radius:8px"><span style="font-size:10px;color:#64748B">${safe(d.phone,'Add Phone')}</span></div><div style="display:flex;align-items:center;gap:8px;padding:8px;background:#F8FAFC;border-radius:8px"><span style="font-size:10px;color:#64748B">${safe(d.email,'Add Email')}</span></div><div style="display:flex;align-items:center;gap:8px;padding:8px;background:#F8FAFC;border-radius:8px"><span style="font-size:10px;color:#64748B">${safe(d.website,'Add Website')}</span></div><div style="display:flex;align-items:center;gap:8px;padding:8px;background:#F8FAFC;border-radius:8px"><span style="font-size:10px;color:#64748B">${safe(d.address,'Add Address')}</span></div></div>
          ${ctaButtons(c,d.phone,d.whatsapp)}
          <div style="padding:6px;text-align:center;margin-top:8px"><p style="font-size:7px;color:#CBD5E1;margin:0">DigitalCarda</p></div>
        </div></div>`;
    },
  },
  /* ─── 07: Gold Ribbon Layout ─── */
  {
    id: 7, name: "Gold Ribbon Layout", slug: "gold-ribbon", category: "Creative",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 7,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--secondary);padding:20px 16px;text-align:center;position:relative"><div style="position:absolute;left:8px;top:8px;width:40px;height:40px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;z-index:2"><span style="color:var(--secondary);font-size:14px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#64748B">${safe(d.designation,'Your Designation')}</p><div style="width:50px;height:3px;background:var(--primary);margin:10px auto 0;border-radius:2px"></div></div>
        <div style="position:relative"><div style="height:24px;background:var(--primary);clip-path:polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)"></div></div>
        <div style="padding:0 16px 16px"><div style="border-radius:12px;overflow:hidden;background:#374151">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>${ctaButtons(c,d.phone,d.whatsapp)}<div style="padding:8px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 08: Split Black White ─── */
  {
    id: 8, name: "Split Black White", slug: "split-black-white", category: "Modern",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 8,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#F7B31C" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="display:flex"><div style="flex:1;background:var(--secondary);padding:20px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="width:50px;height:50px;border-radius:50%;border:2px solid var(--primary);display:flex;align-items:center;justify-content:center"><span style="color:var(--primary);font-size:18px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div></div><div style="flex:2;background:#fff;padding:20px 12px;text-align:center;display:flex;flex-direction:column;justify-content:center"><h2 style="margin:0;font-size:14px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:10px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div></div>
        <div style="padding:12px 16px 16px"><div style="border-radius:12px;overflow:hidden;background:#F8FAFC;border:1px solid #F1F5F9">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>${ctaButtons(c,d.phone,d.whatsapp)}</div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 09: Full Yellow Background ─── */
  {
    id: 9, name: "Full Yellow Background", slug: "full-yellow", category: "Creative",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 9,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#0F172A" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:linear-gradient(180deg,var(--primary) 0%,#D97706 100%);border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="padding:24px 16px;text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.25);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;border:2px solid rgba(255,255,255,0.4)"><span style="color:#fff;font-size:26px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:18px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:rgba(15,23,42,0.7)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:0 16px 16px;border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.3)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.2)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.2)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        <div style="margin:0 16px 16px">${ctaButtons({...c,secondary:'#0F172A'},d.phone,d.whatsapp)}</div>
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:rgba(15,23,42,0.5);margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 10: Navy Premium ─── */
  {
    id: 10, name: "Navy Premium", slug: "navy-premium", category: "Premium",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 10,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:linear-gradient(135deg,#0F172A,#1E3A5F);border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.12)">
        <div style="padding:6px 0 0"><div style="height:4px;background:linear-gradient(90deg,var(--primary),var(--accent))"></div></div>
        <div style="padding:20px 16px;text-align:center"><div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,rgba(247,179,28,0.3),rgba(20,184,166,0.3));display:flex;align-items:center;justify-content:center;margin:0 auto 10px;border:2px solid rgba(247,179,28,0.5)"><span style="color:#fff;font-size:24px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:700;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p><div style="width:40px;height:1px;background:linear-gradient(90deg,var(--primary),var(--accent));margin:10px auto;border-radius:1px"></div></div>
        <div style="margin:0 16px 16px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.06)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.06)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#475569;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 11: Diagonal Shape ─── */
  {
    id: 11, name: "Diagonal Shape", slug: "diagonal-shape", category: "Modern",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 11,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--secondary);padding:28px 16px 36px;text-align:center;position:relative;clip-path:polygon(0 0,100% 0,100% 75%,0 100%)"><div style="width:56px;height:56px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><span style="color:#0F172A;font-size:20px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:15px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:10px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:0 16px;border-radius:12px;overflow:hidden;background:#374151">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 12: Rounded CTA ─── */
  {
    id: 12, name: "Rounded CTA Layout", slug: "rounded-cta", category: "Modern",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 12,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="text-align:center;padding:24px 16px"><div style="width:64px;height:64px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 4px 12px rgba(247,179,28,0.3)"><span style="color:#0F172A;font-size:24px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:0 16px;padding:16px;border-radius:20px;background:#F8FAFC;border:1px solid #F1F5F9">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        <div style="margin:12px 16px">${ctaButtons(c,d.phone,d.whatsapp)}</div>
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 13: Bottom CTA ─── */
  {
    id: 13, name: "Bottom CTA Button", slug: "bottom-cta", category: "Classic",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 13,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);display:flex;flex-direction:column;min-height:600px">
        <div style="padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><span style="color:#0F172A;font-size:22px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:0 16px;flex:1;border-radius:12px;overflow:hidden;background:#374151">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        <div style="padding:12px 16px">${ctaButtons(c,d.phone,d.whatsapp)}</div>
        <div style="padding:8px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 14: Minimal Grid ─── */
  {
    id: 14, name: "Minimal Grid Contact", slug: "minimal-grid", category: "Minimal",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 14,
    colors: { primary: "#0F172A", secondary: "#F8FAFC", accent: "#F7B31C" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#F8FAFC;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="text-align:center;padding:24px 16px"><div style="width:52px;height:52px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><span style="color:#fff;font-size:20px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:700;color:var(--primary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:#64748B">${safe(d.designation,'Your Designation')}</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 12px 12px">
          <div style="background:#fff;border-radius:10px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div><p style="font-size:9px;color:#94A3B8;margin:0">Phone</p><p style="font-size:10px;color:var(--primary);margin:2px 0 0;font-weight:500">${safe(d.phone,'Add Phone')}</p></div>
          <div style="background:#fff;border-radius:10px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><p style="font-size:9px;color:#94A3B8;margin:0">Email</p><p style="font-size:10px;color:var(--primary);margin:2px 0 0;font-weight:500">${safe(d.email,'Add Email')}</p></div>
          <div style="background:#fff;border-radius:10px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div><p style="font-size:9px;color:#94A3B8;margin:0">Website</p><p style="font-size:10px;color:var(--primary);margin:2px 0 0;font-weight:500">${safe(d.website,'Add Website')}</p></div>
          <div style="background:#fff;border-radius:10px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><p style="font-size:9px;color:#94A3B8;margin:0">Address</p><p style="font-size:10px;color:var(--primary);margin:2px 0 0;font-weight:500">${safe(d.address,'Add Address')}</p></div>
        </div>
        <div style="padding:0 12px 12px">${ctaButtons(c,d.phone,d.whatsapp)}</div>
        <div style="padding:8px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 15: Luxury Black Gold ─── */
  {
    id: 15, name: "Luxury Black Gold", slug: "luxury-black-gold", category: "Premium",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 15,
    colors: { primary: "#D4AF37", secondary: "#0a0a0a", accent: "#D4AF37" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#0a0a0a;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.12);border:1px solid rgba(212,175,55,0.15)">
        <div style="padding:24px 16px;text-align:center"><div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#B8960C);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 4px 16px rgba(212,175,55,0.3)"><span style="color:#0a0a0a;font-size:24px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:18px;font-weight:700;color:#D4AF37;letter-spacing:1px">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:2px">${safe(d.designation,'Your Designation')}</p><div style="width:40px;height:1px;background:#D4AF37;margin:12px auto;opacity:0.5"></div></div>
        <div style="margin:0 16px 16px;border-radius:12px;overflow:hidden;background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.1)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(212,175,55,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(212,175,55,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#475569;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 16: Yellow Sidebar ─── */
  {
    id: 16, name: "Yellow Sidebar", slug: "yellow-sidebar", category: "Creative",
    layoutType: "sidebar", isPremium: false, isActive: true, sortOrder: 16,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);display:flex">
        <div style="width:56px;background:var(--primary);padding:20px 0;display:flex;flex-direction:column;align-items:center;gap:12px;flex-shrink:0">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(15,23,42,0.2);display:flex;align-items:center;justify-content:center"><span style="color:#0F172A;font-size:14px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div>
          <div style="width:1px;height:20px;background:rgba(15,23,42,0.15)"></div>
          <a href="tel:${d.phone||'#'}" style="width:32px;height:32px;border-radius:50%;background:rgba(15,23,42,0.15);display:flex;align-items:center;justify-content:center;text-decoration:none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>
          <a href="mailto:${d.email||'#'}" style="width:32px;height:32px;border-radius:50%;background:rgba(15,23,42,0.15);display:flex;align-items:center;justify-content:center;text-decoration:none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(15,23,42,0.15);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        </div>
        <div style="flex:1;padding:16px"><div style="text-align:center;margin-bottom:10px"><h2 style="margin:0;font-size:14px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:2px 0 0;font-size:10px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div><div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">${[{l:'Phone',v:d.phone||'Add Phone'},{l:'Email',v:d.email||'Add Email'},{l:'Website',v:d.website||'Add Website'},{l:'Address',v:d.address||'Add Address'}].map(item=>`<div style="padding:6px 8px;background:#F8FAFC;border-radius:8px"><p style="font-size:8px;color:#94A3B8;margin:0">${item.l}</p><p style="font-size:10px;color:var(--secondary);margin:1px 0 0;font-weight:500">${item.v}</p></div>`).join('')}</div>${ctaButtons(c,d.phone,d.whatsapp)}<div style="padding:4px;text-align:center;margin-top:6px"><p style="font-size:7px;color:#CBD5E1;margin:0">DigitalCarda</p></div></div></div>`;
    },
  },
  /* ─── 17: Floating Social ─── */
  {
    id: 17, name: "Floating Social Icons", slug: "floating-social", category: "Modern",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 17,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#EC4899" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:20px 16px;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)"><span style="color:var(--primary);font-size:20px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:15px;font-weight:bold;color:#0F172A">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:2px 0 0;font-size:10px;color:rgba(15,23,42,0.7)">${safe(d.designation,'Your Designation')}</p>
        ${d.socialLinks?.length ? '<div style="display:flex;justify-content:center;gap:8px;margin-top:10px">'+d.socialLinks.map((l)=>`<a href="${l.url}" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;text-decoration:none;backdrop-filter:blur(4px);transform:translateY(0);transition:transform 0.2s"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></a>`).join('')+'</div>' : ''}
        </div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#374151">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 18: Corporate Badge ─── */
  {
    id: 18, name: "Corporate Badge Header", slug: "corporate-badge", category: "Corporate",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 18,
    colors: { primary: "#0F172A", secondary: "#F7B31C", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center;position:relative"><div style="position:absolute;top:16px;left:16px;padding:4px 10px;background:var(--secondary);border-radius:20px"><span style="font-size:9px;font-weight:600;color:var(--primary)">PROFESSIONAL</span></div><div style="width:56px;height:56px;border-radius:12px;background:var(--secondary);display:flex;align-items:center;justify-content:center;margin:20px auto 8px"><span style="color:var(--primary);font-size:22px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:10px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#F8FAFC;border:1px solid #F1F5F9">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 19: Clean Consultant ─── */
  {
    id: 19, name: "Clean Consultant Card", slug: "consultant-card", category: "Professional",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 19,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="padding:16px 16px 0;display:flex;align-items:center;gap:12px"><div style="width:52px;height:52px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:#0F172A;font-size:18px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><div><h2 style="margin:0;font-size:15px;font-weight:bold;color:var(--secondary)">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:2px 0 0;font-size:10px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p></div></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#374151">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.1)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 20: Agency Portfolio ─── */
  {
    id: 20, name: "Agency Portfolio Card", slug: "agency-portfolio", category: "Creative",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 20,
    colors: { primary: "#EC4899", secondary: "#0F172A", accent: "#F7B31C" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:linear-gradient(180deg,#fff,#FCE7F3);border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.4)"><span style="color:#fff;font-size:22px;font-weight:bold">${(d.businessName||'B').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:14px;overflow:hidden;background:#fff;border:1px solid #F1F5F9;box-shadow:0 2px 8px rgba(0,0,0,0.04)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #E2E8F0"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 21: Doctor Professional ─── */
  {
    id: 21, name: "Doctor Professional Card", slug: "doctor-card", category: "Professional",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 21,
    colors: { primary: "#14B8A6", secondary: "#0F172A", accent: "#0D9488" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 3v4M10 5h4" stroke-linecap="round"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#f0fdfa">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #ccfbf1"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #ccfbf1"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 22: Real Estate Agent ─── */
  {
    id: 22, name: "Real Estate Agent Card", slug: "realestate-card", category: "Professional",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 22,
    colors: { primary: "#3B82F6", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#eff6ff">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #dbeafe"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #dbeafe"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 23: Retail Store ─── */
  {
    id: 23, name: "Retail Store Card", slug: "retail-card", category: "Business",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 23,
    colors: { primary: "#F97316", secondary: "#0F172A", accent: "#FB923C" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.businessName,'Business Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#fff7ed">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #fed7aa"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #fed7aa"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 24: Freelancer Brand ─── */
  {
    id: 24, name: "Freelancer Personal Brand", slug: "freelancer-card", category: "Creative",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 24,
    colors: { primary: "#8B5CF6", secondary: "#0F172A", accent: "#A78BFA" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><span style="color:#fff;font-size:22px;font-weight:bold">${(d.ownerName||'F').charAt(0)}</span></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#f5f3ff">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #e9d5ff"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #e9d5ff"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 25: Salon Beauty ─── */
  {
    id: 25, name: "Salon Beauty Card", slug: "salon-card", category: "Business",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 25,
    colors: { primary: "#EC4899", secondary: "#0F172A", accent: "#F472B6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.4)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.businessName,'Business Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#fdf2f8">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #fbcfe8"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #fbcfe8"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 26: Restaurant ─── */
  {
    id: 26, name: "Restaurant Business Card", slug: "restaurant-card", category: "Business",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 26,
    colors: { primary: "#DC2626", secondary: "#0F172A", accent: "#EF4444" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.businessName,'Business Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#fef2f2">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #fecaca"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #fecaca"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 27: Education Institute ─── */
  {
    id: 27, name: "Education Institute Card", slug: "education-card", category: "Professional",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 27,
    colors: { primary: "#2563EB", secondary: "#0F172A", accent: "#3B82F6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.66 1.79 3 4 3s4-1.34 4-3v-5"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.businessName,'Business Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#eff6ff">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #dbeafe"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #dbeafe"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 28: Service Provider ─── */
  {
    id: 28, name: "Service Provider Card", slug: "service-card", category: "Business",
    layoutType: "standard", isPremium: false, isActive: true, sortOrder: 28,
    colors: { primary: "#059669", secondary: "#0F172A", accent: "#10B981" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#ecfdf5">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #a7f3d0"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #a7f3d0"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 29: Lawyer Professional ─── */
  {
    id: 29, name: "Lawyer Professional Card", slug: "lawyer-card", category: "Professional",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 29,
    colors: { primary: "#7C2D12", secondary: "#0F172A", accent: "#92400E" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
        <div style="background:var(--primary);padding:24px 16px;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid rgba(255,255,255,0.3)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><h2 style="margin:0;font-size:16px;font-weight:bold;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.85)">${safe(d.designation,'Your Designation')}</p></div>
        <div style="margin:12px 16px;border-radius:12px;overflow:hidden;background:#fff7ed">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid #fed7aa"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid #fed7aa"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#CBD5E1;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
  /* ─── 30: Startup Founder ─── */
  {
    id: 30, name: "Startup Founder Card", slug: "startup-founder", category: "Modern",
    layoutType: "standard", isPremium: true, isActive: true, sortOrder: 30,
    colors: { primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
    render: (d, c) => {
      d = { ...defaultData, ...d };
      return `<div style="--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};font-family:Inter,sans-serif;max-width:400px;margin:0 auto;background:linear-gradient(135deg,#0F172A,#1E293B);border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.12)">
        <div style="padding:28px 16px;text-align:center;position:relative"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--primary),var(--accent))"></div><div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;margin:12px auto 10px;box-shadow:0 4px 16px rgba(247,179,28,0.25)"><span style="color:#0F172A;font-size:24px;font-weight:bold">${(d.ownerName||'S').charAt(0)}</span></div><h2 style="margin:0;font-size:17px;font-weight:700;color:#fff">${safe(d.ownerName,'Owner Name')}</h2><p style="margin:4px 0 0;font-size:11px;color:#94A3B8">${safe(d.designation,'Your Designation')}</p><p style="margin:2px 0 0;font-size:10px;color:#64748B">${safe(d.businessName,'Business Name')}</p></div>
        <div style="margin:0 16px 16px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)">${contactRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>','Phone',safe(d.phone,'Add Phone'),`tel:${d.phone||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.06)"></div>${contactRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>','Email',safe(d.email,'Add Email'),`mailto:${d.email||'#'}`)}<div style="border-top:1px solid rgba(255,255,255,0.06)"></div>${contactRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>','Address',safe(d.address,'Add Address'))}</div>
        ${ctaButtons(c,d.phone,d.whatsapp)}
        <div style="padding:10px;text-align:center"><p style="font-size:8px;color:#475569;margin:0">Powered by DigitalCarda</p></div>${bottomNav(c)}</div>`;
    },
  },
];

/* ─── Helper to get template by id ─── */
export function getTemplate(id: number): TemplateData | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplates(): TemplateData[] {
  return TEMPLATES;
}

/* ─── Render template with data ─── */
export function renderTemplate(templateId: number, data: CardData, colors?: Partial<TemplateColors>): string {
  const tmpl = getTemplate(templateId);
  if (!tmpl) return `<div style="padding:20px;text-align:center;color:#94A3B8">Template not found</div>`;
  const mergedColors = { ...tmpl.colors, ...colors };
  return tmpl.render(data, mergedColors);
}
