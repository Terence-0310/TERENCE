/**
 * Làm sạch chuỗi đầu vào để chống SQL/NoSQL Injection và DoS.
 * - Cắt bỏ chuỗi quá dài (mặc định 100 ký tự).
 * - Loại bỏ các ký tự đặc biệt của Elasticsearch (Lucene syntax).
 * - Loại bỏ ký tự wildcard của SQL (%, _).
 */
export function sanitizeSearchQuery(query: string, maxLength = 100): string {
  if (!query || typeof query !== 'string') return ''

  // 1. Giới hạn độ dài để chống ReDoS và Slow DB Queries
  let safeQuery = query.substring(0, maxLength)

  // 2. Loại bỏ ký tự wildcard SQL (%, _) để tránh lỗi full-table scan khi dùng tính năng "contains" trong Prisma
  safeQuery = safeQuery.replace(/[%_]/g, ' ')

  // 3. Loại bỏ ký tự đặc biệt của Elasticsearch
  // Các ký tự: + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
  const esReservedChars = /[+\-=><!(){}\[\]^"~*?:\/\\|&]/g
  safeQuery = safeQuery.replace(esReservedChars, ' ')

  // 4. Xóa khoảng trắng thừa
  return safeQuery.replace(/\s+/g, ' ').trim()
}
