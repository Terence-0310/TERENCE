import { CatalogRoute } from '@/src/fe/components/shared/CatalogRoute'
import type { Metadata } from 'next'

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; category?: string; page?: string; country?: string }>
}

export const metadata: Metadata = {
  title: 'Phim Lẻ — Terence',
  description: 'Tìm kiếm và khám phá kho phim lẻ phong phú trên Terence.',
}

export default async function MoviesPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <CatalogRoute type="movies" searchParams={params} />
}
