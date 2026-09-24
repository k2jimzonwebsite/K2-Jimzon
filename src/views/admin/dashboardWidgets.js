// Presentation destinations only. These never grant access or execute commands.
export const DASHBOARD_WIDGETS = Object.freeze([
  { id: 'metrics', label: 'Shop & channel metrics', description: 'Past sales and activity on each channel, exactly as recorded.' },
  { id: 'sales', label: 'Sales & records', description: 'Payment and packing totals, plus a download of the records behind them.' },
  { id: 'revenue', label: 'Revenue trend', description: 'Value of verified-paid orders in the days you picked. This is not cash in hand.' },
  { id: 'priority', label: 'Priority work', description: 'Each open job with a link to the screen where you fix it.' },
  { id: 'inbox', label: 'Inbox metrics', description: 'Unread conversations and their reply deadlines.' },
  { id: 'pasabuy', label: 'Pasabuy metrics', description: 'Pasabuy requests grouped by how far along they are.' },
  { id: 'stock', label: 'Stock metrics', description: 'What is on the shelf and which batches need attention before they expire.' },
])

// Only non-obvious calculation or source rules warrant a Help control.
// Straightforward views keep their short definitions visible instead.
export const DASHBOARD_WIDGET_HELP = Object.freeze({
  metrics: { read: 'Compare recorded order values and request counts. Saved connection status does not prove a working external feed.', next: 'Use Sales & records to inspect requests, or Manage to review channel readiness.' },
  sales: { read: 'Requests, verified payments and fulfilled orders are different facts. The four reconciliation groups divide requests without double-counting.', next: 'Review matching records before exporting. CSV is an operational extract, not accounting or settlement.' },
  revenue: { read: 'Payment-verified request values are grouped by order creation date in Asia/Manila, not payment receipt date.', next: 'Change the period, then inspect the underlying requests in Sales & records.' },
  priority: { read: 'Rows are sorted by count, not risk. Inventory flags combine SKU and batch issues and can overlap.', next: 'Open the workspace and review the exact record before acting.' },
})
