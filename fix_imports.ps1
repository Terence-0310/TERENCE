(Get-Content -Path "services\wallet.service.ts") -replace '@/lib/prisma', '@/lib/db/prisma' | Set-Content -Path "services\wallet.service.ts"
(Get-Content -Path "services\topup-order.service.ts") -replace '@/lib/prisma', '@/lib/db/prisma' | Set-Content -Path "services\topup-order.service.ts"

(Get-Content -Path "app\api\tcoin\overview\route.ts") -replace '@/src/services/wallet.service', '@/services/wallet.service' -replace '@/lib/prisma', '@/lib/db/prisma' | Set-Content -Path "app\api\tcoin\overview\route.ts"
(Get-Content -Path "app\api\tcoin\topup\create-bank-order\route.ts") -replace '@/src/services/topup-order.service', '@/services/topup-order.service' | Set-Content -Path "app\api\tcoin\topup\create-bank-order\route.ts"
(Get-Content -Path "app\api\tcoin\orders\[id]\route.ts") -replace '@/src/services/topup-order.service', '@/services/topup-order.service' | Set-Content -Path "app\api\tcoin\orders\[id]\route.ts"
(Get-Content -Path "app\api\payments\sepay\webhook\route.ts") -replace '@/src/lib/payments/sepay', '@/lib/payments/sepay' -replace '@/lib/prisma', '@/lib/db/prisma' -replace '@/src/services/topup-order.service', '@/services/topup-order.service' | Set-Content -Path "app\api\payments\sepay\webhook\route.ts"
(Get-Content -Path "app\api\tcoin\transactions\route.ts") -replace '@/src/services/wallet.service', '@/services/wallet.service' | Set-Content -Path "app\api\tcoin\transactions\route.ts"
