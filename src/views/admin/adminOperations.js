// Shared interaction registry for the admin shell. Keeping shortcuts and scan
// entry points here prevents the visible help from drifting away from behavior.

export const ADMIN_SHORTCUTS = [
  { id: 'search', keys: ['Ctrl/⌘', 'K'], label: 'Search commands, records, and procedures', group: 'Anywhere' },
  { id: 'scan', keys: ['Alt', 'S'], label: 'Open the scan center', group: 'Anywhere' },
  { id: 'guide', keys: ['Alt', 'G'], label: 'Open the operations guide', group: 'Anywhere' },
  { id: 'alerts', keys: ['Alt', 'A'], label: 'Open alerts and daily tasks', group: 'Anywhere' },
  { id: 'shortcuts', keys: ['?'], label: 'Show keyboard shortcuts', group: 'Anywhere' },
  { id: 'home', keys: ['G', 'H'], label: 'Go to Command center', group: 'Go to' },
  { id: 'inventory', keys: ['G', 'I'], label: 'Go to Inventory', group: 'Go to' },
  { id: 'flights', keys: ['G', 'F'], label: 'Go to Flight Consignments', group: 'Go to' },
  { id: 'fulfillment', keys: ['G', 'O'], label: 'Go to Fulfillment Hub', group: 'Go to' },
  { id: 'pasabuy', keys: ['G', 'P'], label: 'Go to Pasabuy Quotes', group: 'Go to' },
  { id: 'messages', keys: ['G', 'M'], label: 'Go to Messages', group: 'Go to' },
]

export const GO_TO_SHORTCUTS = {
  h: 'overview',
  i: 'inventory',
  f: 'consignment',
  o: 'omni_hub',
  p: 'pasabuy_manager',
  m: 'inbox',
}

export const SCAN_WORKFLOWS = [
  {
    id: 'new_product',
    title: 'New product research',
    description: 'Check the barcode, then create a copy-ready, evidence-first product prompt.',
    destination: 'Inventory → Scan product',
    action: 'scan-product',
    tone: 'blue',
  },
  {
    id: 'pack_order',
    title: 'Pack a customer order',
    description: 'Select or scan the order first, then scan every physical unit against its expected lines.',
    destination: 'Fulfillment Hub',
    section: 'omni_hub',
    tone: 'violet',
  },
  {
    id: 'milan_box',
    title: 'Pack a box in Milan',
    description: 'Choose the flight and box first. Every product scan adds exactly one expected unit.',
    destination: 'Flight Consignments → Milan scan',
    section: 'consignment',
    tone: 'emerald',
  },
  {
    id: 'manila_box',
    title: 'Receive a box in Manila',
    description: 'Choose the arriving box, recount independently, then reconcile shortages or exceptions.',
    destination: 'Flight Consignments → Manila scan',
    section: 'consignment',
    tone: 'amber',
  },
  {
    id: 'inventory_lookup',
    title: 'Look up a product',
    description: 'Open the product master and search by barcode, SKU, product name, or origin.',
    destination: 'Inventory',
    section: 'inventory',
    tone: 'slate',
  },
]

export function isTextEntryTarget(target) {
  if (!target) return false
  const tag = target.tagName?.toLowerCase()
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'
}
