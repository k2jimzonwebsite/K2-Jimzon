function unavailableRelation(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(message)
}

function byCustomer(rows = []) {
  const result = new Map()
  for (const row of rows) {
    if (!row.customer_id) continue
    const list = result.get(row.customer_id) || []
    list.push(row)
    result.set(row.customer_id, list)
  }
  return result
}

function legacyCustomer(profile) {
  return {
    id: profile.id,
    displayName: profile.email || 'Registered customer',
    status: 'active',
    createdSource: 'website_account_legacy',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at || profile.created_at,
    account: { linked: true, status: 'legacy', commercialRole: profile.role },
    contacts: profile.email ? [{ kind: 'email', value: profile.email, verificationStatus: 'account_profile', source: 'legacy' }] : [],
    channels: [],
    metrics: null,
  }
}

export async function readAdminCustomers(client) {
  const canonical = await client.from('customers').select([
    'id,display_name,status,created_source,created_at,updated_at',
    'customer_contact_points(id,contact_kind,contact_value,verification_status,source)',
    'customer_accounts(user_id,status,linked_at)',
    'channel_identities(id,channel,link_status,created_at)',
  ].join(',')).order('created_at', { ascending: false }).limit(500)

  if (canonical.error) {
    if (!unavailableRelation(canonical.error)) throw new Error('CUSTOMERS_UNAVAILABLE')
    const legacy = await client.from('user_profiles')
      .select('id,email,role,created_at,updated_at')
      .in('role', ['Customer', 'VIP'])
      .order('created_at', { ascending: false }).limit(500)
    if (legacy.error) throw new Error('CUSTOMERS_UNAVAILABLE')
    return {
      mode: 'legacy_profiles', metricsAvailable: false,
      customers: (legacy.data || []).map(legacyCustomer), asOf: new Date().toISOString(),
    }
  }

  const customers = canonical.data || []
  const ids = customers.map((customer) => customer.id)
  let orderRows = []
  let pasabuyRows = []
  let conversationRows = []
  let metricsAvailable = true
  if (ids.length) {
    const [orders, pasabuy, conversations] = await Promise.all([
      client.from('order_requests').select('id,customer_id,total_amount,status,created_at').in('customer_id', ids).limit(2000),
      client.from('pasabuy_requests').select('id,customer_id,status,created_at').in('customer_id', ids).limit(2000),
      client.from('conversations').select('id,customer_id,status,unread_count,last_message_at').in('customer_id', ids).limit(2000),
    ])
    metricsAvailable = !orders.error && !pasabuy.error && !conversations.error
    orderRows = orders.error ? [] : orders.data || []
    pasabuyRows = pasabuy.error ? [] : pasabuy.data || []
    conversationRows = conversations.error ? [] : conversations.data || []
  }
  const ordersByCustomer = byCustomer(orderRows)
  const pasabuyByCustomer = byCustomer(pasabuyRows)
  const conversationsByCustomer = byCustomer(conversationRows)

  return {
    mode: 'canonical', metricsAvailable,
    customers: customers.map((customer) => {
      const orders = ordersByCustomer.get(customer.id) || []
      const requests = pasabuyByCustomer.get(customer.id) || []
      const conversations = conversationsByCustomer.get(customer.id) || []
      return {
        id: customer.id,
        displayName: customer.display_name,
        status: customer.status,
        createdSource: customer.created_source,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        account: customer.customer_accounts?.[0]
          ? { linked: true, status: customer.customer_accounts[0].status, commercialRole: null }
          : { linked: false, status: null, commercialRole: null },
        contacts: (customer.customer_contact_points || []).map((contact) => ({
          kind: contact.contact_kind, value: contact.contact_value,
          verificationStatus: contact.verification_status, source: contact.source,
        })),
        channels: (customer.channel_identities || []).map((identity) => ({
          channel: identity.channel, linkStatus: identity.link_status,
        })),
        metrics: metricsAvailable ? {
          orderCount: orders.length,
          orderValue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
          pasabuyCount: requests.length,
          conversationCount: conversations.length,
          unreadCount: conversations.reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0),
          lastMessageAt: conversations.map((item) => item.last_message_at).filter(Boolean).sort().at(-1) || null,
        } : null,
      }
    }),
    asOf: new Date().toISOString(),
  }
}
