/**
 * K2 Jimzon Schema-Truth Engine (MAP-017)
 *
 * Core library for consuming, redacting, inventorying, and comparing Supabase/Postgres
 * schema truth against repository invariants, security policies, grants, and migrations.
 */

export const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
}

// Patterns that must be sanitized from any output or diff
const SENSITIVE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^@\s]+@[^\s]+/gi,
  /sb_secret_[a-zA-Z0-9_\-]+/gi,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/gi,
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
]

/**
 * Sanitize text to remove passwords, connection strings, emails, and tokens.
 */
export function sanitizeSchemaText(input) {
  if (typeof input !== 'string') return input
  let result = input
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

/**
 * Recursively redact any sensitive strings in an object.
 */
export function redactObject(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeSchemaText(obj)
  if (Array.isArray(obj)) return obj.map(redactObject)
  if (typeof obj === 'object') {
    const cleaned = {}
    for (const [key, value] of Object.entries(obj)) {
      if (/password|secret|token|key|credential|jwt/i.test(key) && typeof value === 'string') {
        cleaned[key] = '[REDACTED]'
      } else {
        cleaned[key] = redactObject(value)
      }
    }
    return cleaned
  }
  return obj
}

/**
 * Expected repository schema specification for MAP-017.
 * Defines the canonical baseline of tables, views, grants, RLS, functions, storage, and realtime.
 */
export function buildExpectedRepositorySchema() {
  const customerAccountFunction = {
    owner: 'postgres', securityDefiner: true, searchPathSafe: true,
    searchPathConfig: 'search_path=""', anonCallable: false, authenticatedCallable: true,
    exactExecuteGrants: ['authenticated:EXECUTE'], requiredLiveSignals: ['references_auth_uid'],
    aal2Required: false,
  }
  const signedCustomerAccountFunction = {
    ...customerAccountFunction,
    // Reads consume signed nonces/rate buckets; notification read also marks read_at.
    stateMutation: true, idempotency: 'signed_nonce_replay_refused',
    disposition: 'retain_behind_storefront_bff',
    dependencies: [
      ['k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)','affed1d622083d4a6257c9f6647ef366'],
      ['k2_private.consume_guest_rate(text,text,bytea,integer,integer)','1a6f1e251dea5aee30659c5edb88a521'],
    ].map(([signature,definitionMd5])=>({signature,definitionMd5,owner:'postgres',securityDefiner:true,
      searchPathConfig:'search_path=""',exactExecuteGrants:[]})),
  }
  const staffReader = {
    owner: 'postgres', securityDefiner: true, searchPathSafe: true,
    anonCallable: false, authenticatedCallable: true, aal2Required: true,
    stateMutation: false, requiredLiveSignals: ['references_auth_uid'],
    exactExecuteGrants: ['authenticated:EXECUTE'],
  }
  const staffHelperDependency = {
    signature: 'public.is_staff()', owner: 'postgres', securityDefiner: true,
    definitionMd5: '567f18ba63aaa2dfdbd8df9c31edc440',
  }
  const staffHelperExactDependency={...staffHelperDependency,searchPathConfig:'search_path=public',exactExecuteGrants:['authenticated:EXECUTE']}
  const staffSigningDependencies=[staffHelperExactDependency,
    {signature:'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)',owner:'postgres',securityDefiner:true,
      definitionMd5:'3db63773c8baf8d1fcfb3ca2ab2ed2a8',searchPathConfig:'search_path=""',exactExecuteGrants:[]},
  ]
  const reservationDependencies = [
    staffHelperExactDependency,
    ...[
      ['k2_private.start_category_lot_context_v1(integer)','1b9a366d33fc9668c730b02ebcead715'],
      ['k2_private.current_category_lot_context_v1()','74aea70d24e22b917553f03bd4ddb505'],
      ['k2_private.clear_category_lot_context_v1()','70fb5acf38c2cf776d13847f032aa9c1'],
      ['k2_private.lock_category_policy_v1(boolean)','71ebbbf82bda84882f51888d3a8fc5bc'],
    ].map(([signature,definitionMd5])=>({signature,definitionMd5,owner:'postgres',securityDefiner:true,
      searchPathConfig:'search_path=""',exactExecuteGrants:[]})),
  ]
  const reservationMutation = {
    ...staffReader,stateMutation:true,authorizationGuard:'is_staff',dependencies:reservationDependencies,searchPathConfig:'search_path=""',
    aal2Dependencies:['k2_private.start_category_lot_context_v1(integer)','k2_private.current_category_lot_context_v1()'],
    ownershipScope:'canonical_staff_reservation_operations',idempotency:'not_guaranteed_by_direct_rpc',
    safeFailure:'transaction_atomic_exception',disposition:'retain_until_reviewed_signed_reservation_cutover',
  }
  const staffMutation = {
    securityDefiner: true,
    anonCallable: false,
    searchPathSafe: true,
    authorizationGuard: 'is_staff',
    stateMutation: true,
    ownershipScope: 'canonical_staff_operations',
    aal2Required: false,
    safeFailure: 'transaction_atomic_exception',
    disposition: 'replace_with_admin_bff_command',
  }
  const adminAal2Mutation = {
    securityDefiner: true,
    anonCallable: false,
    searchPathSafe: true,
    authorizationGuard: 'admin_role',
    stateMutation: true,
    ownershipScope: 'admin_security_operation',
    aal2Required: true,
    safeFailure: 'transaction_atomic_exception',
    disposition: 'retain_behind_admin_bff',
  }

  return {
    version: '2026-08-22.map017.meta.v2',
    schemas: ['public', 'storage'],
    tables: {
      brands: { rlsEnabled: true, anonGrants: ['SELECT'], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      categories: { rlsEnabled: true, anonGrants: ['SELECT'], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      warehouses: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      products: { rlsEnabled: true, anonGrants: ['SELECT'], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      product_batches: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      product_drafts: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true, staffScoped: true },
      products_old: { rlsEnabled: true, anonGrants: [], authenticatedGrants: [], noAnonDML: true, legacyIsolated: true },
      channel_credentials: { rlsEnabled: true, anonGrants: [], authenticatedGrants: [], noAnonDML: true, failClosed: true },
      staff_allocations: { rlsEnabled: true, anonGrants: [], authenticatedGrants: [], noAnonDML: true, failClosed: true },
      orders: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE'], noAnonDML: true },
      user_profiles: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'UPDATE'], noAnonDML: true },
      conversations: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE'], noAnonDML: true },
      messages: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT'], noAnonDML: true },
    },
    views: {
      v_channel_catalog_readiness: { securityInvoker: true, anonAccess: false },
      v_expiring_batches: { securityInvoker: true, anonAccess: false },
      products_with_margins: { securityInvoker: true, anonAccess: false },
      v_product_stock_from_batches: { securityInvoker: true, anonAccess: true },
    },
    // Optional authorization surface, like functionAuthorizationContracts below.
    // Presence is enforced by the installed-catalog readiness gate. This audit
    // refuses metadata drift; it does not qualify populated or hosted behavior.
    viewAuthorizationContracts: {
      v_storefront_visible_skus: {
        owner: 'postgres',
        options: ['security_barrier=true', 'security_invoker=false'],
        definitionMd5: 'b0fe2d0d57800904dd82d192f1ebd0d4',
        columns: [{ name: 'sku', type: 'character varying' }],
        clientGrants: ['anon:SELECT', 'authenticated:SELECT'],
      },
    },
    functions: {
      'public.is_staff()': { securityDefiner: true, returns: 'boolean', anonCallable: false, searchPathSafe: true },
      'public.is_admin()': { securityDefiner: true, returns: 'boolean', anonCallable: false, searchPathSafe: true },
      'public.set_user_role(uuid,text)': { securityDefiner: true, anonCallable: false, searchPathSafe: true, authorizationGuard: 'is_admin', aal2Required: true, finalAdminProtected: true },
      'public.process_audit_log()': { securityDefiner: true, anonCallable: false, searchPathSafe: true },
      'public.get_public_product_stock()': { securityDefiner: true, anonCallable: true, searchPathSafe: true },
    },
    // These live RPCs are reviewed authorization surfaces, not permanent schema
    // requirements. Most are transitional direct staff mutations that MAP-019/
    // MAP-020 will replace with Admin BFF commands and may then revoke.
    functionAuthorizationContracts: {
      'public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'c8d44c7db85a7b967e6a97035af8153e',searchPathConfig:'search_path=""',
        authorizationGuard:'is_staff',requiredLiveSignals:['references_auth_uid','references_is_staff','references_aal2'],
        // Exact current source and local serial/atomic scope; PUBLIC trigger stays open.
        dependencies:[
          {"signature":"public.is_staff()","definitionMd5":"567f18ba63aaa2dfdbd8df9c31edc440","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=public","exactExecuteGrants":["authenticated:EXECUTE"]},
          {"signature":"public.generate_k2_sku_internal()","definitionMd5":"891a6f09de32d0b9ec2c5297c14cd28b","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.sync_product_compat_columns()","definitionMd5":"a0ab7247ad756bf63fe01a8810c756ca","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=public","exactExecuteGrants":[]},
          {"signature":"public.sync_product_publication_status()","definitionMd5":"84459ca828cd715f0fd9096c26ffa59a","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":["public:EXECUTE"]},
          {"signature":"k2_private.lock_category_policy_v1(boolean)","definitionMd5":"71ebbbf82bda84882f51888d3a8fc5bc","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.bump_product_catalog_record_version()","definitionMd5":"29a4eea4f3759abd4f6b5ee0ebc77891","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=public, pg_temp","exactExecuteGrants":[]},
          {"signature":"k2_private.verify_admin_bff_request(text, bigint, uuid, uuid, text, text)","definitionMd5":"3db63773c8baf8d1fcfb3ca2ab2ed2a8","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
        ],
        ownershipScope:'current_staff_actor_import_operation_and_row_events',
        idempotency:'actor_action_payload_receipt_serial_retry_qualified',disposition:'retain_behind_admin_bff',
      },

      'public.execute_admin_product_intake_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'1d141d2a1596f5865e1f51335e42e2a5',searchPathConfig:'search_path=""',
        requiredLiveSignals:['references_auth_uid','references_is_admin'],
        // Ownership permits Staff's own intake; Admin-only reconciliation stays distinct.
        // Observed PUBLIC trigger dependencies retain their independent critical findings.
        dependencies:[
          {"signature":"public.create_product_first_inventory_server(uuid, uuid, text, jsonb)","definitionMd5":"293fa18dd24fb02e54e2215c2fb45659","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.reconcile_product_batches(text, jsonb, text)","definitionMd5":"985e6a0dd92a0765376c9769dea6b0b6","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=public","exactExecuteGrants":[]},
          {"signature":"k2_private.verify_admin_bff_request(text, bigint, uuid, uuid, text, text)","definitionMd5":"3db63773c8baf8d1fcfb3ca2ab2ed2a8","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.is_staff()","definitionMd5":"567f18ba63aaa2dfdbd8df9c31edc440","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=public","exactExecuteGrants":["authenticated:EXECUTE"]},
          {"signature":"public.is_admin()","definitionMd5":"56650c71db4ecc0a5f1d2972f90f4621","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=public","exactExecuteGrants":["authenticated:EXECUTE"]},
          {"signature":"k2_private.lock_category_policy_v1(boolean)","definitionMd5":"71ebbbf82bda84882f51888d3a8fc5bc","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"k2_private.start_category_lot_context_v1(integer)","definitionMd5":"1b9a366d33fc9668c730b02ebcead715","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"k2_private.current_category_lot_context_v1()","definitionMd5":"74aea70d24e22b917553f03bd4ddb505","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"k2_private.clear_category_lot_context_v1()","definitionMd5":"70fb5acf38c2cf776d13847f032aa9c1","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"k2_private.effective_category_minimum_v1(uuid, integer)","definitionMd5":"26ce6255f014a870f8a358f3de2638a8","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"k2_private.lot_is_eligible_for_category_v1(product_batches, integer, timestamp with time zone)","definitionMd5":"fc25c1c47a1eae3d055d6a1305546a1b","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.sync_product_batch_compat_columns()","definitionMd5":"eb58f63d32d6dffbebc6c2021feba7a0","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.sync_product_compat_columns()","definitionMd5":"a0ab7247ad756bf63fe01a8810c756ca","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=public","exactExecuteGrants":[]},
          {"signature":"public.sync_product_publication_status()","definitionMd5":"84459ca828cd715f0fd9096c26ffa59a","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":["public:EXECUTE"]},
          {"signature":"public.touch_product_intake_session()","definitionMd5":"c41ca093a8b48923cc4a3aae52306eeb","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":["public:EXECUTE"]},
          {"signature":"public.bump_product_catalog_record_version()","definitionMd5":"29a4eea4f3759abd4f6b5ee0ebc77891","owner":"postgres","securityDefiner":false,"searchPathConfig":"search_path=public, pg_temp","exactExecuteGrants":[]},
          {"signature":"k2_private.guard_category_context_clear_v1()","definitionMd5":"8c94278b93fc6a0419ae5a6ae1852cd4","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.add_consignment_item_v2(uuid, text, text, text, date, integer)","definitionMd5":"5345fe455c46cc0883cdd8484354e14f","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=public","exactExecuteGrants":[]},
          {"signature":"public.transition_product_publication_server(uuid, text)","definitionMd5":"4baa42c09f80621d8762959ee282db2a","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.create_product_draft_server(uuid, uuid, jsonb, jsonb)","definitionMd5":"85ae776e5b1e1a2a2646b1ba1a86ac70","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"public.generate_k2_sku_internal()","definitionMd5":"891a6f09de32d0b9ec2c5297c14cd28b","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
          {"signature":"k2_private.assert_imported_draft_target_v1(uuid, bigint)","definitionMd5":"27191dde9eb7a650d5b3c70abfff816a","owner":"postgres","securityDefiner":true,"searchPathConfig":"search_path=\"\"","exactExecuteGrants":[]},
        ],
        aal2Dependencies:['k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'],
        ownershipScope:'staff_owned_or_admin_intake_admin_reconciliation_staff_owned_publication',
        idempotency:'actor_action_payload_receipt_serial_retry_qualified',disposition:'retain_behind_admin_bff',
      },
      'public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'482c054570091631e9950423a13d4788',searchPathConfig:'search_path=""',
        authorizationGuard:'is_admin',requiredLiveSignals:['references_auth_uid','references_is_admin','references_aal2'],
        dependencies:[...staffSigningDependencies,
          {signature:'public.is_admin()',owner:'postgres',securityDefiner:true,
            definitionMd5:'56650c71db4ecc0a5f1d2972f90f4621',searchPathConfig:'search_path=public',exactExecuteGrants:['authenticated:EXECUTE']},
          ...[
            ['public.delete_products_with_pin_v2(text[],text,text,uuid)','8f9dc4a52f0111ceff5f99cf48475715'],
            ['k2_private.execute_category_policy_payload_v1(text,jsonb)','3a84360fc370c288c6c23f6912377898'],
            ['k2_private.mutate_category_policy_v1(uuid,text,integer,bigint,text,integer)','c8383112e02776908d90da06025d2f2d'],
            ['k2_private.effective_category_minimum_v1(uuid,integer)','26ce6255f014a870f8a358f3de2638a8'],
            ['k2_private.lock_category_policy_v1(boolean)','71ebbbf82bda84882f51888d3a8fc5bc'],
          ].map(([signature,definitionMd5])=>({signature,definitionMd5,owner:'postgres',securityDefiner:true,
            searchPathConfig:'search_path=""',exactExecuteGrants:[]})),
          ...[
            ['public.sync_product_compat_columns()','a0ab7247ad756bf63fe01a8810c756ca','search_path=public',[]],
            // Observed dependency only: its separate PUBLIC trigger finding remains open.
            ['public.sync_product_publication_status()','84459ca828cd715f0fd9096c26ffa59a','search_path=""',['public:EXECUTE']],
            ['public.bump_product_catalog_record_version()','29a4eea4f3759abd4f6b5ee0ebc77891','search_path=public, pg_temp',[]],
          ].map(([signature,definitionMd5,searchPathConfig,exactExecuteGrants])=>({signature,definitionMd5,owner:'postgres',
            securityDefiner:false,searchPathConfig,exactExecuteGrants})),
        ],
        ownershipScope:'admin_superadmin_canonical_master_category_policy_literal_admin_pin_deletion',
        idempotency:'actor_action_payload_receipt_serial_retry_qualified',disposition:'retain_behind_admin_bff',
      },
      'public.execute_admin_wholesale_inquiry_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'0957e21f4f0658dcfa8e1f23032652c9',searchPathConfig:'search_path=""',
        dependencies:staffSigningDependencies,
        aal2Dependencies:['k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'],
        ownershipScope:'signed_staff_inquiry_status_only_admin_superadmin_bff_signing',
        idempotency:'actor_action_payload_receipt_serial_retry_qualified',disposition:'retain_behind_admin_bff',
      },
      'public.execute_admin_ai_spend_controls_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'a74380ea8da4138b5a781c4e44201531',searchPathConfig:'search_path=""',
        requiredLiveSignals:['references_auth_uid','references_aal2'],dependencies:staffSigningDependencies,
        aal2Dependencies:['k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'],
        ownershipScope:'superadmin_versioned_confirmed_ai_limits_without_provider_invocation',
        idempotency:'actor_action_payload_receipt_serial_retry_qualified',disposition:'retain_behind_admin_bff',
      },
      'public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'f8eb2b3a2e95817da2031cb17bcd3b50',searchPathConfig:'search_path=""',
        dependencies:[staffHelperExactDependency,
          {signature:'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)',owner:'postgres',securityDefiner:true,
            definitionMd5:'3db63773c8baf8d1fcfb3ca2ab2ed2a8',searchPathConfig:'search_path=""',exactExecuteGrants:[]},
        ],
        aal2Dependencies:['k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'],
        ownershipScope:'current_staff_uid_sessions_provider_checks_on_register_validate_list',
        idempotency:'serial_revocation_receipt_registration_audit_repeats',disposition:'retain_behind_admin_bff',
      },
      'public.execute_admin_channel_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...staffReader,stateMutation:true,definitionMd5:'3a0619c2e1efae619525141e906e17a6',
        searchPathConfig:'search_path=""',authorizationGuard:'is_admin',
        requiredLiveSignals:['references_auth_uid','references_aal2'],
        dependencies:[staffHelperExactDependency,
          {signature:'public.is_admin()',owner:'postgres',securityDefiner:true,
            definitionMd5:'56650c71db4ecc0a5f1d2972f90f4621',searchPathConfig:'search_path=public',exactExecuteGrants:['authenticated:EXECUTE']},
          {signature:'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)',owner:'postgres',securityDefiner:true,
            definitionMd5:'3db63773c8baf8d1fcfb3ca2ab2ed2a8',searchPathConfig:'search_path=""',exactExecuteGrants:[]},
        ],
        aal2Dependencies:['k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'],
        ownershipScope:'admin_superadmin_existing_website_or_pasabuy_reference_verification',
        idempotency:'actor_action_payload_receipt_serial_retry_qualified',disposition:'retain_behind_admin_bff',
      },
      'public.save_customer_account_settings_v1(bigint,uuid,text,text,text)': {
        ...signedCustomerAccountFunction,definitionMd5:'e4e2081fe8fa1dfde461a6efff4e9e5a',
        ownershipScope:'current_uid_settings_save_without_client_selected_user',
      },
      'public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)': {
        ...signedCustomerAccountFunction,definitionMd5:'f6ac88fa4880ab4dc0d8b111ac2305c2',
        ownershipScope:'verified_auth_contact_matches_guest_grant_customer_before_link',
        idempotency:'actor_and_payload_claim_receipt_serial_retry_qualified',
      },
      'public.append_customer_account_message_v1(bigint,uuid,text,text,text)': {
        ...signedCustomerAccountFunction,definitionMd5:'e8410c3a530d1121710e00551745507e',
        ownershipScope:'active_link_customer_conversation_reply',
        idempotency:'actor_and_conversation_message_key_serial_retry_qualified',
      },
      'public.customer_record_owned_by_current_user(uuid)': {
        ...customerAccountFunction,definitionMd5:'ce5c912ccd24bc2db8b2823cc6fa4a33',stateMutation:false,
        ownershipScope:'current_uid_active_customer_account_link',disposition:'retain_scoped_ownership_helper',
      },
      'public.list_customer_account_history_v1(bigint,uuid,text,text,text)': {
        ...signedCustomerAccountFunction,definitionMd5:'dc5058cc5a754a08a688e89502d48764',
        requiredLiveSignals:['references_auth_uid','filters_internal_messages'],
        ownershipScope:'active_link_customer_history_without_internal_staff_notes',
      },
      'public.read_customer_account_settings_v1(bigint,uuid,text,text,text)': {
        ...signedCustomerAccountFunction,definitionMd5:'6d04a8c318596b4d7cd95225b09be64f',
        ownershipScope:'current_uid_settings_and_latest_30_notification_projection',
      },
      'public.read_customer_account_notification_v1(bigint,uuid,text,text,text)': {
        ...signedCustomerAccountFunction,definitionMd5:'ec1b8dc6335a568b4bbaa6ce542464c4',
        ownershipScope:'current_uid_notification_mark_read_preserving_existing_time',
      },
      'public.read_admin_catalog_import_status_v1(uuid)': {
        ...staffReader,definitionMd5:'87bb7dfe2c546f46f2930567eb5e2f42',searchPathConfig:'search_path=""',
        authorizationGuard:'is_staff',dependencies:[staffHelperExactDependency],
        ownershipScope:'current_actor_catalog_import_operation_and_events',disposition:'retain_behind_admin_bff',
      },
      'public.read_admin_product_media_orphans_v1(integer)': {
        ...staffReader,definitionMd5:'51124d7e7e59eabf06f61edb1f421417',searchPathConfig:'search_path=""',
        authorizationGuard:'is_admin',requiredLiveSignals:[],
        dependencies:[{signature:'public.is_admin()',owner:'postgres',securityDefiner:true,
          definitionMd5:'56650c71db4ecc0a5f1d2972f90f4621',searchPathConfig:'search_path=public',exactExecuteGrants:['authenticated:EXECUTE']}],
        ownershipScope:'admin_confirmed_upload_aged_unreferenced_media_candidates',disposition:'retain_behind_admin_bff',
      },
      'public.read_staff_express_delivery_v1(uuid)': {
        ...staffReader,definitionMd5:'97aced1c37357cd529d38ddddd8827f9',searchPathConfig:'search_path=""',
        dependencies:[{signature:'k2_private.project_express_quote_v1(uuid)',owner:'postgres',securityDefiner:true,
          definitionMd5:'65c0d84bc9b52cfb8b473285e6cf4a44',searchPathConfig:'search_path=""',exactExecuteGrants:[]}],
        ownershipScope:'admin_staff_canonical_website_express_order_projection',disposition:'retain_behind_admin_bff',
      },
      'public.read_admin_ai_spend_controls_v1()': {
        ...staffReader,definitionMd5:'e57ce6663819fbc39d56596f08c072d4',searchPathConfig:'search_path=""',
        ownershipScope:'admin_superadmin_ai_spend_configuration_projection',disposition:'retain_behind_admin_bff',
      },
      'public.read_admin_channel_readiness_v1()': {
        ...staffReader,definitionMd5:'c7cda4c4aa18b11f83a2df9f1d4c5882',searchPathConfig:'search_path=""',
        authorizationGuard:'is_staff',requiredLiveSignals:[],dependencies:[staffHelperExactDependency],
        ownershipScope:'staff_channel_counts_without_connector_secrets',disposition:'retain_behind_admin_bff',
      },
      'public.list_admin_wholesale_inquiries_v1()': {
        ...staffReader,definitionMd5:'dcaa9516948c0f65a1bdab1120714a17',searchPathConfig:'search_path=""',
        authorizationGuard:'is_staff',dependencies:[staffHelperExactDependency],
        ownershipScope:'staff_latest_200_wholesale_contacts',disposition:'retain_behind_admin_bff',
      },
      'public.extend_reservation_v1(uuid,integer,text)': {
        ...reservationMutation,definitionMd5:'ef6f6e7a139e0b39f7e65d053c838962',
      },
      'public.release_expired_reservations_v1(integer)': {
        ...reservationMutation,definitionMd5:'60356edaabb79966e4098cafd2c4b8ea',
      },
      'public.read_admin_product_stock_v1(text[])': {
        ...staffReader, authorizationGuard: 'is_staff',
        definitionMd5: '14da2b50760f942a3b554899410bed5d', dependency: staffHelperDependency,
        ownershipScope: 'canonical_staff_eligible_stock', disposition: 'retain_behind_admin_bff',
      },
      'public.read_admin_lot_snapshot_v1(text)': {
        ...staffReader, authorizationGuard: 'is_staff',
        definitionMd5: '94fc2851e10fe8e5b1e4ce8983bdd47f', dependency: staffHelperDependency,
        ownershipScope: 'canonical_staff_lot_snapshot', disposition: 'retain_behind_admin_bff',
      },
      'public.read_customer_delivery_rates_v1()': {
        ...staffReader, definitionMd5: '0610b1dc22afa3a3c2d4984f24027eef',
        ownershipScope: 'admin_staff_customer_tariff_versions', disposition: 'retain_behind_admin_bff',
      },
      'public.list_order_payment_receipts_v1(uuid)': {
        securityDefiner: true, anonCallable: false, searchPathSafe: true,
        authorizationGuard: 'is_staff', aal2Required: true,
        stateMutation: false, ownershipScope: 'payment_receipt_review',
        idempotency: 'read_only', safeFailure: 'explicit_exception',
        disposition: 'retain_until_admin_bff_cutover',
      },
      'public.get_order_payment_receipt_v1(uuid)': {
        securityDefiner: true, anonCallable: false, searchPathSafe: true,
        authorizationGuard: 'is_staff', aal2Required: true,
        stateMutation: false, ownershipScope: 'payment_receipt_review',
        idempotency: 'read_only', safeFailure: 'explicit_exception',
        disposition: 'retain_until_admin_bff_cutover',
      },
      'public.read_admin_globe_cms_v1()': {
        securityDefiner: true, anonCallable: false, searchPathSafe: true,
        authorizationGuard: 'is_admin', aal2Required: true,
        stateMutation: false, ownershipScope: 'admin_globe_cms',
        idempotency: 'read_only', safeFailure: 'explicit_exception',
        disposition: 'retain_behind_admin_bff',
      },
      'public.execute_admin_globe_review_command_v1(text,bigint,uuid,uuid,text,text)': {
        ...adminAal2Mutation, authorizationGuard: 'is_admin',
        ownershipScope: 'admin_globe_cms', idempotency: 'request_id_and_payload_hash',
        disposition: 'retain_behind_admin_bff',
      },
      'public.execute_admin_globe_review_direct_v1(text,uuid,text)': {
        ...adminAal2Mutation, authorizationGuard: 'is_admin',
        ownershipScope: 'admin_globe_cms', idempotency: 'request_id_and_payload_hash',
        disposition: 'revoke_after_admin_bff_cutover',
      },
      'public.website_reply_capability_v1()': {
        securityDefiner: true, anonCallable: false, searchPathSafe: true,
        authorizationGuard: 'is_staff', aal2Required: false,
        stateMutation: false, ownershipScope: 'website_staff_reply',
        idempotency: 'read_only', safeFailure: 'false_result',
        disposition: 'retain_until_admin_bff_cutover',
      },
      'public.append_website_customer_reply_v1(uuid,text)': {
        ...staffMutation, ownershipScope: 'website_staff_reply',
        idempotency: 'not_guaranteed_by_direct_rpc',
        disposition: 'revoke_after_admin_bff_cutover',
      },
      'public.has_delete_pin()': {
        securityDefiner: true, returns: 'boolean', anonCallable: false, searchPathSafe: true,
        authorizationGuard: 'admin_role', stateMutation: false,
        ownershipScope: 'admin_security_operation', aal2Required: true,
        idempotency: 'read_only', safeFailure: 'explicit_exception',
        disposition: 'retain_behind_admin_bff',
      },
      'public.set_delete_pin(text)': {
        ...adminAal2Mutation,
        idempotency: 'repeat_safe_but_audited',
      },
      'public.delete_products_with_pin_v2(text[],text,text,uuid)': {
        ...adminAal2Mutation,
        idempotency: 'request_id_and_payload_hash',
      },
      'public.add_consignment_item_v2(uuid,text,text,text,date,integer)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.advance_consignment(uuid,text)': { ...staffMutation, idempotency: 'state_transition_guarded' },
      'public.create_consignment_manifest(text,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.finalize_consignment_receipt(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.record_consignment_item_scan(uuid,uuid,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.append_internal_message(uuid,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.mark_conversation_read(uuid)': { ...staffMutation, idempotency: 'state_assignment_replay_safe' },
      'public.update_conversation_workflow(uuid,text,text,uuid,timestampwithtimezone,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.cancel_order_request(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.confirm_order_request(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.fulfill_order_request(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.record_packing_scan(uuid,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.set_order_delivery_details(uuid,numeric,text,text,text,boolean,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.set_order_request_payment_status(uuid,text,text)': { ...staffMutation, idempotency: 'state_transition_guarded' },
      'public.reconcile_product_batches(text,jsonb,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.set_batch_clearance_approval(uuid,boolean,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.transfer_inventory_custody(text,text,text,text)': { ...staffMutation, idempotency: 'required_at_bff', disposition: 'revoke_after_exact_lot_cutover' },
      'public.transfer_inventory_custody_exact(uuid,integer,text,text,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.save_pasabuy_quote(uuid,numeric,numeric,text,timestampwithtimezone,numeric,text,numeric,numeric,numeric,numeric,numeric,timestampwithtimezone)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.transition_pasabuy_request(uuid,text,text)': { ...staffMutation, idempotency: 'state_transition_guarded' },
      'public.verify_internal_channel_event(text,text,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      // These are intentional direct guest capabilities with explicit, reviewed
      // scope. Their live boolean signals are exported without function bodies.
      'public.get_storefront_chat_v1(uuid)': {
        securityDefiner: true, anonCallable: true, authenticatedCallable: true, searchPathSafe: true,
        stateMutation: false, ownershipScope: 'server_generated_conversation_uuid',
        requiredLiveSignals: [
          'references_conversation_id_scope', 'conversation_id_uses_random_default',
          'filters_internal_messages',
        ],
        idempotency: 'read_only', safeFailure: 'not_found_result',
        disposition: 'replace_at_signed_guest_chat_cutover',
      },
      'public.get_order_conversation_v1(uuid,text)': {
        securityDefiner: true, anonCallable: true, authenticatedCallable: true, searchPathSafe: true,
        stateMutation: false, ownershipScope: 'order_id_and_checkout_key',
        requiredLiveSignals: [
          'references_order_key_scope', 'references_order_key_length_guard',
          'filters_internal_messages',
        ],
        idempotency: 'read_only', safeFailure: 'explicit_result',
        disposition: 'replace_at_signed_guest_order_cutover',
      },
      'public.submit_order_message_v1(uuid,text,text,uuid)': {
        securityDefiner: true, anonCallable: true, authenticatedCallable: true, searchPathSafe: true,
        stateMutation: true, ownershipScope: 'order_id_and_checkout_key',
        requiredLiveSignals: [
          'references_order_key_scope', 'references_order_key_length_guard',
          'references_request_key_replay_guard',
        ],
        idempotency: 'request_uuid', safeFailure: 'explicit_result',
        disposition: 'replace_at_signed_guest_order_cutover',
      },
      'public.submit_order_payment_receipt_v1(uuid,text,text,text,text,uuid)': {
        securityDefiner: true, anonCallable: true, authenticatedCallable: true, searchPathSafe: true,
        stateMutation: true, ownershipScope: 'order_id_and_checkout_key',
        requiredLiveSignals: [
          'references_order_key_scope', 'references_order_key_length_guard',
          'references_payment_receipt_request_key', 'writes_private_payment_receipt',
          'returns_no_payment_receipt_bytes',
        ],
        idempotency: 'request_uuid_and_content_hash', safeFailure: 'explicit_result',
        disposition: 'replace_at_signed_guest_order_cutover',
      },
      'public.get_order_payment_receipt_v1(uuid)': {
        securityDefiner: true, anonCallable: false, authenticatedCallable: true, searchPathSafe: true,
        authorizationGuard: 'is_staff', aal2Required: true, stateMutation: false,
        ownershipScope: 'order_payment_receipt', idempotency: 'read_only',
        requiredLiveSignals: ['references_auth_uid'],
        safeFailure: 'explicit_exception', disposition: 'retain_for_aal2_staff_receipt_review',
      },
      'public.list_order_payment_receipts_v1(uuid)': {
        securityDefiner: true, anonCallable: false, authenticatedCallable: true, searchPathSafe: true,
        authorizationGuard: 'is_staff', aal2Required: true, stateMutation: false,
        ownershipScope: 'order_payment_receipt', idempotency: 'read_only',
        requiredLiveSignals: ['references_auth_uid'],
        safeFailure: 'explicit_exception', disposition: 'retain_for_aal2_staff_receipt_review',
      },
    },
    deprecatedFunctionsRevoked: [
      'decrement_stock',
      'deduct_stock_fefo',
      'replace_product_batches',
      'mark_order_line_packed',
      'add_consignment_item',
      'record_consignment_scan',
    ],
    storage: {
      'product-images': {
        publicRead: true,
        noPublicUpload: true,
        noPublicUpdate: true,
        noPublicDelete: true,
        maxFileSize: 10485760, // 10 MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      },
    },
    realtime: {
      excludedTables: ['products_old'],
      staffScopedTables: ['product_drafts'],
    },
    expectedMigrations: [
      '20260809_operations_hardening',
      '20260810_security_boundary_hardening',
      '20260810_deprecated_rpc_lockdown',
      '20260812_map017_public_write_boundary_hardening',
    ],
  }
}

