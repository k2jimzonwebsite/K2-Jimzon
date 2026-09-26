import { expect, test } from '@playwright/test'
import {
  getChannelPortalUrl,
  inferConversationCategory,
  inferConversationOrigin,
  INBOX_CATEGORIES,
  INBOX_ORIGINS,
} from '../src/lib/adminInboxNormalization.js'

test.describe('Inbox Categorization Logic', () => {
  test('accurately classifies inquiries by purpose and intent', () => {
    // 1. Wholesale inquiries
    expect(inferConversationCategory({
      messages: [{ content: 'May wholesale discount po ba kayo pag 10 kilos na bulto order?' }],
    })).toBe('wholesale')

    // 2. Pasabuy inquiries
    expect(inferConversationCategory({
      messages: [{ content: 'Pwede po ba mag-pasabuy ng sweets and coffee from Japan?' }],
    })).toBe('pasabuy')

    // 3. Order & delivery tracking inquiries
    expect(inferConversationCategory({
      messages: [{ content: 'Hi, asking for update on order tracking number and proof of payment' }],
    })).toBe('order')

    // 4. Product & shelf inquiries (including screenshot customer inquiry)
    expect(inferConversationCategory({
      messages: [{ content: 'Wow pwede patikim po muna bago ako bumili' }],
    })).toBe('product')

    expect(inferConversationCategory({
      messages: [{ content: 'Yes po meron po kami 500 Grams kasing sarap ko pa' }],
    })).toBe('product')

    // 5. Virtual store messages default to shelf/product unless specifically wholesale/pasabuy
    expect(inferConversationCategory({
      sourceKind: 'virtual_store_message',
      messages: [{ content: 'What is on this shelf?' }],
    })).toBe('product')

    // 6. General inquiries
    expect(inferConversationCategory({
      messages: [{ content: 'Hello, what time do you open tomorrow?' }],
    })).toBe('general')
  })

  test('accurately identifies channel origins', () => {
    expect(inferConversationOrigin({ platform: 'Messenger' })).toBe('messenger')
    expect(inferConversationOrigin({ platform: 'WhatsApp' })).toBe('whatsapp')
    expect(inferConversationOrigin({ platform: 'Shopee' })).toBe('shopee')
    expect(inferConversationOrigin({ platform: 'Lazada' })).toBe('lazada')
    expect(inferConversationOrigin({ platform: 'TikTok' })).toBe('tiktok')
    expect(inferConversationOrigin({ platform: 'Website' })).toBe('website')
    expect(inferConversationOrigin({ sourceKind: 'virtual_store_message' })).toBe('virtual_store')
    expect(inferConversationOrigin({ platform: 'Virtual Store' })).toBe('virtual_store')
  })

  test('returns direct portal deep-links and reply instructions for external channels', () => {
    // Messenger
    const messenger = getChannelPortalUrl('Messenger')
    expect(messenger.url).toBe('https://business.facebook.com/latest/inbox')
    expect(messenger.label).toBe('Open Meta Inbox')
    expect(messenger.instruction).toContain('Meta Business Suite Messenger inbox')

    // WhatsApp with customer phone
    const waWithPhone = getChannelPortalUrl('WhatsApp', { customerPhone: '+63 917 123 4567' })
    expect(waWithPhone.url).toBe('https://web.whatsapp.com/send?phone=639171234567')
    expect(waWithPhone.label).toBe('Open WhatsApp Web')

    // WhatsApp without phone
    const waNoPhone = getChannelPortalUrl('WhatsApp', {})
    expect(waNoPhone.url).toBe('https://web.whatsapp.com')

    // Shopee
    const shopee = getChannelPortalUrl('Shopee')
    expect(shopee.url).toBe('https://seller.shopee.ph/portal/webchat')
    expect(shopee.label).toBe('Open Shopee Webchat')

    // Lazada
    const lazada = getChannelPortalUrl('Lazada')
    expect(lazada.url).toBe('https://sellercenter.lazada.com.ph/im/im-agent')
    expect(lazada.label).toBe('Open Lazada IM')

    // TikTok
    const tiktok = getChannelPortalUrl('TikTok')
    expect(tiktok.url).toBe('https://seller-ph.tiktok.com/chat')
    expect(tiktok.label).toBe('Open TikTok Shop Chat')
  })
})

