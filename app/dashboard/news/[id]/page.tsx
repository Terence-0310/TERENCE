'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { NewsForm } from '@/src/fe/components/admin/NewsForm'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function EditNewsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/news/${id}`)
        const json = await res.json()
        const post = json.data
        
        if (res.ok && post) {
          setData(post)
        } else {
          toast.error('Không tìm thấy bài viết')
          router.push('/dashboard/news')
        }
      } catch {
        toast.error('Lỗi khi tải dữ liệu bài viết')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  return <NewsForm initialData={data} />
}
