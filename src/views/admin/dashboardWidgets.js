// Presentation destinations only. These never grant access or execute commands.
export const DASHBOARD_WIDGETS = Object.freeze([
  { id: 'metrics', label: 'Shop & channel metrics', description: 'Recorded performance across your selling channels.' },
  { id: 'sales', label: 'Sales & records', description: 'Review payment and fulfillment totals and export their records.' },
  { id: 'revenue', label: 'Revenue trend', description: 'Payment-verified order value over the selected period.' },
  { id: 'priority', label: 'Priority work', description: 'Open the operational workspace for each outstanding task.' },
  { id: 'inbox', label: 'Inbox metrics', description: 'Unread conversations and response deadlines.' },
  { id: 'pasabuy', label: 'Pasabuy metrics', description: 'Custom sourcing requests at each milestone.' },
  { id: 'stock', label: 'Stock metrics', description: 'Catalog availability and batch expiry exceptions.' },
])
