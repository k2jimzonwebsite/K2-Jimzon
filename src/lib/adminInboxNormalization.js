function normalizeUnreadCount(value) {
  const count = Number(value ?? 0)
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0
}

export function normalizeAdminConversation(conversation) {
  const unreadCount = normalizeUnreadCount(conversation.unreadCount ?? conversation.unread_count)
  return {
    id: conversation.id,
    customer: conversation.customerName ?? conversation.customer_name,
    channel: conversation.platform,
    sourceKind: conversation.sourceKind ?? conversation.source_kind ?? '',
    status: conversation.status || 'Open',
    priority: conversation.priority || 'normal',
    unreadCount,
    unread: unreadCount > 0,
    assignedTo: conversation.assignedTo ?? conversation.assigned_to ?? null,
    assignedName: conversation.assigned_profile?.full_name || conversation.assigned_profile?.email || '',
    responseDueAt: conversation.responseDueAt ?? conversation.response_due_at ?? null,
    lastInboundAt: conversation.lastInboundAt ?? conversation.last_inbound_at ?? null,
    lastReadAt: conversation.lastReadAt ?? conversation.last_read_at ?? null,
    resolvedAt: conversation.resolvedAt ?? conversation.resolved_at ?? null,
    lastMessageAt: conversation.lastMessageAt ?? conversation.last_message_at ?? null,
    time: (conversation.lastMessageAt ?? conversation.last_message_at)
      ? new Date(conversation.lastMessageAt ?? conversation.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'No activity',
    messages: (conversation.messages || []).map((message) => ({
      id: message.id,
      sender: (message.senderType ?? message.sender_type) === 'Customer' ? 'customer' : (message.senderType ?? message.sender_type) === 'AI' ? 'ai' : 'agent',
      senderType: message.senderType ?? message.sender_type,
      text: message.content,
      isDraft: Boolean(message.isDraft ?? message.is_draft),
      deliveryStatus: (message.deliveryStatus ?? message.delivery_status) || ((message.senderType ?? message.sender_type) === 'Customer' ? 'received' : 'internal_only'),
      sentAt: message.sentAt ?? message.sent_at ?? null,
      failureReason: message.failed ? 'External delivery failed.' : '',
      createdAt: message.createdAt ?? message.created_at,
    })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    intent: 'general',
  }
}
