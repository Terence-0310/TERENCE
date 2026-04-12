// ============================================
// Uploads Module — Service
// ============================================

import { handleFileUpload } from '@/src/be/modules/uploads/legacy-upload'
import { prisma } from '@/src/be/shared/db/prisma'

export const UploadsService = {
  handleFileUpload,

  async getPaginatedUploads(skip: number, limit: number) {
    return Promise.all([
      prisma.upload.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.upload.count(),
    ])
  }
}

