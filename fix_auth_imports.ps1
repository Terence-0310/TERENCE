(Get-Content -Path "app\api\tcoin\overview\route.ts") -replace '@/app/api/auth/\[\.\.\.nextauth\]/route', '@/lib/auth' | Set-Content -Path "app\api\tcoin\overview\route.ts"
(Get-Content -Path "app\api\tcoin\topup\create-bank-order\route.ts") -replace '@/app/api/auth/\[\.\.\.nextauth\]/route', '@/lib/auth' | Set-Content -Path "app\api\tcoin\topup\create-bank-order\route.ts"
(Get-Content -Path "app\api\tcoin\transactions\route.ts") -replace '@/app/api/auth/\[\.\.\.nextauth\]/route', '@/lib/auth' | Set-Content -Path "app\api\tcoin\transactions\route.ts"
