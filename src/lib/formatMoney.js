export const peso = (n) =>
  '₱' + (Number(n) || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })
