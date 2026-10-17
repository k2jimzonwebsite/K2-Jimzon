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
  metrics: { read: 'In plain words: compare saved order totals and request counts across your shops. A saved connection label does not mean a live external feed is active.', next: 'Open Sales & records to check individual orders, or Manage to review channel setup.' },
  sales: { read: 'In plain words: order requests, verified payments, and packed orders are tracked separately. The four groups split every request cleanly without double-counting.', next: 'Check the matching orders below before downloading the CSV list.' },
  revenue: { read: 'In plain words: shows the value of verified-paid orders grouped by when the order was placed in Manila time, not payment receipt date.', next: 'Pick a date range, then check the matching orders in Sales & records.' },
  priority: { read: 'In plain words: lists open tasks by how many items are waiting, not by urgency. Stock alerts combine product and batch warnings and can overlap.', next: 'Tap a row to open that workspace and check the exact record before acting.' },
})

