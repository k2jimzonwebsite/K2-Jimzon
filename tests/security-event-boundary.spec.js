import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  signedSecurityEventArguments, validateSecurityEvent,
} from '../server/admin-bff/security-events.js'

test.beforeEach(() => {
  process.env.K2_ADMIN_BFF_REQUEST_SECRET=Buffer.alloc(32,17).toString('base64')
})

test('security events accept only fixed redacted fields and produce a signed payload', () => {
  const event={
    correlationId:'21212121-2121-4121-8121-212121212121',
    eventType:'authorization',source:'admin_bff',severity:'warning',outcome:'denied',
    sessionId:null,routeKey:'admin.security-events',reasonCode:'ADMIN_REQUIRED',
    subjectKind:null,subjectId:null,
  }
  expect(validateSecurityEvent(event)).toEqual(event)
  const signed=signedSecurityEventArguments(event,{
    timestamp:1770000000,nonce:'22222222-2222-4222-8222-222222222222',
  })
  expect(signed.p_signature).toMatch(/^[0-9a-f]{64}$/)
  expect(signed.p_route_key).toBe('admin.security-events')
  expect(JSON.stringify(signed)).not.toMatch(/password|access_token|refresh_token|stack|user-agent/i)
  expect(()=>validateSecurityEvent({ ...event,reasonCode:'raw provider message' })).toThrow('SECURITY_EVENT_INVALID')
  expect(()=>validateSecurityEvent({ ...event,subjectId:'line one\nline two' })).toThrow('SECURITY_EVENT_INVALID')
})

test('security-event migration is private, signed, aggregated, reviewable, and retained deliberately', async () => {
  const sql=await readFile(new URL('../supabase/migrations/20260822_security_event_boundary.sql',import.meta.url),'utf8')
  expect(sql).toContain('k2_private.security_events')
  expect(sql).toContain('force row level security')
  expect(sql).toContain('record_security_event_v1')
  expect(sql).toContain('security_event_nonces')
  expect(sql).toContain("date_bin(interval '5 minutes'")
  expect(sql).toContain('read_admin_security_review_v1')
  expect(sql).toContain('HIGH_VALUE_EVENT_REVIEW')
  expect(sql).toContain('ABUSE_THRESHOLD_REVIEW')
  expect(sql).toContain('ACCESS_DENIAL_THRESHOLD_REVIEW')
  expect(sql).toContain('REPEATED_FAILURE_REVIEW')
  expect(sql).toContain('K2_AAL2_ADMIN_REQUIRED')
  expect(sql).toContain('prune_security_events_v1')
  expect(sql).toContain('to service_role')
  expect(sql).not.toMatch(/ip_address|email_address|user_agent|raw_url|stack_trace|access_token|refresh_token/i)
})

test('browser reporting sends only stable classification through the protected BFF', async () => {
  const reporter=await readFile(new URL('../src/lib/reportError.js',import.meta.url),'utf8')
  expect(reporter).toContain("'/api/admin/security-events'")
  expect(reporter).toContain("JSON.stringify({ code:event.code,kind:event.kind })")
  expect(reporter).toContain("'X-K2-CSRF':csrf")
  expect(reporter).toContain("'X-K2-Idempotency-Key':crypto.randomUUID()")
  expect(reporter).not.toContain("from('error_reports')")
})
