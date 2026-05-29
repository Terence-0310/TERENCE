import { Check, X, ShieldAlert } from 'lucide-react'

export interface PendingRequest {
  userId: string
  displayName: string
  socketId: string
}

interface HostApprovalListProps {
  requests: PendingRequest[]
  onApprove?: (userId: string, socketId: string) => void
  onReject?: (userId: string, socketId: string) => void
}

export function HostApprovalList({ requests, onApprove, onReject }: HostApprovalListProps) {
  if (!requests || requests.length === 0) return null

  return (
    <div className="space-y-3 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-500/90">
            Yêu cầu chờ duyệt ({requests.length})
          </h4>
        </div>
      </div>
      
      <div className="space-y-2">
        {requests.map((req, i) => (
          <div 
            key={req.userId} 
            className="group flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5 transition-all hover:bg-amber-500/[0.08] hover:border-amber-500/30 shadow-sm animate-scale-in"
            style={{ '--i': i } as React.CSSProperties}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-[12px] font-bold text-amber-500 border border-amber-500/20 shadow-inner">
                {(req.displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[13px] font-semibold text-amber-100/90 group-hover:text-white transition-colors">{req.displayName}</span>
                <span className="text-[10px] text-amber-500/60 font-medium">Muốn tham gia phòng</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button 
                onClick={() => onApprove?.(req.userId, req.socketId)} 
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
                title="Chấp nhận"
              >
                <Check className="h-4 w-4" />
              </button>
              <button 
                onClick={() => onReject?.(req.userId, req.socketId)} 
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95"
                title="Từ chối"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
