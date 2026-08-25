const SAFE_UI_ERRORS = Object.freeze({
  ADAPTER_PROCESS_FAILED: 'The connector event could not be processed. Review the retry state before continuing.',
  ADMIN_HEALTH_FAILED: 'One or more readiness checks could not be completed. Refresh and verify the affected service.',
  ADMIN_SIGN_IN_FAILED: 'Sign-in could not be completed. Check your details and try again.',
  CATALOG_LOAD_FAILED: 'The product master could not be loaded. Refresh and try again.',
  CATALOG_SAVE_FAILED: 'The product change was not saved. Refresh the record and try again.',
  CATALOG_STATUS_FAILED: 'The product status was not changed. Refresh and try again.',
  CHANNEL_LOAD_FAILED: 'Channel readiness could not be loaded. Refresh before relying on connection status.',
  CSV_IMPORT_FAILED: 'The spreadsheet import was not completed. Review the file and try again.',
  CSV_PARSE_FAILED: 'The spreadsheet could not be read. Check the CSV format and try again.',
  GLOBE_LOAD_FAILED: 'The globe content could not be loaded. Refresh and try again.',
  GLOBE_SAVE_FAILED: 'The globe content change was not saved. Refresh and try again.',
  INVENTORY_LOAD_FAILED: 'Physical lot balances could not be loaded. Refresh before making inventory decisions.',
  INVENTORY_SCAN_FAILED: 'The barcode was not recorded. Keep the item in place and try the same scan again.',
  INVENTORY_VERIFY_FAILED: 'Inventory could not be verified. Refresh and scan again.',
  DELIVERY_SAVE_FAILED: 'The delivery details were not saved. Review the record and try again.',
  FULFILLMENT_ACTION_FAILED: 'The fulfillment change was not recorded. Refresh the order before trying again.',
  OVERVIEW_PARTIAL: 'Some command-center data is unavailable. Refresh before relying on the totals.',
  PASABUY_LOAD_FAILED: 'Pasabuy requests could not be loaded. Refresh and try again.',
  PASABUY_SAVE_FAILED: 'The Pasabuy change was not saved. Refresh the request and try again.',
  PURCHASE_ORDER_LOAD_FAILED: 'Purchase orders could not be loaded. Refresh and try again.',
  PAYMENT_STATE_FAILED: 'The payment evidence state was not changed. Refresh the order and try again.',
  PRODUCT_JSON_INVALID: 'The product JSON could not be accepted. Copy the complete reviewed PRODUCT_JSON response and try again.',
  PRODUCT_SAVE_FAILED: 'The product Draft was not saved. Review the record and try again.',
  RECEIPT_FINALIZE_FAILED: 'The receipt was not finalized and no inventory change was confirmed. Review the counts and try again.',
  SHEET_LOAD_FAILED: 'Product records could not be loaded. Refresh before editing.',
  SHEET_SAVE_FAILED: 'The cell change was not saved and has been reverted. Refresh and try again.',
  SUPPLIER_LOAD_FAILED: 'Suppliers could not be loaded. Refresh and try again.',
  SUPPLIER_SAVE_FAILED: 'The supplier was not saved. Review the fields and try again.',
  STAFF_LOAD_FAILED: 'Staff access records could not be loaded. Refresh before changing permissions.',
  STAFF_ROLE_FAILED: 'The staff role was not changed. Refresh the account and try again.',
  UPLOAD_FAILED: 'The image was not uploaded. Keep the file selected, check its format, and try again.',
})

export function safeUiError(code) {
  const safeCode = Object.hasOwn(SAFE_UI_ERRORS, code) ? code : 'UI_OPERATION_FAILED'
  const message = SAFE_UI_ERRORS[safeCode] || 'The operation could not be completed. Refresh and try again.'
  return `${message} (${safeCode})`
}

// Provider text is used only for fail-closed classification. It is never
// returned to the caller or rendered in browser UI.
export function providerErrorIncludes(error, ...needles) {
  const raw = typeof error?.message === 'string' ? error.message : ''
  return needles.some(needle => raw.includes(needle))
}

export { SAFE_UI_ERRORS }
