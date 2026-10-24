#!/usr/bin/env node
// ============================================
// TERENCE — Docs Check Script
// ============================================
// Kiểm tra xem có file code quan trọng thay đổi mà README.md
// chưa được cập nhật không.
//
// Usage:
//   npm run docs:check
//
// Exit codes:
//   0 = OK (README đã được cập nhật hoặc không cần)
//   1 = WARNING (có thay đổi code quan trọng, README chưa cập nhật)

import { execSync } from 'child_process'

const WATCHED_PATHS = [
  'app/api/',
  'src/be/',
  'src/dta/prisma/schema.prisma',
  'src/constants/',
  'lib/env.ts',
  'proxy.ts',
  'server.ts',
  'next.config.mjs',
  'package.json',
]

function getChangedFiles() {
  // Staged + unstaged changes against the last commit. stderr is piped, so no
  // shell redirection is needed (keeps this working under cmd.exe too).
  try {
    const output = execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return output ? output.split(/\r?\n/).filter(Boolean) : []
  } catch {
    return []
  }
}

function main() {
  console.log('📝 TERENCE Docs Check')
  console.log('─'.repeat(50))

  const changedFiles = getChangedFiles()

  if (changedFiles.length === 0) {
    console.log('✅ Không có file thay đổi.')
    process.exit(0)
  }

  // Check if README.md is in the changed files
  const readmeChanged = changedFiles.some(f => f === 'README.md')

  // Check if any watched path has changes
  const watchedChanges = changedFiles.filter(f =>
    WATCHED_PATHS.some(w => f.startsWith(w) || f === w)
  )

  if (watchedChanges.length === 0) {
    console.log('✅ Không có thay đổi trong các thư mục quan trọng.')
    process.exit(0)
  }

  console.log(`\n📂 File quan trọng đã thay đổi (${watchedChanges.length}):`)
  watchedChanges.forEach(f => console.log(`   • ${f}`))

  if (readmeChanged) {
    console.log('\n✅ README.md đã được cập nhật. Tốt lắm!')
    process.exit(0)
  }

  console.log('\n⚠️  CẢNH BÁO: Có thay đổi code quan trọng nhưng README.md chưa được cập nhật!')
  console.log('   Hãy kiểm tra xem README.md có cần cập nhật không.')
  console.log('')
  console.log('   Nếu không cần cập nhật README (fix bug nhỏ), bỏ qua cảnh báo này.')
  console.log('')

  // Exit with warning code (non-zero for CI, but not blocking)
  process.exit(1)
}

main()
