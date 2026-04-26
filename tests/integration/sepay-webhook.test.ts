import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '@/tests/helpers/mock-request'
import { createMockPrisma, type MockPrisma } from '@/tests/helpers/mock-prisma'

// ── Mock dependencies ──
let mockPrisma: MockPrisma

const { mockMarkOrderPaid } = vi.hoisted(() => ({
  mockMarkOrderPaid: vi.fn(),
}))

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma }
}))

vi.mock('@/src/be/services/topup-order.service', () => ({
  markOrderPaid: mockMarkOrderPaid,
}))

import { POST as sepayWebhookRoute } from '@/app/api/webhooks/sepay/route'

describe('POST /api/webhooks/sepay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    process.env.SEPAY_WEBHOOK_SECRET = 'secret123'
    
    // Mock default successful log creation
    mockPrisma.bankWebhookLog.create.mockResolvedValue({ id: 'log-1' })
  })

  function createReq(body: any, auth: string | null = 'Apikey secret123') {
    return createMockRequest('/api/webhooks/sepay', {
      method: 'POST',
      headers: auth ? { 'authorization': auth } : {},
      body
    })
  }

  it('should return 401 if auth header is missing or incorrect', async () => {
    const req = createReq({ transferType: 'in' }, 'Apikey WRONG')
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<any>(res)

    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Invalid Webhook Secret')
  })

  it('should log and ignore if transferType is not "in"', async () => {
    const req = createReq({ transferType: 'out', transferAmount: 1000 })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<any>(res)

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
    const { status, body } = await parseResponse<any>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: No order code in content')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { error: 'No matching order code in content', processed: true, transactionId: '' }
    })
  })

  it('should log and ignore if order is not found', async () => {
    mockPrisma.topupOrder.findUnique.mockResolvedValue(null)
    const req = createReq({ transferType: 'in', transferAmount: 10000, content: 'TCOIN_INVALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<any>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: Order not found')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { error: 'Order not found', processed: true } })
    )
  })

  it('should log and ignore if order is not PENDING', async () => {
    mockPrisma.topupOrder.findUnique.mockResolvedValue({ status: 'PAID', amountVnd: 10000 })
    const req = createReq({ transferType: 'in', transferAmount: 10000, content: 'TCOIN_VALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<any>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: Order already processed or expired')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { error: 'Order status is PAID', processed: true } })
    )
  })

  it('should log and ignore if transfer amount is insufficient', async () => {
    mockPrisma.topupOrder.findUnique.mockResolvedValue({ status: 'PENDING', amountVnd: 50000 })
    const req = createReq({ transferType: 'in', transferAmount: 20000, content: 'TCOIN_VALID' })
    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<any>(res)

    expect(status).toBe(200)
    expect(body.data?.message).toBe('Ignored: Insufficient amount')
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { error: 'Insufficient amount: received 20000, required 50000', processed: true } })
    )
  })

  it('should process webhook and mark order as paid on success', async () => {
    mockPrisma.topupOrder.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING', amountVnd: 50000 })
    mockMarkOrderPaid.mockResolvedValue({})

    const req = createReq({ 
      id: 'txn-123',
      transferType: 'in', 
      transferAmount: 50000, 
      content: 'NAP TIEN TCOIN_A1B2C3',
      accountNumber: '123456789'
    })

    const res = await sepayWebhookRoute(req)
    const { status, body } = await parseResponse<any>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    
    // Verify markOrderPaid was called correctly
    expect(mockMarkOrderPaid).toHaveBeenCalledWith('order-1', {
      matchedBankTxnId: 'txn-123',
      matchedBankAccount: '123456789',
      matchedBankAmount: 50000,
      matchedBankContent: 'NAP TIEN TCOIN_A1B2C3',
      provider: 'SEPAY',
      rawPayload: expect.any(Object)
    })

    // Verify log was marked as processed successfully
    expect(mockPrisma.bankWebhookLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { processed: true, error: null }
    })
  })
})
