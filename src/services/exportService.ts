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
