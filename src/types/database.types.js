/**
 * K2 Jimzon Database Schema & Type Contract
 * Source of truth for database entities, views, RPCs, and Enums.
 * Generated for MAP-000 environment integrity.
 */

/**
 * @typedef {'draft' | 'under_review' | 'live' | 'unlisted' | 'discontinued'} PublicationStatus
 * @typedef {'shopee' | 'tiktok' | 'lazada' | 'website' | 'viber' | 'whatsapp' | 'wholesale' | 'manual'} ChannelType
 * @typedef {'shopee' | 'tiktok' | 'lazada' | 'viber' | 'whatsapp' | 'website'} ChatPlatform
 * @typedef {'Admin' | 'SuperAdmin' | 'Staff' | 'Operations' | 'Warehouse' | 'Support' | 'Finance' | 'Read-Only'} UserRole
 */

export const DATABASE_ENUMS = {
  PublicationStatus: ['draft', 'under_review', 'live', 'unlisted', 'discontinued'],
  ChannelType: ['shopee', 'tiktok', 'lazada', 'website', 'viber', 'whatsapp', 'wholesale', 'manual'],
  ChatPlatform: ['shopee', 'tiktok', 'lazada', 'viber', 'whatsapp', 'website'],
  UserRole: ['Admin', 'SuperAdmin', 'Staff', 'Operations', 'Warehouse', 'Support', 'Finance', 'Read-Only']
}

/**
 * Table Schema Contracts
 */
export const DATABASE_TABLES = {
  products: {
    id: 'uuid',
    sku: 'string (unique)',
    barcode: 'string',
    name: 'string',
    brand: 'string',
    category: 'string',
    price: 'number',
    cost_price: 'number',
    status: 'PublicationStatus',
    primary_image_url: 'string',
    after_image_url: 'string',
    usage_summary: 'string',
    ingredients: 'array',
    created_at: 'timestamp',
    updated_at: 'timestamp'
  },

  product_batches: {
    id: 'uuid',
    product_id: 'uuid -> products.id',
    sku: 'string',
    batch_code: 'string',
    quantity: 'number',
    expiry_date: 'date',
    box_code: 'string',
    hub: 'string',
    custodian: 'string',
    channel: 'ChannelType',
    pin_flag: 'boolean',
    landed_date: 'timestamp',
    created_at: 'timestamp'
  },

  orders: {
    id: 'uuid',
    order_number: 'string',
    channel: 'ChannelType',
    external_reference: 'string',
    customer_name: 'string',
    customer_email: 'string',
    customer_phone: 'string',
    total_amount: 'number',
    currency: 'string',
    status: 'string',
    fulfillment_status: 'string',
    payment_status: 'string',
    created_at: 'timestamp'
  },

  channel_connections: {
    id: 'uuid',
    channel_type: 'ChannelType',
    account_name: 'string',
    is_live: 'boolean',
    last_heartbeat: 'timestamp',
    error_count: 'number',
    created_at: 'timestamp'
  },

  user_profiles: {
    id: 'uuid -> auth.users.id',
    email: 'string',
    full_name: 'string',
    role: 'UserRole',
    mfa_enabled: 'boolean',
    created_at: 'timestamp'
  },

  error_reports: {
    id: 'uuid',
    error_message: 'string',
    stack_trace: 'string',
    component_name: 'string',
    user_id: 'uuid',
    created_at: 'timestamp'
  },

  consignment_manifests: {
    id: 'uuid',
    flight_number: 'string',
    box_code: 'string',
    status: 'string',
    packed_by: 'string',
    received_by: 'string',
    created_at: 'timestamp'
  }
}

/**
 * Database View Definitions
 */
export const DATABASE_VIEWS = [
  'v_product_stock_from_batches',
  'v_expiring_batches',
  'v_stock_by_hub',
  'v_stock_by_custodian',
  'v_stock_by_channel',
  'v_batch_allocations'
]

/**
 * Locked RPC Boundary Specification
 */
export const RPC_PERMISSIONS = {
  public: [
    'get_public_products',
    'validate_coupon',
    'submit_order_request'
  ],
  authenticated_staff: [
    'reserve_lot_fefo',
    'pack_unit_scan',
    'reconcile_batch_lot',
    'transfer_custody_partial',
    'redeem_coupon_atomic'
  ],
  admin_only: [
    'invite_staff_user',
    'update_user_role',
    'hard_delete_product'
  ]
}
