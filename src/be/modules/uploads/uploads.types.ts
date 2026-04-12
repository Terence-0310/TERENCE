// ============================================
// Uploads Module — Types
// ============================================

export interface UploadResult {
  url: string
  filename: string
  size: number
  mimeType: string
}

export interface UploadConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  destination: string
}