/**
 * Parses and validates an external schema export document.
 * Fails closed if the input is malformed, missing required keys, or contains unsafe structures.
 */
export function parseSchemaExport(rawInput) {
  if (!rawInput) {
    throw new Error('SCHEMA_EXPORT_EMPTY: Supplied schema export input is empty or null.')
  }

  let parsed
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput)
    } catch (err) {
      throw new Error(`SCHEMA_EXPORT_INVALID_JSON: Failed to parse schema export JSON: ${err.message}`)
    }
  } else if (typeof rawInput === 'object') {
    parsed = rawInput
  } else {
    throw new Error('SCHEMA_EXPORT_TYPE_ERROR: Schema export must be a JSON string or parsed object.')
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
    throw new Error('SCHEMA_EXPORT_FORMAT_ERROR: Root of schema export must be an object.')
  }

  const requiredSections = [
    'schemas',
    'tables',
    'columns',
    'constraints',
    'indexes',
    'sequences',
    'triggers',
    'views',
    'materialized_views',
    'functions',
    'policies',
    'grants',
    'schema_grants',
    'default_privileges',
    'storage',
    'realtime',
    'migrations',
  ]
  const missingSections = requiredSections.filter((section) => !(section in parsed))

  if (missingSections.length > 0) {
    throw new Error(`SCHEMA_EXPORT_INCOMPLETE: Missing required sections: ${missingSections.join(', ')}`)
  }

  return redactObject(parsed)
}

