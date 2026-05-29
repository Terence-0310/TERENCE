import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/src/be/shared/db/prisma'
import { formatRelativeDate } from '@/src/be/modules/news/format'
import { NewsArticleGrid } from '@/src/fe/components/news/NewsArticleCard'
import { getTopEntertainmentNews } from '@/src/be/modules/news/news.service'
import { ArrowLeft, Calendar, Eye, Sparkles, User } from 'lucide-react'

// Force dynamic so newly published / edited posts surface immediately.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ slug: string }>
}

async function loadPost(slug: string) {
  return prisma.newsPost.findUnique({ where: { slug } })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post || post.status !== 'published') return { title: 'Bài viết không tìm thấy' }
  return {
    title: `${post.title} — TERENCE News`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      type: 'article',
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
    },
  }
}

async function RelatedArticles({ excludeSlug }: { excludeSlug: string }) {
  const items = await getTopEntertainmentNews({ limit: 8 }).catch(() => [])
  const filtered = items.filter((a) => a.url !== `/news/${excludeSlug}`).slice(0, 3)
  if (filtered.length === 0) return null
  return <NewsArticleGrid articles={filtered} compact />
}

// Render the article body. Paragraphs are split on blank lines so the AI
// writer's 3-4 paragraph layout reads as a proper editorial piece.
function ArticleBody({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    <div className="article-body space-y-5 text-base md:text-[17px] leading-[1.8] text-white/85">
      {paragraphs.map((para, i) => (
        <p key={i} className={i === 0 ? 'first-letter:text-4xl first-letter:font-extrabold first-letter:mr-1 first-letter:float-left first-letter:leading-[1] first-letter:text-primary' : ''}>
          {para}
        </p>
      ))}
    </div>
  )
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post || post.status !== 'published') notFound()

  // Fire-and-forget view increment.
  prisma.newsPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  const publishedAt = post.publishedAt ?? post.createdAt
  const rawTags = post.tags?.split(',').map((t) => t.trim()).filter(Boolean) ?? []
  // The AI generator stores the TMDB poster URL as a `poster:<url>` tag so
  // the detail page can render it as a sidebar visual without a schema
  // migration. We strip that marker from the displayed tag list.
  const posterTag = rawTags.find((t) => t.startsWith('poster:'))
  const posterUrl = posterTag ? posterTag.slice('poster:'.length) : null
  const tags = rawTags.filter((t) => !t.startsWith('poster:'))
  const isAi = !post.authorId

  return (
    <main className="min-h-screen bg-background">
      {/* ── Full-bleed hero ── */}
      <header className="relative w-full">
        {post.coverImage ? (
          <div className="relative w-full h-[55vh] min-h-[420px] max-h-[680px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Vignette + bottom fade so title remains readable on any image */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.5)_100%)]" />

            {/* Back link */}
            <div className="absolute top-6 left-0 right-0 px-4 md:px-8">
              <div className="mx-auto max-w-5xl">
                <Link
                  href="/news"
                  className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition rounded-full bg-black/40 backdrop-blur-sm border border-white/10 px-3 py-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại Tin tức
                </Link>
              </div>
            </div>

            {/* Title + meta anchored to the bottom of the hero */}
            <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-10 md:pb-14">
              <div className="mx-auto max-w-5xl">
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                  {isAi ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 border border-primary/30 backdrop-blur-sm">
                      <Sparkles className="h-3 w-3" />
                      AI biên soạn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/80 px-2.5 py-1 border border-white/15 backdrop-blur-sm">
                      <User className="h-3 w-3" />
                      Biên tập viên
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/80 px-2.5 py-1 border border-white/15 backdrop-blur-sm">
                    <Calendar className="h-3 w-3" />
                    {formatRelativeDate(publishedAt.toISOString())}
                  </span>
                  {post.viewCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/80 px-2.5 py-1 border border-white/15 backdrop-blur-sm">
                      <Eye className="h-3 w-3" />
                      {post.viewCount.toLocaleString('vi-VN')} lượt xem
                    </span>
                  )}
                </div>
                <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-[1.1] tracking-tight max-w-4xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-3xl drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // No cover image — show a simple text header.
          <div className="px-4 md:px-8 pt-10 pb-8">
            <div className="mx-auto max-w-3xl">
              <Link
                href="/news"
                className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại Tin tức
              </Link>
              <h1 className="text-white text-3xl md:text-4xl font-extrabold leading-tight">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="mt-3 text-base text-white/60 leading-relaxed">{post.excerpt}</p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Article body ── */}
      <div className="px-4 md:px-8 py-10 md:py-14">
        <div className={`mx-auto ${posterUrl ? 'max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10' : 'max-w-3xl'}`}>
          <article>
            <ArticleBody content={post.content ?? ''} />

            {tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/40 mr-1">Tags:</span>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-card/40 px-3 py-1 text-xs text-white/70 hover:border-primary/30 hover:text-primary transition cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author footer — small block to give the article finality */}
            <div className="mt-12 rounded-2xl border border-white/[0.06] bg-card/30 p-5 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isAi ? 'bg-primary/15 text-primary' : 'bg-white/10 text-white'}`}>
                {isAi ? <Sparkles className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {isAi ? 'TERENCE AI Editor' : 'Biên tập viên Terence'}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {isAi
                    ? 'Bài viết tự sinh dựa trên dữ liệu phim TMDB. Có thể không tránh khỏi sai sót — vui lòng kiểm tra trước khi trích dẫn.'
                    : 'Bài viết biên tập tay cho cộng đồng yêu phim TERENCE.'}
                </p>
              </div>
            </div>
          </article>

          {/* Poster sidebar (only when the AI generator stored a TMDB poster) */}
          {posterUrl && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/30 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterUrl}
                    alt={`Poster ${post.title}`}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                      Poster phim
                    </p>
                    <p className="text-sm font-semibold text-white leading-snug line-clamp-3">
                      {post.title}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-white/30 leading-relaxed">
                  Hình ảnh từ TMDB. Bản quyền thuộc nhà phát hành phim.
                </p>
              </div>
            </aside>
          )}
        </div>

        <div className={`mx-auto ${posterUrl ? 'max-w-6xl' : 'max-w-3xl'} mt-2`}>
          {/* ── Related ── */}
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-bold text-white">Bài đọc thêm</h2>
            <Suspense
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl skeleton" />
                  ))}
                </div>
              }
            >
              <RelatedArticles excludeSlug={slug} />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  )
}
