import { escapeHtml } from './form-utils.js';

const accents = { citron: '#cccf5a', mint: '#c9dfd2' };

/**
 * @param {{
 *   eyebrow: string,
 *   title: string,
 *   rows: string[][],
 *   accent?: 'citron' | 'mint',
 *   detail?: { label: string, text: string }
 * }} content
 */
export function renderEmailTemplate({ eyebrow, title, rows, accent = 'citron', detail }) {
  const tableRows = rows
    .map(([label, value]) => `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #d9d3cd;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #d9d3cd">${escapeHtml(value)}</td></tr>`)
    .join('');
  const detailRows = detail
    ? `<tr><th colspan="2" align="left" style="padding:20px 14px 10px">${escapeHtml(detail.label)}</th></tr><tr><td colspan="2" style="padding:0 14px 20px;line-height:1.6;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(detail.text).replaceAll('\n', '<br>')}</td></tr>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f4f1ef;color:#1d1d1b;font-family:Arial,sans-serif"><div style="margin:0 auto;max-width:680px;padding:32px 20px"><div style="background:${accents[accent]};padding:24px;border-radius:8px 8px 0 0"><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(eyebrow)}</p><h1 style="margin:0;font-size:30px;line-height:1.1">${escapeHtml(title)}</h1></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border-collapse:collapse">${tableRows}${detailRows}</table></div></body></html>`;
}
