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
