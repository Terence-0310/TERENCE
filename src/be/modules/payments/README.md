# Payments Module

## What's actually in production

- **VietQR + SePay bank webhook**: implemented in `payments.service.ts`,
  `sepay.ts`, `vietqr.ts`, and the HTTP route `app/api/payments/sepay/webhook/route.ts`.
  This is the live payment path used to top up TCoin wallets.

## What's a stub

- `payments.types.ts` declares a generic `PaymentProvider` interface and a
  `PaymentIntent` shape. **No provider implements it.** The interface dates from an
  earlier "pluggable payment providers" idea that never shipped — the SePay flow is
  hardcoded directly in `PaymentsService` instead.

## Decision needed

Either:
- **(a)** Refactor `PaymentsService.processSePayWebhook` to satisfy `PaymentProvider`
  so future providers (Momo, ZaloPay, …) can be plugged in.
- **(b)** Delete `PaymentProvider` and `PaymentIntent` and treat the module as
  SePay-specific (which it effectively already is).

Until then, treat `payments.types.ts` as a stub. Don't add new code that depends on
`PaymentProvider` — it won't be honored.
