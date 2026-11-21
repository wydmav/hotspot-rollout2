import { PaymentTransaction, Voucher, RouterDevice } from '../types';

export class ExportService {
  /**
   * Generates and triggers browser download of CSV data
   */
  static exportTransactionsToCsv(transactions: PaymentTransaction[]) {
    const headers = [
      'Transaction Ref',
      'Date & Time',
      'Provider',
      'Amount',
      'Currency',
      'Customer',
      'Plan',
      'Vertical',
      'Site',
      'Voucher Code',
      'Status'
    ];

    const rows = transactions.map((t) => [
      t.transactionRef,
      t.createdAt,
      t.provider.toUpperCase(),
      t.amount.toFixed(2),
      t.currency,
      t.phoneNumber || 'N/A',
      `"${t.planName.replace(/"/g, '""')}"`,
      t.vertical.toUpperCase(),
      `"${t.siteName.replace(/"/g, '""')}"`,
      t.voucherCodeIssued || 'N/A',
      t.status.toUpperCase()
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `tconnect_transactions_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  static exportVouchersToCsv(vouchers: Voucher[]) {
    const headers = [
      'Voucher Code',
      'Plan Name',
      'Price',
      'Currency',
      'Duration (Hours)',
      'Device Limit',
      'Status',
      'Generated Date',
      'Activated Date',
      'Registered Devices'
    ];

    const rows = vouchers.map((v) => [
      v.code,
      `"${v.planName.replace(/"/g, '""')}"`,
      v.price.toFixed(2),
      v.currency,
      (v.durationSeconds / 3600).toFixed(1),
      v.deviceLimit,
      v.status.toUpperCase(),
      v.generatedAt,
      v.firstUsedAt || 'Unclaimed',
      `"${v.associatedDevices.map((d) => d.mac).join('; ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `tconnect_vouchers_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  static exportRoutersToCsv(routers: RouterDevice[]) {
    const headers = [
      'Router Name',
      'Vertical',
      'Site Name',
      'Model',
      'OS Version',
      'MAC Address',
      'Tunnel IP (WG)',
      'Status',
      'Uptime',
      'CPU Load %',
      'Active Sessions'
    ];

    const rows = routers.map((r) => [
      `"${r.name}"`,
      r.vertical.toUpperCase(),
      `"${r.siteName}"`,
      `"${r.model}"`,
      r.rosVersion.toUpperCase(),
      r.macAddress,
      r.wireguardIp,
      r.status.toUpperCase(),
      `"${r.uptime}"`,
      `${r.cpuLoad}%`,
      r.activeSessions
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `tconnect_routers_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Generates a printable formatted executive report window (can be saved as PDF via browser Print -> Save as PDF)
   */
  static printExecutivePdfReport(data: {
    totalRevenue: number;
    activeSessions: number;
    routerCount: number;
    currency: string;
    transactions: PaymentTransaction[];
  }) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popups blocked. Please allow popups to generate the PDF report.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>T-Connect Executive Fleet & Monetization Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 2px solid #f05e17; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
            .brand span { color: #f05e17; }
            .meta { font-size: 12px; color: #64748b; text-align: right; }
            .kpis { display: flex; gap: 20px; margin-bottom: 30px; }
            .kpi-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #f8fafc; }
            .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .kpi-value { font-size: 24px; font-weight: 800; margin-top: 4px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { text-align: left; background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .completed { background: #dcfce7; color: #15803d; }
            .failed { background: #fee2e2; color: #b91c1c; }
            .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">T-CONNECT <span>HOTSPOTS</span></div>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Fleet Controller & Payment Reconciliation Ledger</p>
            </div>
            <div class="meta">
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
              <div><strong>Lesotho Production Fleet</strong></div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Reconciled Revenue</div>
              <div class="kpi-value">${data.currency} ${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Active Subscriber Sessions</div>
              <div class="kpi-value">${data.activeSessions}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">MikroTik Router Swarm</div>
              <div class="kpi-value">${data.routerCount} Deployed</div>
            </div>
          </div>

          <h3 style="font-size: 16px; margin-bottom: 8px;">Recent Financial Transactions</h3>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Plan Name</th>
                <th>Site Location</th>
                <th>Voucher Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.transactions.slice(0, 15).map(t => `
                <tr>
                  <td style="font-family: monospace;">${t.transactionRef}</td>
                  <td><strong>${t.provider.toUpperCase()}</strong></td>
                  <td>${t.currency} ${t.amount.toFixed(2)}</td>
                  <td>${t.planName}</td>
                  <td>${t.siteName}</td>
                  <td style="font-family: monospace;">${t.voucherCodeIssued || '-'}</td>
                  <td><span class="badge ${t.status === 'completed' ? 'completed' : 'failed'}">${t.status.toUpperCase()}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            T-Connect Controller · Multi-Vertical Fleet System (Hotspots · Communities · Buses · Stadiums · Parks) · Confidential
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Builds standalone A4 portrait HTML with 15 cuttable hospitality-grade T-Connect voucher cards per sheet (3 columns x 5 rows).
   * Designed for real-life reception desk printing and cutting (e.g. 300 vouchers = 20 A4 sheets).
   */
  static buildReceptionVoucherSheetsA4Html(
    vouchers: Voucher[],
    options?: {
      venueName?: string;
      wifiSsid?: string;
    }
  ): string {
    const venueName = (options?.venueName || 'Maseru Golf Course Clubhouse').trim();
    const wifiSsid = (options?.wifiSsid || 'T-Connect Hotspot').trim();
    const cardsPerPage = 15;
    const pages: Voucher[][] = [];
    for (let i = 0; i < vouchers.length; i += cardsPerPage) {
      pages.push(vouchers.slice(i, i + cardsPerPage));
    }
    if (pages.length === 0) pages.push([]);

    const logoSvg = `<svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
      <rect width="36" height="36" rx="8" fill="#FF5500"/>
      <path d="M8.5 15.5C13.75 10.6 22.25 10.6 27.5 15.5" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M12.2 19.6C15.4 16.6 20.6 16.6 23.8 19.6" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="18" cy="24.2" r="2.3" fill="#FFFFFF"/>
    </svg>`;

    const pagesHtml = pages
      .map((pageVouchers, pageIdx) => {
        const cardsHtml = pageVouchers
          .map((v, idxOnPage) => {
            const serialNum = String(pageIdx * cardsPerPage + idxOnPage + 1).padStart(3, '0');
            const rawDigits = String(v.code || '').replace(/\D/g, '').slice(0, 5) || '12345';
            return `
              <div class="vch-card">
                <span class="cut-mark cut-tl">&#9986;</span>
                <div class="vch-header">
                  <div class="vch-brand">
                    ${logoSvg}
                    <div class="vch-brand-txt">
                      <div class="vch-brand-title">T-CONNECT</div>
                      <div class="vch-brand-sub">STARLINK HIGH-SPEED WI-FI</div>
                    </div>
                  </div>
                  <span class="vch-serial">#${serialNum}</span>
                </div>

                <div class="vch-venue-bar">
                  <span>${venueName.toUpperCase()}</span>
                  <span class="vch-ssid">Wi-Fi: ${wifiSsid}</span>
                </div>

                <div class="vch-code-wrap">
                  <div class="vch-code-label">ENTER THESE 5 DIGITS TO LOG IN</div>
                  <div class="vch-code-box">
                    <span class="vch-prefix">TC-</span>
                    <span class="vch-digits">${rawDigits}</span>
                  </div>
                </div>

                <div class="vch-steps">
                  <div><strong>1.</strong> Connect to Wi-Fi &amp; enter your Name &amp; Phone</div>
                  <div><strong>2.</strong> Type <strong>${rawDigits}</strong> next to <strong>TC-</strong> &amp; tap <strong>Log in</strong></div>
                </div>

                <div class="vch-footer">
                  <span>24 HOURS VALIDITY</span>
                  <span>&bull;</span>
                  <span>UP TO 3 DEVICES</span>
                  <span>&bull;</span>
                  <span class="vch-uncapped">UNCAPPED</span>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <section class="a4-sheet">
            <div class="sheet-top-meta">
              <div><strong>T-CONNECT RECEPTION WI-FI VOUCHERS (TC-XXXXX)</strong> &mdash; ${venueName}</div>
              <div>Sheet ${pageIdx + 1} of ${pages.length} &bull; Cut along dashed lines (&#9986;) &bull; Total Batch: ${vouchers.length} Vouchers</div>
            </div>
            <div class="vch-grid">
              ${cardsHtml}
            </div>
          </section>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>T-Connect A4 Printable Reception Vouchers (${vouchers.length}x TC-XXXXX)</title>
<style>
  @page {
    size: A4 portrait;
    margin: 7mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #e2e8f0;
    color: #0f172a;
    padding: 12px;
  }
  .a4-sheet {
    width: 196mm;
    min-height: 281mm;
    margin: 0 auto 14px auto;
    background: #ffffff;
    padding: 4mm;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.15);
    page-break-after: always;
    break-after: page;
    display: flex;
    flex-direction: column;
  }
  .a4-sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .sheet-top-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    color: #475569;
    border-bottom: 1.5px solid #0b192c;
    padding-bottom: 2.2mm;
    margin-bottom: 3mm;
  }
  .vch-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(5, 1fr);
    gap: 2.5mm;
    flex: 1;
  }
  .vch-card {
    position: relative;
    border: 1.4px dashed #64748b;
    border-radius: 8px;
    background: #ffffff;
    padding: 2.6mm 2.8mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .cut-mark {
    position: absolute;
    top: -7px;
    left: 8px;
    background: #ffffff;
    padding: 0 3px;
    font-size: 9px;
    color: #64748b;
    line-height: 1;
  }
  .vch-header {
    background: #0b192c;
    color: #ffffff;
    padding: 2mm 2.4mm;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #ff5500;
  }
  .vch-brand {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .vch-brand-title {
    font-size: 9.5pt;
    font-weight: 900;
    letter-spacing: 0.4px;
    color: #ffffff;
    line-height: 1.05;
  }
  .vch-brand-sub {
    font-size: 5.5pt;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #ffb088;
    margin-top: 1px;
  }
  .vch-serial {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 7.5pt;
    font-weight: 900;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.12);
    padding: 1.5px 5px;
    border-radius: 4px;
  }
  .vch-venue-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 6pt;
    font-weight: 800;
    color: #334155;
    padding: 1.2mm 0.5mm 0.6mm;
    letter-spacing: 0.2px;
  }
  .vch-ssid {
    color: #c2410c;
    font-weight: 900;
  }
  .vch-code-wrap {
    text-align: center;
    margin: 0.8mm 0;
  }
  .vch-code-label {
    font-size: 5.6pt;
    font-weight: 900;
    color: #64748b;
    letter-spacing: 0.6px;
    margin-bottom: 1mm;
  }
  .vch-code-box {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.8px solid #0b192c;
    border-radius: 7px;
    overflow: hidden;
    background: #fff7ed;
  }
  .vch-prefix {
    background: #0b192c;
    color: #ff5500;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12.5pt;
    font-weight: 900;
    padding: 1.6mm 2.4mm;
    border-right: 1.5px solid #0b192c;
  }
  .vch-digits {
    flex: 1;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 14.5pt;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: 2.8px;
    padding: 1.4mm 2mm;
    text-align: center;
  }
  .vch-steps {
    font-size: 6.2pt;
    color: #1e293b;
    line-height: 1.38;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 1.3mm 1.8mm;
  }
  .vch-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 5.6pt;
    font-weight: 900;
    color: #0b192c;
    padding-top: 1mm;
    border-top: 1px solid #e2e8f0;
    letter-spacing: 0.3px;
  }
  .vch-uncapped {
    color: #ff5500;
  }
  @media print {
    body {
      background: #ffffff;
      padding: 0;
    }
    .a4-sheet {
      width: 100%;
      min-height: 281mm;
      margin: 0;
      padding: 0;
      box-shadow: none;
    }
  }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
  }

  /**
   * Triggers direct A4 printing using a hidden iframe so it works inside iframes without popup blockers
   */
  static printReceptionVoucherSheetsA4(
    vouchers: Voucher[],
    options?: { venueName?: string; wifiSsid?: string }
  ) {
    const html = this.buildReceptionVoucherSheetsA4Html(vouchers, options);
    const existingFrame = document.getElementById('tc_a4_voucher_print_frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'tc_a4_voucher_print_frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {}
      }, 300);
    }
  }

  /**
   * Downloads standalone A4 Printable HTML file for any reception computer or print shop
   */
  static downloadReceptionVoucherSheetsA4Html(
    vouchers: Voucher[],
    options?: { venueName?: string; wifiSsid?: string }
  ) {
    const html = this.buildReceptionVoucherSheetsA4Html(vouchers, options);
    this.downloadFile(
      html,
      `tconnect_${vouchers.length}_reception_vouchers_a4_${new Date().toISOString().slice(0, 10)}.html`,
      'text/html;charset=utf-8;'
    );
  }

  /**
   * Generates a pure Vector A4 Portrait PDF (595.28 x 841.89 pt) with 15 cuttable T-Connect voucher cards per page (3 cols x 5 rows),
   * T-Connect Orange & Navy branding, dashed cut lines, and bold TC-XXXXX 5-digit codes.
   */
  static downloadReceptionVoucherSheetsA4Pdf(
    vouchers: Voucher[],
    options?: { venueName?: string; wifiSsid?: string }
  ) {
    const venueName = (options?.venueName || 'Maseru Golf Course Clubhouse').trim();
    const wifiSsid = (options?.wifiSsid || 'T-Connect Hotspot').trim();
    const cardsPerPage = 15;
    const pages: Voucher[][] = [];
    for (let i = 0; i < vouchers.length; i += cardsPerPage) {
      pages.push(vouchers.slice(i, i + cardsPerPage));
    }
    if (pages.length === 0) pages.push([]);

    const pdfClean = (str: string) =>
      String(str || '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

    const objects: string[] = [];
    // 1: Catalog, 2: Pages, 3: Helvetica-Bold, 4: Helvetica, 5: Courier-Bold
    const pageObjIds: number[] = [];
    let nextObjId = 6;
    const pageContents: Array<{ pageId: number; contentId: number; stream: string }> = [];

    // A4 Portrait: 595 x 842 pt
    const marginX = 22;
    const topStart = 796;
    const colGap = 8;
    const rowGap = 8;
    const cardW = (595 - marginX * 2 - colGap * 2) / 3; // ~178.3 pt
    const cardH = 146; // 5 rows * 146 + 4 * 8 = 762 pt

    pages.forEach((pageVouchers, pageIdx) => {
      const pageId = nextObjId++;
      const contentId = nextObjId++;
      pageObjIds.push(pageId);

      const cmds: string[] = [];

      // Page Top Header
      cmds.push('0.043 0.098 0.173 rg'); // Navy #0B192C
      cmds.push('BT /F1 9 Tf');
      cmds.push(`1 0 0 1 ${marginX} 816 Tm`);
      cmds.push(`(${pdfClean(`T-CONNECT RECEPTION WI-FI VOUCHERS (TC-XXXXX)  -  ${venueName.toUpperCase()}`)}) Tj ET`);

      cmds.push('0.28 0.33 0.41 rg');
      cmds.push('BT /F2 7.5 Tf');
      cmds.push(`1 0 0 1 ${marginX} 805 Tm`);
      cmds.push(
        `(${pdfClean(`A4 Cuttable Sheet ${pageIdx + 1} of ${pages.length}  |  Cut along dashed lines  |  24 Hours Validity  |  Up to 3 Devices  |  Uncapped Speed`)}) Tj ET`
      );

      // Header divider line
      cmds.push('0.941 0.369 0.090 RG 1.2 w [] 0 d');
      cmds.push(`${marginX} 801 m ${595 - marginX} 801 l S`);

      pageVouchers.forEach((v, idxOnPage) => {
        const col = idxOnPage % 3;
        const row = Math.floor(idxOnPage / 3);
        const x = marginX + col * (cardW + colGap);
        const yTop = topStart - row * (cardH + rowGap);
        const yBottom = yTop - cardH;
        const serialNum = String(pageIdx * cardsPerPage + idxOnPage + 1).padStart(3, '0');
        const rawDigits = String(v.code || '').replace(/\D/g, '').slice(0, 5) || '12345';

        // 1. Dashed Cut Border around card
        cmds.push('0.45 0.52 0.61 RG 0.8 w [3 3] 0 d');
        cmds.push(`${x.toFixed(1)} ${yBottom.toFixed(1)} ${cardW.toFixed(1)} ${cardH.toFixed(1)} re S`);

        // 2. Top Navy Brand Header Bar
        const hdrH = 26;
        const hdrY = yTop - hdrH - 4;
        cmds.push('[] 0 d');
        cmds.push('0.043 0.098 0.173 rg'); // #0B192C
        cmds.push(`${(x + 4).toFixed(1)} ${hdrY.toFixed(1)} ${(cardW - 8).toFixed(1)} ${hdrH} re f`);

        // Orange accent stripe under header
        cmds.push('1 0.333 0 rg'); // #FF5500
        cmds.push(`${(x + 4).toFixed(1)} ${hdrY.toFixed(1)} ${(cardW - 8).toFixed(1)} 2.2 re f`);

        // Orange Logo Square inside header
        cmds.push('1 0.333 0 rg');
        cmds.push(`${(x + 8).toFixed(1)} ${(hdrY + 5).toFixed(1)} 16 16 re f`);
        cmds.push('1 1 1 rg');
        cmds.push('BT /F1 8.5 Tf');
        cmds.push(`1 0 0 1 ${(x + 10.2).toFixed(1)} ${(hdrY + 10).toFixed(1)} Tm (TC) Tj ET`);

        // Brand title & subtitle
        cmds.push('1 1 1 rg');
        cmds.push('BT /F1 8.5 Tf');
        cmds.push(`1 0 0 1 ${(x + 28).toFixed(1)} ${(hdrY + 14.5).toFixed(1)} Tm (T-CONNECT WI-FI) Tj ET`);
        cmds.push('1 0.69 0.53 rg');
        cmds.push('BT /F1 5.3 Tf');
        cmds.push(`1 0 0 1 ${(x + 28).toFixed(1)} ${(hdrY + 6.5).toFixed(1)} Tm (STARLINK HIGH-SPEED) Tj ET`);

        // Serial number on right
        cmds.push('0.82 0.86 0.91 rg');
        cmds.push('BT /F3 7.5 Tf');
        cmds.push(`1 0 0 1 ${(x + cardW - 32).toFixed(1)} ${(hdrY + 11).toFixed(1)} Tm (#${serialNum}) Tj ET`);

        // 3. Venue & Wi-Fi SSID line
        cmds.push('0.2 0.25 0.33 rg');
        cmds.push('BT /F1 5.8 Tf');
        cmds.push(`1 0 0 1 ${(x + 6).toFixed(1)} ${(hdrY - 10).toFixed(1)} Tm (${pdfClean(venueName.toUpperCase().slice(0, 28))}) Tj ET`);

        // 4. Center Voucher Code Box (Read-only TC- prefix + 5-digit number)
        const boxX = x + 8;
        const boxW = cardW - 16;
        const boxH = 34;
        const boxY = hdrY - 52;

        cmds.push('0.39 0.45 0.55 rg');
        cmds.push('BT /F1 5.5 Tf');
        cmds.push(`1 0 0 1 ${(x + 22).toFixed(1)} ${(boxY + boxH + 3.5).toFixed(1)} Tm (ENTER THESE 5 DIGITS TO LOG IN) Tj ET`);

        // Light warm background for code box
        cmds.push('1 0.969 0.929 rg');
        cmds.push(`${boxX.toFixed(1)} ${boxY.toFixed(1)} ${boxW.toFixed(1)} ${boxH} re f`);

        // Left Navy box for "TC-"
        const prefixW = 48;
        cmds.push('0.043 0.098 0.173 rg');
        cmds.push(`${boxX.toFixed(1)} ${boxY.toFixed(1)} ${prefixW} ${boxH} re f`);

        // Border around code box
        cmds.push('0.043 0.098 0.173 RG 1.3 w');
        cmds.push(`${boxX.toFixed(1)} ${boxY.toFixed(1)} ${boxW.toFixed(1)} ${boxH} re S`);

        // "TC-" text in T-Connect Orange
        cmds.push('1 0.333 0 rg');
        cmds.push('BT /F3 14.5 Tf');
        cmds.push(`1 0 0 1 ${(boxX + 9).toFixed(1)} ${(boxY + 11.5).toFixed(1)} Tm (TC-) Tj ET`);

        // 5-Digit Numeric Voucher Code
        cmds.push('0.059 0.090 0.165 rg');
        cmds.push('BT /F3 17.5 Tf');
        cmds.push(`1 0 0 1 ${(boxX + prefixW + 16).toFixed(1)} ${(boxY + 10.5).toFixed(1)} Tm (${pdfClean(rawDigits.split('').join(' '))}) Tj ET`);

        // 5. Guest 2-Step Instructions
        const stepY = boxY - 12;
        cmds.push('0.12 0.16 0.23 rg');
        cmds.push('BT /F2 6.2 Tf');
        cmds.push(`1 0 0 1 ${(x + 7).toFixed(1)} ${stepY.toFixed(1)} Tm (1. Connect to ${pdfClean(wifiSsid.slice(0, 18))} & enter Name & Phone) Tj ET`);
        cmds.push('BT /F1 6.2 Tf');
        cmds.push(`1 0 0 1 ${(x + 7).toFixed(1)} ${(stepY - 9).toFixed(1)} Tm (2. Type ${rawDigits} next to TC- & tap "Log in") Tj ET`);

        // 6. Card Footer Specs
        const footY = yBottom + 6;
        cmds.push('0.88 0.91 0.94 RG 0.6 w');
        cmds.push(`${(x + 6).toFixed(1)} ${(footY + 9).toFixed(1)} m ${(x + cardW - 6).toFixed(1)} ${(footY + 9).toFixed(1)} l S`);

        cmds.push('0.043 0.098 0.173 rg');
        cmds.push('BT /F1 5.6 Tf');
        cmds.push(`1 0 0 1 ${(x + 7).toFixed(1)} ${footY.toFixed(1)} Tm (24 HOURS   |   UP TO 3 DEVICES   |   UNCAPPED) Tj ET`);
      });

      pageContents.push({ pageId, contentId, stream: cmds.join('\n') });
    });

    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;
    objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
    objects[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
    objects[5] = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n`;

    pageContents.forEach((pc) => {
      objects[pc.pageId] = `${pc.pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pc.contentId} 0 R >>\nendobj\n`;
      objects[pc.contentId] = `${pc.contentId} 0 obj\n<< /Length ${pc.stream.length} >>\nstream\n${pc.stream}\nendstream\nendobj\n`;
    });

    let pdfStr = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = pdfStr.length;
      pdfStr += objects[i];
    }
    const xrefOffset = pdfStr.length;
    pdfStr += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      pdfStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdfStr += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    this.downloadFile(
      pdfStr,
      `tconnect_${vouchers.length}_reception_vouchers_a4_${new Date().toISOString().slice(0, 10)}.pdf`,
      'application/pdf'
    );
  }

  private static downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
