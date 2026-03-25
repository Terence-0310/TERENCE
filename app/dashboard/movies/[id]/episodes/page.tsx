'use client'

// ============================================
// Admin: Episode & Source Management for a Movie
// ============================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff,
  Film, Play, Globe, FileText, ChevronDown, ChevronUp,
  Save, X, AlertTriangle, Check, Link as LinkIcon,
  Subtitles,
} from 'lucide-react'

interface Episode {
  id: string
  episodeNumber: number
  episodeName: string | null
  episodeSlug: string | null
  title: string | null
  streamType: string
  streamUrl: string | null
  status: string
  isActive: boolean
  isPublished: boolean
  sortOrder: number
  movie?: { title: string }
}

interface VideoSource {
  id: string
  episodeId: string
  sourceType: string
  url: string
  label: string
  isPrimary: boolean
  isActive: boolean
}

interface SubtitleTrack {
  id: string
  episodeId: string
  label: string
  lang: string
  url: string
  isDefault: boolean
  isActive: boolean
}

export default function MovieEpisodesPage() {
  const params = useParams()
  const movieId = params.id as string

  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [movieTitle, setMovieTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedEp, setExpandedEp] = useState<string | null>(null)
  const [epSources, setEpSources] = useState<Record<string, VideoSource[]>>({})
  const [epSubtitles, setEpSubtitles] = useState<Record<string, SubtitleTrack[]>>({})

  // Forms
  const [showEpForm, setShowEpForm] = useState(false)
  const [showSourceForm, setShowSourceForm] = useState<string | null>(null)
  const [showSubForm, setShowSubForm] = useState<string | null>(null)
  const [epForm, setEpForm] = useState({ episodeNumber: 1, episodeName: '', episodeSlug: '', title: '', streamType: 'hls', streamUrl: '', status: 'active', isActive: true, isPublished: true })
  const [sourceForm, setSourceForm] = useState({ sourceType: 'hls', url: '', label: 'Main', isPrimary: false, isActive: true })
  const [subForm, setSubForm] = useState({ label: 'Vietnamese', lang: 'vi', url: '', isDefault: false, isActive: true })
  const [formError, setFormError] = useState('')

  const fetchEpisodes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/episodes?movieId=${movieId}&limit=100`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setEpisodes(json.data || [])
      if (json.data?.[0]?.movie?.title) setMovieTitle(json.data[0].movie.title)
    } catch { /* */ }
    setLoading(false)
  }, [movieId])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  async function fetchSources(episodeId: string) {
    try {
      const res = await fetch(`/api/admin/video-sources?episodeId=${episodeId}&limit=100`)
      if (res.ok) {
        const json = await res.json()
        setEpSources(prev => ({ ...prev, [episodeId]: json.data || [] }))
      }
    } catch { /* */ }
  }

  async function fetchSubtitles(episodeId: string) {
    try {
      const res = await fetch(`/api/admin/subtitles?episodeId=${episodeId}&limit=100`)
      if (res.ok) {
        const json = await res.json()
        setEpSubtitles(prev => ({ ...prev, [episodeId]: json.data || [] }))
      }
    } catch { /* */ }
  }

  function toggleExpand(epId: string) {
    if (expandedEp === epId) {
      setExpandedEp(null)
    } else {
      setExpandedEp(epId)
      fetchSources(epId)
      fetchSubtitles(epId)
    }
  }

  async function handleCreateEpisode() {
    setFormError('')
    try {
      const res = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...epForm, movieId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Create failed')
        return
      }
      setShowEpForm(false)
      setEpForm({ episodeNumber: 1, episodeName: '', episodeSlug: '', title: '', streamType: 'hls', streamUrl: '', status: 'active', isActive: true, isPublished: true })
      fetchEpisodes()
    } catch (e) {
      setFormError('Network error')
    }
  }

  async function handleCreateSource(episodeId: string) {
    setFormError('')
    try {
      const res = await fetch('/api/admin/video-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sourceForm, episodeId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Create failed')
        return
      }
      setShowSourceForm(null)
      setSourceForm({ sourceType: 'hls', url: '', label: 'Main', isPrimary: false, isActive: true })
      fetchSources(episodeId)
    } catch {
      setFormError('Network error')
    }
  }

  async function handleCreateSubtitle(episodeId: string) {
    setFormError('')
    try {
      const res = await fetch('/api/admin/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subForm, episodeId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Create failed')
        return
      }
      setShowSubForm(null)
      setSubForm({ label: 'Vietnamese', lang: 'vi', url: '', isDefault: false, isActive: true })
      fetchSubtitles(episodeId)
    } catch {
      setFormError('Network error')
    }
  }

  async function handleDeleteSource(sourceId: string, episodeId: string) {
    if (!confirm('Xóa video source này?')) return
    await fetch(`/api/admin/video-sources?id=${sourceId}`, { method: 'DELETE' })
    fetchSources(episodeId)
  }

  async function handleDeleteSubtitle(subId: string, episodeId: string) {
    if (!confirm('Xóa subtitle này?')) return
    await fetch(`/api/admin/subtitles?id=${subId}`, { method: 'DELETE' })
    fetchSubtitles(episodeId)
  }

  async function toggleSourcePrimary(sourceId: string, episodeId: string) {
    await fetch(`/api/admin/video-sources?id=${sourceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    fetchSources(episodeId)
  }

  async function toggleSourceActive(sourceId: string, isActive: boolean, episodeId: string) {
    await fetch(`/api/admin/video-sources?id=${sourceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchSources(episodeId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/movies" className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Quản lý tập phim</h1>
            {movieTitle && <p className="text-sm text-white/50">{movieTitle}</p>}
          </div>
        </div>
        <button
          onClick={() => setShowEpForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Thêm tập
        </button>
      </div>

      {formError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {formError}
        </div>
      )}

      {/* New Episode Form */}
      {showEpForm && (
        <div className="rounded-xl bg-card border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Tạo tập mới</h3>
            <button onClick={() => setShowEpForm(false)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Số tập</label>
              <input type="number" value={epForm.episodeNumber} onChange={e => setEpForm(p => ({ ...p, episodeNumber: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Tên tập</label>
              <input type="text" value={epForm.episodeName} onChange={e => setEpForm(p => ({ ...p, episodeName: e.target.value }))} placeholder="Tập 1"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Slug</label>
              <input type="text" value={epForm.episodeSlug} onChange={e => setEpForm(p => ({ ...p, episodeSlug: e.target.value }))} placeholder="tap-1"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Stream Type</label>
              <select value={epForm.streamType} onChange={e => setEpForm(p => ({ ...p, streamType: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none">
                <option value="hls">HLS (.m3u8)</option>
                <option value="mp4">MP4</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreateEpisode}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90">
            <Save className="h-4 w-4" />
            Tạo tập
          </button>
        </div>
      )}

      {/* Episode list */}
      {episodes.length === 0 ? (
        <div className="rounded-xl bg-card border border-white/[0.06] p-12 text-center">
          <Film className="h-10 w-10 mx-auto text-white/20 mb-3" />
          <p className="text-sm text-white/50">Chưa có tập nào. Nhấn "Thêm tập" để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map(ep => (
            <div key={ep.id} className="rounded-xl bg-card border border-white/[0.06] overflow-hidden">
              {/* Episode header */}
              <button
                onClick={() => toggleExpand(ep.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${ep.isActive ? 'bg-primary/10 text-primary' : 'bg-white/5 text-white/30'}`}>
                    {ep.episodeNumber}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{ep.episodeName || `Tập ${ep.episodeNumber}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ep.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {ep.status}
                      </span>
                      <span className="text-[10px] text-white/30">{ep.streamType.toUpperCase()}</span>
                      {ep.episodeSlug && <span className="text-[10px] text-white/20">{ep.episodeSlug}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ep.isActive ? <Eye className="h-3.5 w-3.5 text-green-400/60" /> : <EyeOff className="h-3.5 w-3.5 text-white/20" />}
                  {expandedEp === ep.id ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                </div>
              </button>

              {/* Expanded content */}
              {expandedEp === ep.id && (
                <div className="border-t border-white/[0.04] px-5 py-4 space-y-4">
                  {/* Video Sources */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5" /> Nguồn phát
                      </h4>
                      <button onClick={() => setShowSourceForm(showSourceForm === ep.id ? null : ep.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition">
                        <Plus className="h-3 w-3" /> Thêm source
                      </button>
                    </div>

                    {/* Add source form */}
                    {showSourceForm === ep.id && (
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4 mb-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-white/50 mb-1">URL (.m3u8 hoặc .mp4)</label>
                            <input type="url" value={sourceForm.url} onChange={e => setSourceForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..."
                              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-white/50 mb-1">Label</label>
                            <input type="text" value={sourceForm.label} onChange={e => setSourceForm(p => ({ ...p, label: e.target.value }))} placeholder="1080p"
                              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-white/50 mb-1">Type</label>
                            <select value={sourceForm.sourceType} onChange={e => setSourceForm(p => ({ ...p, sourceType: e.target.value }))}
                              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:border-primary/50 focus:outline-none">
                              <option value="hls">HLS (.m3u8)</option>
                              <option value="mp4">MP4</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-4 pt-4">
                            <label className="flex items-center gap-1.5 text-xs text-white/60">
                              <input type="checkbox" checked={sourceForm.isPrimary} onChange={e => setSourceForm(p => ({ ...p, isPrimary: e.target.checked }))}
                                className="rounded border-white/20" />
                              Primary
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-white/60">
                              <input type="checkbox" checked={sourceForm.isActive} onChange={e => setSourceForm(p => ({ ...p, isActive: e.target.checked }))}
                                className="rounded border-white/20" />
                              Active
                            </label>
                          </div>
                        </div>
                        <button onClick={() => handleCreateSource(ep.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90">
                          <Save className="h-3 w-3" /> Lưu source
                        </button>
                      </div>
                    )}

                    {/* Source list */}
                    {(epSources[ep.id] || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {epSources[ep.id].map(src => (
                          <div key={src.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {src.isPrimary && <span className="flex-shrink-0 text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">PRIMARY</span>}
                              <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${src.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {src.isActive ? 'ACTIVE' : 'DISABLED'}
                              </span>
                              <span className="text-[10px] text-white/30 flex-shrink-0">{src.sourceType.toUpperCase()}</span>
                              <span className="text-[10px] text-white/50 flex-shrink-0">{src.label}</span>
                              <span className="text-[10px] text-white/20 truncate">{src.url}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              {!src.isPrimary && (
                                <button onClick={() => toggleSourcePrimary(src.id, ep.id)} title="Set as primary"
                                  className="rounded p-1 text-white/30 hover:text-primary hover:bg-primary/10 transition">
                                  <Check className="h-3 w-3" />
                                </button>
                              )}
                              <button onClick={() => toggleSourceActive(src.id, src.isActive, ep.id)} title={src.isActive ? 'Disable' : 'Enable'}
                                className="rounded p-1 text-white/30 hover:text-yellow-400 hover:bg-yellow-400/10 transition">
                                {src.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              <button onClick={() => handleDeleteSource(src.id, ep.id)} title="Delete"
                                className="rounded p-1 text-white/30 hover:text-red-400 hover:bg-red-400/10 transition">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 italic">Chưa có video source nào</p>
                    )}
                  </div>

                  {/* Subtitles */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                        <Subtitles className="h-3.5 w-3.5" /> Phụ đề
                      </h4>
                      <button onClick={() => setShowSubForm(showSubForm === ep.id ? null : ep.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition">
                        <Plus className="h-3 w-3" /> Thêm phụ đề
                      </button>
                    </div>

                    {/* Add subtitle form */}
                    {showSubForm === ep.id && (
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4 mb-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-white/50 mb-1">URL (.vtt)</label>
                            <input type="url" value={subForm.url} onChange={e => setSubForm(p => ({ ...p, url: e.target.value }))} placeholder="https://...file.vtt"
                              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-white/50 mb-1">Label</label>
                            <input type="text" value={subForm.label} onChange={e => setSubForm(p => ({ ...p, label: e.target.value }))} placeholder="Vietnamese"
                              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-white/50 mb-1">Language Code</label>
                            <input type="text" value={subForm.lang} onChange={e => setSubForm(p => ({ ...p, lang: e.target.value }))} placeholder="vi"
                              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none" />
                          </div>
                          <div className="flex items-center gap-4 pt-4">
                            <label className="flex items-center gap-1.5 text-xs text-white/60">
                              <input type="checkbox" checked={subForm.isDefault} onChange={e => setSubForm(p => ({ ...p, isDefault: e.target.checked }))}
                                className="rounded border-white/20" />
                              Default
                            </label>
                          </div>
                        </div>
                        <button onClick={() => handleCreateSubtitle(ep.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90">
                          <Save className="h-3 w-3" /> Lưu phụ đề
                        </button>
                      </div>
                    )}

                    {/* Subtitle list */}
                    {(epSubtitles[ep.id] || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {epSubtitles[ep.id].map(sub => (
                          <div key={sub.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                            <div className="flex items-center gap-2">
                              {sub.isDefault && <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">DEFAULT</span>}
                              <span className="text-xs text-white/70">{sub.label}</span>
                              <span className="text-[10px] text-white/30">[{sub.lang}]</span>
                              <span className="text-[10px] text-white/20 truncate max-w-48">{sub.url}</span>
                            </div>
                            <button onClick={() => handleDeleteSubtitle(sub.id, ep.id)} title="Delete"
                              className="rounded p-1 text-white/30 hover:text-red-400 hover:bg-red-400/10 transition">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 italic">Chưa có phụ đề nào</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
