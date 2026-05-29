'use client'

import dynamic from 'next/dynamic'
import { useMemo, type ComponentProps } from 'react'
// `react-quill-new` is the maintained fork that supports React 18 & 19.
// The original `react-quill@2.x` uses the removed `findDOMNode` API and
// crashes on React 19, taking the whole /dashboard/news/[id] page down via
// the dashboard error boundary. The new package is API-compatible — only
// the import path changes.
import 'react-quill-new/dist/quill.snow.css'
import { Skeleton } from '@/src/fe/components/ui/skeleton'

// `dynamic()` loses prop inference when the imported module's default export
// is a class with a namespaced prop type, so feed it the prop type explicitly
// via ComponentProps — preserves type-safety on `theme`, `modules`, etc.
type ReactQuillProps = ComponentProps<typeof import('react-quill-new')['default']>

// Dynamically import so SSR doesn't try to access `document`.
const ReactQuill = dynamic<ReactQuillProps>(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-64 rounded-md" />
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link', 'image', 'video'
  ]

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill 
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Nhập nội dung bài viết...'}
        className="bg-background rounded-md text-foreground"
      />
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          border-color: var(--border);
          background-color: var(--muted);
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border-color: var(--border);
          min-height: 250px;
          font-family: inherit;
          font-size: 1rem;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 250px;
        }
        .dark .rich-text-editor-wrapper .ql-stroke {
          stroke: #e2e8f0;
        }
        .dark .rich-text-editor-wrapper .ql-fill {
          fill: #e2e8f0;
        }
        .dark .rich-text-editor-wrapper .ql-picker {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  )
}