/**
 * Normalize policies list from either array or object schema representation.
 */
function normalizePolicies(policiesData) {
  if (Array.isArray(policiesData)) {
    return policiesData
  }
  if (typeof policiesData === 'object' && policiesData !== null) {
    const list = []
    for (const [tableName, tablePolicies] of Object.entries(policiesData)) {
      if (Array.isArray(tablePolicies)) {
        for (const p of tablePolicies) {
          list.push({ table_name: tableName, ...p })
        }
      }
    }
    return list
  }
  return []
}

/**
 * Normalize grants list from either array or object schema representation.
 */
function normalizeGrants(grantsData) {
  if (Array.isArray(grantsData)) {
    return grantsData
  }
  if (typeof grantsData === 'object' && grantsData !== null) {
    const list = []
    for (const [tableName, tableGrants] of Object.entries(grantsData)) {
      if (Array.isArray(tableGrants)) {
        for (const g of tableGrants) {
          list.push({ table_name: tableName, ...g })
        }
      }
    }
    return list
  }
  return []
}

function matchesPublicRelation(record, relationName) {
  const schema = String(record.schema_name || record.table_schema || '').toLowerCase()
  if (schema && schema !== 'public') return false
  const target = record.table_name || record.view_name || ''
  return target === relationName || target === `public.${relationName}`
}

