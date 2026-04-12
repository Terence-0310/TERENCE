// ============================================
// Payments Module — Types (Stub)
// ============================================

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  userId: string
  createdAt: Date
}

export interface PaymentProvider {
  name: string
  processPayment(amount: number, currency: string): Promise<PaymentIntent>
}