test.describe('Inbox Viewport & UI Interactions', () => {
  test('displays category tabs, badges, and filters conversations', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    // Category tabs are present
    const categoryTabs = page.getByRole('tablist', { name: 'Inquiry purpose categories' })
    await expect(categoryTabs).toBeVisible()
    await expect(categoryTabs.getByRole('tab', { name: /All/i })).toBeVisible()
    await expect(categoryTabs.getByRole('tab', { name: /Orders/i })).toBeVisible()
    await expect(categoryTabs.getByRole('tab', { name: /Shelf/i })).toBeVisible()

    // Origin badges appear on items in the queue
    const queue = page.getByLabel('Conversation queue')
    await expect(queue.getByText('WhatsApp').first()).toBeVisible()
    await expect(queue.getByText('Shopee').first()).toBeVisible()

    // Filter by channel origin
    const originSelect = page.getByLabel('Filter by channel origin')
    await originSelect.selectOption('shopee')
    await expect(queue.getByText('Paolo Reyes')).toBeVisible()
    await expect(queue.getByText('Maria Santos')).not.toBeVisible()

    // Reset origin filter
    await originSelect.selectOption('all')
    await expect(queue.getByText('Maria Santos')).toBeVisible()
  })

  test('enlarge workspace maximizes reading height and collapses metric rail', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    // Initially standard view with full MetricRail
    await expect(page.getByText(/Open or waiting on customer/).first()).toBeVisible()
    const toggleButton = page.getByRole('button', { name: /Enlarge workspace/i })
    await expect(toggleButton).toBeVisible()

    // Click to enlarge workspace
    await toggleButton.click()
    await expect(page.getByText('Maximized reading mode active')).toBeVisible()
    await expect(page.getByText('Queue status:')).toBeVisible()
    const restoreButton = page.getByRole('button', { name: /Restore standard view/i })
    await expect(restoreButton).toBeVisible()

    // Click to restore standard view
    await restoreButton.click()
    await expect(page.getByText(/Open or waiting on customer/).first()).toBeVisible()
  })

  test('message actions & deletion modal provides copyable SQL and moderation status', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    const messageActionsBtn = page.getByRole('button', { name: 'Message Actions & Deletion' })
    await expect(messageActionsBtn).toBeVisible()
    await messageActionsBtn.click()

    // Modal dialog is open
    await expect(page.getByRole('heading', { name: 'Message Retraction & Moderation Control' })).toBeVisible()
    await expect(page.getByText('How to Delete or Retract an Errant Message')).toBeVisible()
    await expect(page.getByText('DELETE FROM public.messages')).toBeVisible()
    await expect(page.getByText('tirahin kita eh')).toBeVisible()

    // Copy SQL button is functional
    const copySqlBtn = page.getByRole('button', { name: /Copy SQL snippet/i })
    await expect(copySqlBtn).toBeVisible()

    // Close dialog
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: 'Message Retraction & Moderation Control' })).not.toBeVisible()
  })

  test('collapsible workflow sidebar expands reading width', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    const sidebar = page.getByRole('complementary', { name: 'Conversation workflow' })
    await expect(sidebar).toBeVisible()

    // Collapse workflow panel
    const collapseBtn = page.getByRole('button', { name: 'Collapse workflow panel' })
    await collapseBtn.click()
    await expect(sidebar).not.toBeVisible()

    // Reopen workflow panel from header
    const showBtn = page.getByRole('button', { name: 'Show workflow' })
    await expect(showBtn).toBeVisible()
    await showBtn.click()
    await expect(sidebar).toBeVisible()
  })

  test('staff can delete an errant or fooling message directly from the conversation stream', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    // Maria Santos conversation is active by default with 2 messages
    const targetMsg = page.getByText('Do you have the 500g pack available for two pieces?')
    await expect(targetMsg).toBeVisible()

    // Find the Delete button for this message
    const deleteBtn = page.getByRole('button', { name: 'Delete', exact: true }).first()
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Confirmation dialog appears
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Delete Message' })).toBeVisible()
    await expect(dialog.getByText('Permanently delete this individual message from the conversation and database.')).toBeVisible()
    await expect(dialog.getByText('Do you have the 500g pack available for two pieces?')).toBeVisible()

    // Select reason
    const reasonSelect = dialog.getByLabel('Reason for deletion:')
    await expect(reasonSelect).toBeVisible()
    await reasonSelect.selectOption('Spam or trolling inquiry')

    // Confirm deletion
    const confirmDeleteBtn = dialog.getByRole('button', { name: 'Delete message' })
    await expect(confirmDeleteBtn).toBeVisible()
    await confirmDeleteBtn.click()

    // Dialog closes, notice appears, and message is permanently removed
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Message permanently deleted.')).toBeVisible()
    await expect(targetMsg).not.toBeVisible()

    // The other message remains in the thread
    await expect(page.locator('.whitespace-pre-wrap', { hasText: 'I need delivery in Quezon City this Friday.' })).toBeVisible()
  })

  test('staff can 1-click archive and remove a thread from active view', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    // Maria Santos is active
    await expect(page.getByRole('heading', { name: 'Maria Santos' })).toBeVisible()

    // Click "Archive / Remove Thread" in conversation header
    const archiveBtn = page.getByRole('button', { name: /Archive \/ Remove Thread/i })
    await expect(archiveBtn).toBeVisible()
    await archiveBtn.click()

    // Archive confirmation dialog opens
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Archive & Remove Thread' })).toBeVisible()
    await expect(dialog.getByText('Mark this conversation as Resolved and remove it from the active staff queue.')).toBeVisible()

    // Confirm archive
    const confirmBtn = dialog.getByRole('button', { name: 'Archive & Remove from Active' })
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Notice appears and Maria Santos is removed from active list
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Conversation marked Resolved and archived from active view.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Maria Santos/ })).not.toBeVisible()
  })
})

