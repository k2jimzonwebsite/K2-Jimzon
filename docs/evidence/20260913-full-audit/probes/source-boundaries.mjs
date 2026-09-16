import fs from 'node:fs';
const checks = [
  ['src/context/StoreContext.jsx', /Unlisted/],
  ['supabase/migrations/20260902_purchase_time_reservation.sql', /product_status not in/],
  ['supabase/guest_order_conversation_seed_rollback.sql', /CAPTURED_RECOVERY_REQUIRED/],
  ['.github/workflows/ci.yml', /run:/],
  ['tests/confirmation-commitment-contract.spec.js', /readFile|rehearse|stock_committed/],
];
for (const [file, pattern] of checks) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (pattern.test(line)) console.log(`${file}:${i + 1}: ${line.trim()}`);
  });
}
