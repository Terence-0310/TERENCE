import { EpisodesController } from '@/src/be/modules/episodes/episodes.controller'

export const GET = EpisodesController.getPaginated
export const POST = EpisodesController.create
