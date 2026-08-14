import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  ADMIN_PRODUCTION_ORIGIN, ADMIN_ROUTE, buildAdminOAuthRedirectUrl,
} from '../src/lib/adminAuthRedirect.js'

test('Google admin OAuth returns to the guarded admin route', async () => {
  expect(buildAdminOAuthRedirectUrl('http://127.0.0.1:5173')).toBe(
    `http://127.0.0.1:5173${ADMIN_ROUTE}`
  )
  expect(buildAdminOAuthRedirectUrl('https://temporary-preview.vercel.app')).toBe(
    `${ADMIN_PRODUCTION_ORIGIN}${ADMIN_ROUTE}`
  )

  const contextSource = await readFile(
    new URL('../src/context/useAdminAuthRuntime.js', import.meta.url),
    'utf8'
  )
  const googleOAuthCall = contextSource.match(/signInWithOAuth\(\{[\s\S]*?\n\s*\}\)/)?.[0] || ''
  expect(googleOAuthCall).toContain('redirectTo: buildAdminOAuthRedirectUrl()')
  expect(googleOAuthCall).not.toContain('redirectTo: window.location.origin')
})

test('Google callback exposes the authenticator step instead of returning to login', async () => {
  const authSource = await readFile(
    new URL('../src/context/useAdminAuthRuntime.js', import.meta.url),
    'utf8'
  )
  const modalSource = await readFile(
    new URL('../src/views/admin/AdminAuthModal.jsx', import.meta.url),
    'utf8'
  )

  expect(authSource).toContain('setMfaRequired(true)')
  expect(modalSource).toContain('if (!mfaRequired) return')
  expect(modalSource).toContain('setStep(2)')
})

test.describe('admin access boundary', () => {
  test('guarded path works and requires real Supabase authentication', async ({ page }) => {
    await page.goto('/admin-portal-k2-secure')
    await expect(page.getByRole('heading', { name: /K2 Jimzon Admin/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Staff sign-in')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByText(/Home Dashboard|Multi-channel action center/i)).toHaveCount(0)
  })

  test('legacy localStorage flag cannot bypass the auth gate', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('k2_admin_session', 'true'))
    await page.goto('/admin-portal-k2-secure')
    await expect(page.getByText('Staff sign-in')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Multi-channel action center/i)).toHaveCount(0)
  })

  test('backend-not-configured sign-in fails clearly', async ({ page }) => {
    await page.goto('/admin-portal-k2-secure')
    await page.getByLabel('Email').fill('staff@example.com')
    await page.getByLabel('Password').fill('not-a-real-password')
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    await expect(page.getByRole('alert')).toContainText(/Backend not configured|Invalid login credentials|Invalid email or password/i)
  })
})
