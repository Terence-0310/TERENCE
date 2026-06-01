import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'
import { createMockPrisma, type MockPrisma } from '@/tests/helpers/mock-prisma'

// ── Mock dependencies ──
let mockPrisma: MockPrisma

const { mockMarkOrderPaid, mockFindOrder } = vi.hoisted(() => ({
  mockMarkOrderPaid: vi.fn(),
  mockFindOrder: vi.fn(),
}))

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma }
}))

vi.mock('@/src/be/services/topup-order.service', () => ({
  markOrderPaid: mockMarkOrderPaid,
  // The controller now resolves orders via findOrderByBankContent (normalised
  // matching, tolerant of banks stripping the underscore) instead of an exact
  // prisma.topupOrder.findFirst lookup. Mock it directly.
  findOrderByBankContent: mockFindOrder,
}))

import { POST as sepayWebhookRoute } from '@/app/api/webhooks/sepay/route'

// These tests cover the legacy mirror endpoint at /api/webhooks/sepay. The
// controller was rewritten to:
//  - accept SEPAY_WEBHOOK_API_KEY (fallback SEPAY_WEBHOOK_SECRET)
//  - look up orders by `transferContent` (supports new TCOIN_<u6>_<ts> codes)
//  - never persist the raw Authorization header (replaced with a redacted marker)
//  - emit lower-cased "ignored: ..." messages
// Tests below were updated to mirror that contract.
describe('POST /api/webhooks/sepay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    process.env.SEPAY_WEBHOOK_API_KEY = 'secret123'
    delete process.env.SEPAY_WEBHOOK_SECRET

    // Default: create a log row, then allow updates.
    mockPrisma.bankWebhookLog.create.mockResolvedValue({ id: 'log-1' })
    mockPrisma.bankWebhookLog.update.mockResolvedValue({ id: 'log-1' })
  })

  function createReq(body: unknown, auth: string | null = 'Apikey secret123') {
    return createMockRequest('/api/webhooks/sepay', {
      method: 'POST',
      headers: auth ? { 'authorization': auth } : {},
      body
    })
  }

  it('should return 401 if auth header is missing or incorrect', async () => {
    const req = createReq({ transferType: 'in' }, 'Apikey WRONG')
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ success: boolean; error: string }>(res)

    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Invalid Webhook Secret')
  })

  it('should log and ignore if transferType is not "in"', async () => {
    const req = createReq({ transferType: 'out', transferAmount: 1000 })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ data?: { message?: string } }>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored non-in transfer')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { error: 'Ignored: transferType is not "in"', processed: true }
    })
  })

  it('should log and ignore if no matching order code in content', async () => {
    const req = createReq({ transferType: 'in', transferAmount: 10000, content: 'CHUYEN TIEN NHA' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ data?: { message?: string } }>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: no order code in content')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { error: 'No matching order code in content', processed: true }
    })
  })

  it('should log and ignore if order is not found', async () => {
    mockFindOrder.mockResolvedValue(null)
    const req = createReq({ transferType: 'in', transferAmount: 10000, content: 'TCOIN_INVALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ data?: { message?: string } }>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: order not found')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { error: 'Order not found', processed: true } })
    )
  })

  it('should ignore (idempotent) if order is already PAID with same txn', async () => {
    mockFindOrder.mockResolvedValue({
      id: 'order-1',
      status: 'PAID',
      amountVnd: 10000,
      matchedBankTxnId: 'txn-1',
    })
    const req = createReq({ id: 'txn-1', transferType: 'in', transferAmount: 10000, content: 'TCOIN_VALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ data?: { message?: string } }>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Already paid')
    expect(mockMarkOrderPaid).not.toHaveBeenCalled()
  })

  it('should log and ignore if order is in a non-PENDING / non-matching-PAID state', async () => {
    mockFindOrder.mockResolvedValue({
      id: 'order-1',
      status: 'EXPIRED',
      amountVnd: 10000,
    })
    const req = createReq({ transferType: 'in', transferAmount: 10000, content: 'TCOIN_VALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ data?: { message?: string } }>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: order is EXPIRED')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { error: 'Order status is EXPIRED', processed: true } })
    )
  })

  it('should log and ignore if transfer amount is insufficient', async () => {
    mockFindOrder.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      amountVnd: 50000,
    })
    const req = createReq({ transferType: 'in', transferAmount: 20000, content: 'TCOIN_VALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ data?: { message?: string } }>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: insufficient amount')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { error: 'Insufficient amount: received 20000, required 50000', processed: true },
      })
    )
  })

  it('should process webhook and mark order as paid on success', async () => {
    mockFindOrder.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      amountVnd: 50000,
    })
    mockMarkOrderPaid.mockResolvedValue({})

    const req = createReq({
      id: 'txn-123',
      transferType: 'in',
      transferAmount: 50000,
      content: 'NAP TIEN TCOIN_A1B2C3',
      accountNumber: '123456789'
    })

    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<{ success: boolean }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)

    expect(mockMarkOrderPaid).toHaveBeenCalledWith('order-1', {
      matchedBankTxnId: 'txn-123',
      matchedBankAccount: '123456789',
      matchedBankAmount: 50000,
      matchedBankContent: 'NAP TIEN TCOIN_A1B2C3',
      provider: 'SEPAY',
      rawPayload: expect.any(Object)
    })

    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { processed: true, error: null }
    })
  })

  it('accepts x-api-key header as an alternative to Authorization', async () => {
    mockFindOrder.mockResolvedValue(null)
    const req = createMockRequest('/api/webhooks/sepay', {
      method: 'POST',
      headers: { 'x-api-key': 'secret123' },
      body: { transferType: 'in', transferAmount: 10000, content: 'no code here' },
    })
    const res = await sepayWebhookRoute(req)
    const { status } = await parseResponse(res)

    // Reaches the "no code" branch ⇒ auth passed.
    expect(status).toBe(200)
  })
})
