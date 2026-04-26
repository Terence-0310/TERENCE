import { NextRequest } from 'next/server'
import { UsersPublicController } from '@/src/be/modules/users/users.public.controller'

export async function GET(req: NextRequest) {
  return UsersPublicController.getProfile(req)
}

export async function PATCH(req: NextRequest) {
  return UsersPublicController.updateProfile(req)
}