/**
 * Reads a boolean that may arrive in either shape. Fabricated fixtures use
 * camelCase; the live `export-schema-metadata.sql` inventory uses the
 * snake_case spelling of the underlying pg_catalog column. Reading only one
 * spelling silently yields undefined for the other source, which reports every
 * table as RLS-disabled and every view as missing security_invoker.
 */
function readFlag(source, camelKey, snakeKey) {
  if (!source || typeof source !== 'object') return undefined
  return source[camelKey] ?? source[snakeKey]
}

function normalizedSignature(signature) {
  return String(signature || '').replaceAll(' ', '').toLowerCase()
}

function functionDetails(liveFunctions, expectedSignature) {
  const expected = normalizedSignature(expectedSignature)
  return Object.entries(liveFunctions).find(([signature]) => normalizedSignature(signature) === expected)
}

/**
 * A SECURITY DEFINER function is safe when its search_path cannot be shadowed by
 * an untrusted role. This rejects `$user`, which resolves to a caller-controlled
 * schema.
 *
 * It deliberately does NOT reject `pg_temp`: naming pg_temp explicitly and last
 * is the PostgreSQL-documented hardening, because pg_temp is searched first when
 * it is not named at all. `public.process_audit_log()` uses that form correctly.
 *
 * It also accepts a plain `search_path=public`. That rests on one verifiable
 * assumption: no untrusted role may CREATE in `public`. Measured on the live
 * database 22 August 2026 — only `pg_database_owner` holds CREATE on `public`,
 * so `anon` and `authenticated` cannot plant shadowing objects. If that grant
 * ever changes, every `search_path=public` function becomes shadowable and this
 * check must tighten to require `search_path=""`.
 */
