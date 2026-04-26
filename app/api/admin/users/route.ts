import { UsersController } from '@/src/be/modules/users/users.controller'

export const GET = UsersController.getPaginated
export const POST = UsersController.create
