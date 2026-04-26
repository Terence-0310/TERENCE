import { UsersController } from '@/src/be/modules/users/users.controller'

export const GET = UsersController.getById
export const PATCH = UsersController.update
export const PUT = UsersController.update
export const DELETE = UsersController.delete
