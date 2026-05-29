import { Button } from '@/src/fe/components/ui/button'

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UserPaginationProps {
  pagination: PaginationData
  onPageChange: (page: number) => void
}

export function UserPagination({ pagination, onPageChange }: UserPaginationProps) {
  const { page, total, totalPages } = pagination

  if (total === 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Trang {page}/{totalPages || 1} — Tổng {total} người dùng
      </p>
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="w-8 h-8" 
          disabled={page <= 1} 
          onClick={() => onPageChange(1)}
        >
          «
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="w-8 h-8" 
          disabled={page <= 1} 
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </Button>
        
        {/* Trang hiện tại */}
        <div className="px-3 py-1 text-sm font-medium bg-primary text-white rounded-md mx-1 shadow-sm">
          {page}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="w-8 h-8" 
          disabled={page >= totalPages} 
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="w-8 h-8" 
          disabled={page >= totalPages} 
          onClick={() => onPageChange(totalPages)}
        >
          »
        </Button>
      </div>
    </div>
  )
}