function hasSafeFixedSearchPath(details) {
  const configured = details.searchPath ?? details.search_path_config
  if (typeof configured !== 'string' || configured.trim() === '') return false
  const normalized = configured.trim().replace(/^search_path\s*=\s*/i, '')
  return !/\$user/i.test(normalized)
}

const WRITE_PRIVILEGES = new Set([
  'ALL', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN',
])

function collectionEntries(collection) {
  if (Array.isArray(collection)) return collection.map((value, index) => [String(index), value])
  if (collection && typeof collection === 'object') return Object.entries(collection)
  return []
}

function recordSchema(key, details) {
  const explicit = details?.schema_name || details?.table_schema
  if (explicit) return String(explicit).toLowerCase()
  return String(key).includes('.') ? String(key).split('.', 1)[0].toLowerCase() : 'public'
}

function recordName(key, details, fields) {
  for (const field of fields) if (details?.[field]) return String(details[field])
  const value = String(key)
  return value.includes('.') ? value.slice(value.indexOf('.') + 1) : value
}

/**
 * Exhaustively audits every relation and function currently present in the
 * exposed `public` schema. The canonical expected schema still asserts exact
 * contracts for reviewed objects; this pass prevents an unlisted object from
 * escaping simply because it was absent from that hand-maintained subset.
 */
export function auditExposedAuthorization(liveExport, expectedSchema = buildExpectedRepositorySchema()) {
  const issues = []
  const liveGrants = normalizeGrants(liveExport.grants)
  const livePolicies = normalizePolicies(liveExport.policies)
  const reviewedTables = new Set(Object.keys(expectedSchema.tables).map((name) => name.replace(/^public\./, '')))
  const reviewedViews = new Set([
    ...Object.keys(expectedSchema.views), ...Object.keys(expectedSchema.viewAuthorizationContracts || {}),
  ].map((name) => name.replace(/^public\./, '')))
  const reviewedFunctions = new Map([
    ...Object.entries(expectedSchema.functions || {}),
    ...Object.entries(expectedSchema.functionAuthorizationContracts || {}),
  ].map(([signature, contract]) => [normalizedSignature(signature), contract]))

  const publicTables = collectionEntries(liveExport.tables).filter(([key, details]) => recordSchema(key, details) === 'public')
  const publicViews = collectionEntries(liveExport.views).filter(([key, details]) => recordSchema(key, details) === 'public')
  const publicFunctions = collectionEntries(liveExport.functions).filter(([key, details]) => recordSchema(key, details) === 'public')

  for (const [key, table] of publicTables) {
    const tableName = recordName(key, table, ['table_name'])
    if (!reviewedTables.has(tableName) && !readFlag(table, 'rlsEnabled', 'rls_enabled')) {
      issues.push({
        type: 'EXPOSED_TABLE_RLS_DISABLED', severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Unlisted exposed table public.${tableName} has Row Level Security disabled.`,
      })
    }

    if (!reviewedTables.has(tableName)) {
      const anonymousWrites = liveGrants.filter((grant) =>
        matchesPublicRelation(grant, tableName)
        && ['anon', 'public'].includes(String(grant.grantee || '').toLowerCase())
        && WRITE_PRIVILEGES.has(String(grant.privilege || '').toUpperCase()),
      ).map((grant) => String(grant.privilege).toUpperCase())
      if (anonymousWrites.length > 0) {
        issues.push({
          type: 'ANON_DML_GRANTED', severity: SEVERITY.CRITICAL,
          target: `public.${tableName}`,
          message: `Direct anonymous write-capable privileges granted on unlisted public.${tableName}: ${[...new Set(anonymousWrites)].join(', ')}.`,
        })
      }
    }
  }

  for (const policy of livePolicies.filter((item) => String(item.schema_name || 'public').toLowerCase() === 'public')) {
    const tableName = String(policy.table_name || '')
    if (reviewedTables.has(tableName)) continue
    const roles = (policy.roles || []).map((role) => String(role).toLowerCase())
    const command = String(policy.command || '').toUpperCase()
    const usingExpr = String(policy.using_expression || policy.using || '').trim().toLowerCase()
    const checkExpr = String(policy.with_check_expression || policy.withCheck || '').trim().toLowerCase()
    const blanketWrite = WRITE_PRIVILEGES.has(command) && (usingExpr === 'true' || checkExpr === 'true')
    if (blanketWrite && roles.some((role) => ['public', 'anon'].includes(role))) {
      issues.push({
        type: 'BLANKET_PUBLIC_WRITE_POLICY', severity: SEVERITY.CRITICAL,
        target: `public.${tableName}.${policy.policy_name || policy.name || 'unnamed'}`,
        message: `Unlisted exposed relation public.${tableName} has a blanket anonymous/public write policy.`,
      })
    } else if (blanketWrite && roles.includes('authenticated')) {
      issues.push({
        type: 'BLANKET_AUTHENTICATED_WRITE_POLICY', severity: SEVERITY.CRITICAL,
        target: `public.${tableName}.${policy.policy_name || policy.name || 'unnamed'}`,
        message: `Unlisted exposed relation public.${tableName} allows every authenticated identity to write.`,
      })
    }
  }

  for (const [key, view] of publicViews) {
    const viewName = recordName(key, view, ['view_name'])
    const grants = liveGrants.filter((grant) => matchesPublicRelation(grant, viewName))
    const contract = expectedSchema.viewAuthorizationContracts?.[viewName]
    if (contract) {
      const options = String(view.options || '').split(',').filter(Boolean).sort()
      const clientGrantRows = grants.filter(grant =>
        ['public', 'anon', 'authenticated'].includes(String(grant.grantee || '').toLowerCase()),
      )
      const clientGrants = clientGrantRows.map(grant => `${String(grant.grantee).toLowerCase()}:${String(grant.privilege).toUpperCase()}`).sort()
      if (view.owner !== contract.owner || view.security_invoker !== false
        || JSON.stringify(options) !== JSON.stringify(contract.options)
        || view.definition_md5 !== contract.definitionMd5
        || JSON.stringify(view.projected_columns) !== JSON.stringify(contract.columns)
        || clientGrantRows.some(grant => grant.is_grantable !== false)
        || JSON.stringify(clientGrants) !== JSON.stringify(contract.clientGrants)) {
        issues.push({
          type: 'PUBLIC_VIEW_CONTRACT_DRIFT', severity: SEVERITY.HIGH,
          target: `public.${viewName}`,
          message: `Public view public.${viewName} lacks the exact reviewed definition, owner, options, projection or client grants.`,
        })
      }
    }
    const clientWrites = grants.filter((grant) =>
      ['public', 'anon', 'authenticated'].includes(String(grant.grantee || '').toLowerCase())
      && WRITE_PRIVILEGES.has(String(grant.privilege || '').toUpperCase()),
    )
    if (clientWrites.length > 0) {
      issues.push({
        type: 'VIEW_CLIENT_DML_GRANTED', severity: SEVERITY.CRITICAL,
        target: `public.${viewName}`,
        message: `Client roles hold write-capable privileges on view public.${viewName}: ${clientWrites.map((g) => `${g.grantee}:${g.privilege}`).join(', ')}.`,
      })
    }
    if (!reviewedViews.has(viewName)) {
      if (!readFlag(view, 'securityInvoker', 'security_invoker')) {
        issues.push({
          type: 'SECURITY_INVOKER_MISSING', severity: SEVERITY.HIGH,
          target: `public.${viewName}`,
          message: `Unlisted exposed view public.${viewName} does not enforce security_invoker = true.`,
        })
      }
      const anonSelect = grants.some((grant) =>
        ['public', 'anon'].includes(String(grant.grantee || '').toLowerCase())
        && ['SELECT', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
      )
      if (anonSelect) {
        issues.push({
          type: 'VIEW_ANON_ACCESS_UNREVIEWED', severity: SEVERITY.HIGH,
          target: `public.${viewName}`,
          message: `Unlisted view public.${viewName} is anonymously selectable without an explicit reviewed contract.`,
        })
      }
    }
  }

  for (const [key, fn] of publicFunctions) {
    const signature = fn.signature || (String(key).startsWith('public.') ? String(key) : `public.${key}`)
    const contract = reviewedFunctions.get(normalizedSignature(signature))
    const grants = Array.isArray(fn.grants) ? fn.grants : []
    if (contract?.definitionMd5) {
      const executeGrants = grants.map(grant => `${String(grant.grantee || '').toLowerCase()}:${String(grant.privilege || '').toUpperCase()}`).sort()
      if (fn.definition_md5 !== contract.definitionMd5 || fn.owner !== contract.owner
        || (contract.searchPathConfig && fn.search_path_config !== contract.searchPathConfig)
        || grants.some(grant => grant.is_grantable !== false)
        || JSON.stringify(executeGrants) !== JSON.stringify(contract.exactExecuteGrants)) {
        issues.push({ type: 'FUNCTION_EXACT_CONTRACT_DRIFT', severity: SEVERITY.HIGH,
          target: signature, message: `Function ${signature} lacks its exact reviewed body, owner or nondelegable execute grants.` })
      }
      for (const dependency of contract.dependencies || (contract.dependency ? [contract.dependency] : [])) {
        const match = functionDetails(liveExport.functions || {}, dependency.signature)
        const dependencyGrants = match?.[1].grants
        const grantKeys = Array.isArray(dependencyGrants) ? dependencyGrants.map(g=>`${String(g.grantee||'').toLowerCase()}:${String(g.privilege||'').toUpperCase()}`).sort() : null
        if (!match || match[1].definition_md5 !== dependency.definitionMd5
          || match[1].owner !== dependency.owner
          || readFlag(match[1], 'securityDefiner', 'security_definer') !== dependency.securityDefiner
          || (dependency.searchPathConfig && match[1].search_path_config !== dependency.searchPathConfig)
          || (dependency.exactExecuteGrants && (!Array.isArray(dependencyGrants)
            || dependencyGrants.some(g=>g.is_grantable!==false)
            || JSON.stringify(grantKeys)!==JSON.stringify(dependency.exactExecuteGrants)))) {
          issues.push({ type: 'FUNCTION_DEPENDENCY_CONTRACT_DRIFT', severity: SEVERITY.HIGH,
            target: signature, message: `Function ${signature} lacks its exact reviewed ${dependency.signature} dependency.` })
        }
      }
    }
    const publicExecute = grants.some((grant) =>
      String(grant.grantee || '').toLowerCase() === 'public'
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    const anonExecute = grants.some((grant) =>
      String(grant.grantee || '').toLowerCase() === 'anon'
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    const authenticatedExecute = grants.some((grant) =>
      String(grant.grantee || '').toLowerCase() === 'authenticated'
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    if (typeof contract?.anonCallable === 'boolean' && contract.anonCallable !== anonExecute) {
      issues.push({
        type: contract.anonCallable ? 'FUNCTION_ANON_EXECUTE_MISSING' : 'FUNCTION_ANON_EXECUTE_GRANTED',
        severity: contract.anonCallable ? SEVERITY.MEDIUM : SEVERITY.CRITICAL,
        target: signature,
        message: contract.anonCallable
          ? `Reviewed public function ${signature} lacks its expected anonymous EXECUTE grant.`
          : `Sensitive function ${signature} is executable by an anonymous role despite its reviewed contract.`,
      })
    }
    if (typeof contract?.authenticatedCallable === 'boolean' && contract.authenticatedCallable !== authenticatedExecute) {
      issues.push({
        type: contract.authenticatedCallable ? 'FUNCTION_AUTHENTICATED_EXECUTE_MISSING' : 'FUNCTION_AUTHENTICATED_EXECUTE_GRANTED',
        severity: contract.authenticatedCallable ? SEVERITY.MEDIUM : SEVERITY.HIGH,
        target: signature,
        message: contract.authenticatedCallable
          ? `Reviewed function ${signature} lacks its expected authenticated EXECUTE grant.`
          : `Function ${signature} is executable by authenticated users despite its reviewed contract.`,
      })
    }
    const securityDefiner = fn.securityDefiner ?? fn.security_definer
    if (contract?.securityDefiner === true && securityDefiner !== true) {
      issues.push({
        type: 'FUNCTION_SECURITY_DEFINER_MISMATCH', severity: SEVERITY.HIGH,
        target: signature,
        message: `Reviewed function ${signature} is not marked SECURITY DEFINER as expected.`,
      })
    }
    if (contract?.searchPathSafe === true && !hasSafeFixedSearchPath(fn)) {
      issues.push({
        type: 'FUNCTION_SEARCH_PATH_UNSAFE', severity: SEVERITY.CRITICAL,
        target: signature,
        message: `Reviewed SECURITY DEFINER function ${signature} lacks its fixed safe search_path.`,
      })
    }
    for (const signal of contract?.requiredLiveSignals || []) {
      if (typeof fn[signal] !== 'boolean') {
        issues.push({
          type: 'FUNCTION_CONTRACT_SIGNAL_EVIDENCE_MISSING', severity: SEVERITY.HIGH,
          target: signature,
          message: `Reviewed function ${signature} requires a live ${signal} signal, but the metadata export lacks a boolean result.`,
        })
      } else if (!fn[signal]) {
        issues.push({
          type: 'FUNCTION_CONTRACT_SIGNAL_GUARD_MISSING', severity: SEVERITY.CRITICAL,
          target: signature,
          message: `Live function ${signature} does not satisfy its reviewed ${signal} contract signal.`,
        })
      }
    }
    if (publicExecute) {
      issues.push({
        type: 'FUNCTION_PUBLIC_EXECUTE_GRANTED', severity: SEVERITY.CRITICAL,
        target: signature,
        message: `Function ${signature} retains PostgreSQL PUBLIC execute instead of an exact role grant.`,
      })
    }
    if (!contract && anonExecute) {
      issues.push({
        type: 'FUNCTION_ANON_EXECUTE_UNREVIEWED', severity: SEVERITY.CRITICAL,
        target: signature,
        message: `Unlisted function ${signature} is directly executable by anonymous callers.`,
      })
    }
    if (!contract && authenticatedExecute && !publicExecute && !anonExecute) {
      issues.push({
        type: 'FUNCTION_AUTHORIZATION_UNREVIEWED', severity: SEVERITY.HIGH,
        target: signature,
        message: `Authenticated execution of ${signature} lacks an explicit function-level authorization contract in MAP-017.`,
      })
    }
    if (contract?.authorizationGuard && authenticatedExecute) {
      const guardSignals = {
        is_staff: fn.references_is_staff,
        is_admin: fn.references_is_admin,
        admin_role: fn.references_admin_role,
      }
      const guardSignal = guardSignals[contract.authorizationGuard]
      if (typeof guardSignal !== 'boolean') {
        issues.push({
          type: 'FUNCTION_GUARD_EVIDENCE_MISSING', severity: SEVERITY.HIGH,
          target: signature,
          message: `Function ${signature} has a reviewed ${contract.authorizationGuard} contract, but the metadata export lacks its non-sensitive live guard signal.`,
        })
      } else if (!guardSignal) {
        issues.push({
          type: 'FUNCTION_AUTHORIZATION_GUARD_MISSING', severity: SEVERITY.CRITICAL,
          target: signature,
          message: `Function ${signature} is authenticated-callable but its live body does not contain the reviewed ${contract.authorizationGuard} authorization guard.`,
        })
      }
    }
    if (contract?.aal2Required && authenticatedExecute) {
      const aal2Signals = contract.aal2Dependencies?.length
        ? contract.aal2Dependencies.map(dep=>functionDetails(liveExport.functions || {}, dep)?.[1].references_aal2)
        : [fn.references_aal2]
      if (aal2Signals.some(signal=>typeof signal !== 'boolean')) {
        issues.push({
          type: 'FUNCTION_AAL2_EVIDENCE_MISSING', severity: SEVERITY.HIGH,
          target: signature,
          message: `Function ${signature} requires AAL2, but the metadata export lacks its non-sensitive live AAL2 signal.`,
        })
      } else if (aal2Signals.some(signal=>!signal)) {
        issues.push({
          type: 'FUNCTION_AAL2_GUARD_MISSING', severity: SEVERITY.CRITICAL,
          target: signature,
          message: `Function ${signature} is authenticated-callable but its live body does not enforce the reviewed AAL2 requirement.`,
        })
      }
    }
    if (!contract && securityDefiner === true && !hasSafeFixedSearchPath(fn)) {
      issues.push({
        type: 'FUNCTION_SEARCH_PATH_UNSAFE', severity: SEVERITY.HIGH,
        target: signature,
        message: `Unlisted SECURITY DEFINER function ${signature} lacks a fixed safe search_path.`,
      })
    }
  }

  for (const grant of liveExport.schema_grants || []) {
    if (!['public', 'storage'].includes(String(grant.schema_name || '').toLowerCase())) continue
    if (!['public', 'anon', 'authenticated'].includes(String(grant.grantee || '').toLowerCase())) continue
    if (String(grant.privilege || '').toUpperCase() !== 'CREATE') continue
    issues.push({
      type: 'EXPOSED_SCHEMA_CLIENT_CREATE', severity: SEVERITY.CRITICAL,
      target: `${grant.schema_name}.${grant.grantee}`,
      message: `Client role ${grant.grantee} can CREATE objects in exposed schema ${grant.schema_name}.`,
    })
  }

  const unsafeDefaultGroups = new Map()
  for (const grant of liveExport.default_privileges || []) {
    const role = String(grant.grantee || '').toLowerCase()
    const schemaName = String(grant.schema_name || '').toLowerCase()
    const objectType = String(grant.object_type || '').toUpperCase()
    const privilege = String(grant.privilege || '').toUpperCase()
    if (schemaName !== 'public') continue
    if (!['public', 'anon', 'authenticated'].includes(role)) continue
    const unsafe = (objectType === 'FUNCTION' && ['EXECUTE', 'ALL'].includes(privilege))
      || (['TABLE', 'SEQUENCE'].includes(objectType) && (WRITE_PRIVILEGES.has(privilege) || privilege === 'USAGE'))
      || (objectType === 'SCHEMA' && privilege === 'CREATE')
    if (unsafe) {
      const key = `${schemaName}.${grant.owner}.${role}.${objectType}`
      const group = unsafeDefaultGroups.get(key) || { ...grant, schemaName, role, objectType, privileges: [] }
      group.privileges.push(privilege)
      unsafeDefaultGroups.set(key, group)
    }
  }
  for (const [target, group] of unsafeDefaultGroups) {
    issues.push({
      type: 'UNSAFE_DEFAULT_PRIVILEGE', severity: SEVERITY.CRITICAL,
      target,
      message: `Default privileges automatically grant ${[...new Set(group.privileges)].sort().join(', ')} on future ${group.objectType} objects in public to ${group.role}.`,
    })
  }

  return {
    issues,
    summary: {
      exposedTablesAudited: publicTables.length,
      exposedViewsAudited: publicViews.length,
      exposedFunctionsAudited: publicFunctions.length,
      schemaGrantsAudited: (liveExport.schema_grants || []).length,
      defaultPrivilegesAudited: (liveExport.default_privileges || []).length,
    },
  }
}

/**
 * Deterministically compares a live schema export against expected repository schema.
 */
export function compareSchemaTruth(liveExport, expectedSchema = buildExpectedRepositorySchema()) {
  const exhaustive = auditExposedAuthorization(liveExport, expectedSchema)
  const issues = [...exhaustive.issues]

  // 1. Audit Tables & RLS & Grants & Policies
  const liveTables = liveExport.tables || {}
  const liveGrants = normalizeGrants(liveExport.grants)
  const livePolicies = normalizePolicies(liveExport.policies)

  for (const [tableName, expected] of Object.entries(expectedSchema.tables)) {
    const tableKey = tableName.includes('.') ? tableName : `public.${tableName}`
    const liveTable = liveTables[tableName] || liveTables[tableKey]

    if (!liveTable) {
      issues.push({
        type: 'TABLE_MISSING',
        severity: expected.legacyIsolated ? SEVERITY.INFO : SEVERITY.HIGH,
        target: `public.${tableName}`,
        message: `Expected table public.${tableName} is not present in schema export.`,
      })
      continue
    }

    if (expected.rlsEnabled && !readFlag(liveTable, 'rlsEnabled', 'rls_enabled')) {
      issues.push({
        type: 'RLS_DISABLED',
        severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Row Level Security is DISABLED on public.${tableName}.`,
      })
    }

    // Check grants for anonymous DML
    const tableGrants = liveGrants.filter((grant) => matchesPublicRelation(grant, tableName))
    const anonTableGrants = tableGrants
      .filter((g) => (g.grantee === 'anon' || g.grantee === 'public') && WRITE_PRIVILEGES.has(String(g.privilege || '').toUpperCase()))
      .map((g) => g.privilege)

    if (expected.noAnonDML && anonTableGrants.length > 0) {
      issues.push({
        type: 'ANON_DML_GRANTED',
        severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Direct anonymous DML privileges granted on public.${tableName}: ${anonTableGrants.join(', ')}.`,
      })
    }

    // Check policies for blanket public or unconstrained authenticated write
    const tablePolicies = livePolicies.filter((policy) => matchesPublicRelation(policy, tableName))
    for (const policy of tablePolicies) {
      const policyName = policy.policy_name || policy.name
      const roles = policy.roles || []
      const isPublicRole = roles.includes('public') || roles.includes('anon')
      const isAuthenticatedRole = roles.includes('authenticated')
      const isWriteCommand = ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(policy.command)
      const usingExpr = (policy.using_expression || policy.using || '').trim()
      const withCheckExpr = (policy.with_check_expression || policy.withCheck || '').trim()
      const isBlanketTrue = usingExpr === 'true' || withCheckExpr === 'true'

      if (isPublicRole && isWriteCommand && isBlanketTrue) {
        issues.push({
          type: 'BLANKET_PUBLIC_WRITE_POLICY',
          severity: SEVERITY.CRITICAL,
          target: `public.${tableName}.${policyName}`,
          message: `Permissive public write policy detected on public.${tableName}: "${policyName}" (${policy.command} USING/WITH CHECK true).`,
        })
      } else if (isAuthenticatedRole && isWriteCommand && isBlanketTrue && expected.staffScoped) {
        issues.push({
          type: 'BLANKET_AUTHENTICATED_WRITE_POLICY',
          severity: SEVERITY.CRITICAL,
          target: `public.${tableName}.${policyName}`,
          message: `Permissive authenticated write policy without staff scoping on public.${tableName}: "${policyName}" (${policy.command} USING/WITH CHECK true).`,
        })
      }
    }
  }

  // 2. Audit Views & Security Invoker
  const liveViews = liveExport.views || {}
  for (const [viewName, expected] of Object.entries(expectedSchema.views)) {
    const viewKey = viewName.includes('.') ? viewName : `public.${viewName}`
    const liveView = liveViews[viewName] || liveViews[viewKey]
    if (!liveView) {
      issues.push({
        type: 'VIEW_MISSING',
        severity: SEVERITY.MEDIUM,
        target: `public.${viewName}`,
        message: `Expected view public.${viewName} is not present in schema export.`,
      })
      continue
    }

    if (expected.securityInvoker && !readFlag(liveView, 'securityInvoker', 'security_invoker')) {
      issues.push({
        type: 'SECURITY_INVOKER_MISSING',
        severity: SEVERITY.HIGH,
        target: `public.${viewName}`,
        message: `Operational view public.${viewName} does not have security_invoker = true (may bypass RLS).`,
      })
    }

    const viewGrants = liveGrants.filter((grant) => matchesPublicRelation(grant, viewName))
    const anonCanSelect = viewGrants.some((grant) =>
      ['anon', 'public'].includes(String(grant.grantee || '').toLowerCase())
      && ['SELECT', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    if (expected.anonAccess === false && anonCanSelect) {
      issues.push({
        type: 'VIEW_ANON_ACCESS_GRANTED',
        severity: SEVERITY.HIGH,
        target: `public.${viewName}`,
        message: `Operational view public.${viewName} is directly selectable by an anonymous/public role.`,
      })
    } else if (expected.anonAccess === true && !anonCanSelect) {
      issues.push({
        type: 'VIEW_ANON_ACCESS_MISSING',
        severity: SEVERITY.MEDIUM,
        target: `public.${viewName}`,
        message: `Reviewed public view public.${viewName} lacks its expected anonymous SELECT grant.`,
      })
    }
  }

  // 3. Audit Functions & Deprecated RPC Lockdowns & Search Paths
  const liveFunctions = liveExport.functions || {}
  for (const [expectedSignature, expected] of Object.entries(expectedSchema.functions)) {
    const match = functionDetails(liveFunctions, expectedSignature)
    if (!match) {
      issues.push({
        type: 'FUNCTION_MISSING',
        severity: SEVERITY.HIGH,
        target: expectedSignature,
        message: `Required authorization function ${expectedSignature} is not present in the schema export.`,
      })
      continue
    }

    const [liveSignature, details] = match
    const securityDefiner = details.securityDefiner ?? details.security_definer
    if (expected.securityDefiner === true && securityDefiner !== true) {
      issues.push({
        type: 'FUNCTION_SECURITY_DEFINER_MISMATCH',
        severity: SEVERITY.HIGH,
        target: liveSignature,
        message: `Required function ${liveSignature} is not marked SECURITY DEFINER as expected.`,
      })
    }
    if (expected.searchPathSafe && !hasSafeFixedSearchPath(details)) {
      issues.push({
        type: 'FUNCTION_SEARCH_PATH_UNSAFE',
        severity: SEVERITY.HIGH,
        target: liveSignature,
        message: `SECURITY DEFINER function ${liveSignature} lacks a fixed safe search_path.`,
      })
    }
    const grants = Array.isArray(details.grants) ? details.grants : []
    const anonCallable = grants.some((grant) =>
      ['anon', 'public'].includes(String(grant.grantee || '').toLowerCase())
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    if (expected.anonCallable === false && anonCallable) {
      issues.push({
        type: 'FUNCTION_ANON_EXECUTE_GRANTED',
        severity: SEVERITY.CRITICAL,
        target: liveSignature,
        message: `Sensitive function ${liveSignature} is executable by an anonymous/public role.`,
      })
    } else if (expected.anonCallable === true && !anonCallable) {
      issues.push({
        type: 'FUNCTION_ANON_EXECUTE_MISSING',
        severity: SEVERITY.MEDIUM,
        target: liveSignature,
        message: `Reviewed public function ${liveSignature} lacks its expected anonymous EXECUTE grant.`,
      })
    }
    const returnType = details.returns ?? details.return_type
    if (expected.returns && String(returnType || '').toLowerCase() !== expected.returns.toLowerCase()) {
      issues.push({
        type: 'FUNCTION_RETURN_TYPE_MISMATCH',
        severity: SEVERITY.MEDIUM,
        target: liveSignature,
        message: `Function ${liveSignature} return type does not match the reviewed contract.`,
      })
    }
  }

  for (const deprecatedName of expectedSchema.deprecatedFunctionsRevoked) {
    const fn = Object.entries(liveFunctions).find(([k]) => k.includes(deprecatedName))
    if (fn) {
      const [signature, details] = fn
      const grants = details.grants || []
      const clientExecutable = grants.some((g) => ['anon', 'public', 'authenticated'].includes(g.grantee))
      if (clientExecutable && !details.disabled) {
        issues.push({
          type: 'DEPRECATED_RPC_ACTIVE',
          severity: SEVERITY.HIGH,
          target: signature.includes('.') ? signature : `public.${signature}`,
          message: `Deprecated mutation RPC ${signature} is still executable by client roles.`,
        })
      }
    }
  }

  // 4. Audit Storage Policies & Bucket Limits
  const liveStorage = liveExport.storage || {}
  for (const [bucketId, expected] of Object.entries(expectedSchema.storage)) {
    const bucket = liveStorage.buckets?.[bucketId]
    if (!bucket) {
      issues.push({
        type: 'STORAGE_BUCKET_MISSING',
        severity: SEVERITY.HIGH,
        target: `storage.buckets.${bucketId}`,
        message: `Storage bucket "${bucketId}" not found in schema export.`,
      })
      continue
    }

    if (expected.maxFileSize && (!bucket.file_size_limit || bucket.file_size_limit > expected.maxFileSize)) {
      issues.push({
        type: 'STORAGE_LIMIT_MISSING',
        severity: SEVERITY.HIGH,
        target: `storage.buckets.${bucketId}`,
        message: `Storage bucket "${bucketId}" lacks enforced max file size limit (expected <= ${expected.maxFileSize} bytes, got ${bucket.file_size_limit}).`,
      })
    }

    if (expected.allowedMimeTypes && (!bucket.allowed_mime_types || bucket.allowed_mime_types.length === 0)) {
      issues.push({
        type: 'STORAGE_MIME_ALLOWLIST_MISSING',
        severity: SEVERITY.HIGH,
        target: `storage.buckets.${bucketId}`,
        message: `Storage bucket "${bucketId}" has no allowed MIME type restriction.`,
      })
    }

    // Check storage policies for unauthenticated public writes
    const bucketPolicies = liveStorage.policies || livePolicies.filter((policy) =>
      policy.schema_name === 'storage' && policy.table_name === 'objects',
    )
    for (const policy of bucketPolicies) {
      const pName = policy.policy_name || policy.name || ''
      const roles = policy.roles || []
      const isPublic = roles.includes('public') || roles.includes('anon') || /anyone/i.test(pName)
      const isWrite = ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(policy.command) || /upload|update|delete/i.test(pName)

      if (isPublic && isWrite && expected.noPublicUpload) {
        issues.push({
          type: 'STORAGE_PUBLIC_WRITE_POLICY',
          severity: SEVERITY.CRITICAL,
          target: `storage.objects.${pName || 'unnamed_public_policy'}`,
          message: `Legacy permissive write policy "${pName}" present on storage bucket "${bucketId}".`,
        })
      }
    }
  }

  // 5. Audit Realtime Publications
  const liveRealtime = liveExport.realtime || {}
  const realtimeTables = liveRealtime.publication_tables || []
  for (const excludedTable of expectedSchema.realtime.excludedTables) {
    if (realtimeTables.includes(excludedTable)) {
      issues.push({
        type: 'REALTIME_EXCLUDED_TABLE_PRESENT',
        severity: SEVERITY.HIGH,
        target: `supabase_realtime.${excludedTable}`,
        message: `Legacy table public.${excludedTable} is published in supabase_realtime publication.`,
      })
    }
  }

  // The repository names migrations `<YYYYMMDD>_<slug>`, while the applied ledger
  // stores the Supabase CLI's `<YYYYMMDDHHMMSS>` version plus a separate name.
  // Matching the version string exactly therefore reports every genuinely applied
  // migration as missing. An entry counts as applied when its slug matches, so a
  // real absence is still reported.
  const liveMigrations = (liveExport.migrations || []).map((entry) =>
    typeof entry === 'string'
      ? { version: entry, name: '' }
      : { version: String(entry.version || ''), name: String(entry.name || '') },
  )
  const migrationSlug = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/^\d{8,14}[_-]?/, '')
      .replace(/[_-]?\d{8,14}$/, '')
      .replace(/[^a-z0-9]/g, '')
  const isMigrationApplied = (expectedVersion) => {
    const expectedSlug = migrationSlug(expectedVersion)
    return liveMigrations.some((entry) =>
      entry.version === expectedVersion ||
      (expectedSlug !== '' &&
        (migrationSlug(entry.name) === expectedSlug || migrationSlug(entry.version) === expectedSlug)),
    )
  }
  for (const expectedVersion of expectedSchema.expectedMigrations) {
    if (!isMigrationApplied(expectedVersion)) {
      issues.push({
        type: 'MIGRATION_LEDGER_ENTRY_MISSING',
        severity: SEVERITY.HIGH,
        target: expectedVersion,
        message: `Required migration ledger entry ${expectedVersion} is absent from the supplied export.`,
      })
    }
  }

  const criticalCount = issues.filter((i) => i.severity === SEVERITY.CRITICAL).length
  const highCount = issues.filter((i) => i.severity === SEVERITY.HIGH).length

  return {
    timestamp: new Date().toISOString(),
    clean: issues.length === 0,
    criticalCount,
    highCount,
    totalIssues: issues.length,
    issues,
    summary: {
      tablesChecked: Object.keys(expectedSchema.tables).length,
      viewsChecked: Object.keys(expectedSchema.views).length,
      functionsChecked: Object.keys(expectedSchema.functions).length,
      migrationsChecked: expectedSchema.expectedMigrations.length,
      storageBucketsChecked: Object.keys(expectedSchema.storage).length,
      ...exhaustive.summary,
      status: issues.length === 0 ? 'CONFORMANT' : criticalCount > 0 ? 'NON_CONFORMANT_CRITICAL' : 'DRIFT_DETECTED',
    },
  }
}

/**
 * Format the comparison result into a clean markdown or console report.
 */
export function formatSchemaTruthReport(diffResult, { format = 'markdown' } = {}) {
  if (format === 'json') {
    return JSON.stringify(diffResult, null, 2)
  }

  const lines = []
  lines.push('# Schema-Truth Audit Report (MAP-017)')
  lines.push('')
  lines.push(`**Generated:** ${diffResult.timestamp}`)
  lines.push(`**Overall Status:** ${diffResult.clean ? 'CONFORMANT (No drift detected)' : diffResult.summary.status}`)
  lines.push(`**Total Findings:** ${diffResult.totalIssues} (Critical: ${diffResult.criticalCount}, High: ${diffResult.highCount})`)
  lines.push('')
  lines.push('## Executive Summary')
  lines.push('')
  lines.push(`- Tables audited: ${diffResult.summary.tablesChecked}`)
  lines.push(`- Views audited: ${diffResult.summary.viewsChecked}`)
  lines.push(`- Functions audited: ${diffResult.summary.functionsChecked}`)
  lines.push(`- Required migration entries audited: ${diffResult.summary.migrationsChecked}`)
  lines.push(`- Storage buckets audited: ${diffResult.summary.storageBucketsChecked}`)
  lines.push(`- Exhaustive public tables audited: ${diffResult.summary.exposedTablesAudited}`)
  lines.push(`- Exhaustive public views audited: ${diffResult.summary.exposedViewsAudited}`)
  lines.push(`- Exhaustive public functions audited: ${diffResult.summary.exposedFunctionsAudited}`)
  lines.push(`- Schema grants audited: ${diffResult.summary.schemaGrantsAudited}`)
  lines.push(`- Default privileges audited: ${diffResult.summary.defaultPrivilegesAudited}`)
  lines.push('')

  if (diffResult.issues.length === 0) {
    lines.push('✓ All inspected schema objects, RLS settings, grants, views, storage policies, and realtime publications conform to repository truth.')
  } else {
    lines.push('## Findings by Severity')
    lines.push('')
    lines.push('| Severity | Issue Type | Target | Details |')
    lines.push('| --- | --- | --- | --- |')
    for (const issue of diffResult.issues) {
      lines.push(`| **${issue.severity}** | \`${issue.type}\` | \`${issue.target}\` | ${sanitizeSchemaText(issue.message)} |`)
    }
  }

  lines.push('')
  lines.push('---')
  lines.push('*No credentials, tokens, or private data were printed or stored in this audit.*')
  return lines.join('\n')
}
