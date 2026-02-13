'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getDocuments, getDocumentSummary, createDocument, updateDocument, deleteDocument, getMediaUrl } from '@/lib/api'

const C = {
  bg: '#0f172a', card: '#1e293b', cardAlt: '#273548', text: '#f8fafc', muted: '#94a3b8',
  border: '#334155', accent: '#6366f1', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', slate: '#475569',
}

const CATEGORIES = [
  { key: '', label: 'All', icon: '📁' },
  { key: 'LEGAL', label: 'Legal', icon: '⚖️' },
  { key: 'INSURANCE', label: 'Insurance', icon: '🛡️' },
  { key: 'POLICY', label: 'Policies', icon: '📋' },
  { key: 'HEALTH_SAFETY', label: 'Health & Safety', icon: '🏥' },
  { key: 'COMPLIANCE', label: 'Compliance', icon: '✅' },
  { key: 'TRAINING', label: 'Training', icon: '🎓' },
  { key: 'HR', label: 'HR', icon: '👥' },
  { key: 'CONTRACT', label: 'Contracts', icon: '📝' },
  { key: 'GENERAL', label: 'General', icon: '📄' },
]

const STATUS_COLORS: Record<string, string> = {
  VALID: C.green, EXPIRING: C.amber, EXPIRED: C.red, MISSING: C.slate,
}
const STATUS_LABELS: Record<string, string> = {
  VALID: 'Valid', EXPIRING: 'Expiring Soon', EXPIRED: 'Expired', MISSING: 'Not Uploaded',
}
const ACCESS_COLORS: Record<string, string> = {
  owner: C.red, manager: C.amber, staff: C.blue,
}
const CAT_COLORS: Record<string, string> = {
  LEGAL: C.red, INSURANCE: C.amber, POLICY: C.purple, HEALTH_SAFETY: C.green,
  COMPLIANCE: C.blue, TRAINING: C.accent, HR: C.purple, CONTRACT: C.slate, GENERAL: C.muted,
}

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editDoc, setEditDoc] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'folders'>('folders')
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params: any = {}
    if (activeCategory) params.category = activeCategory
    if (search) params.search = search
    const [docsRes, sumRes] = await Promise.all([getDocuments(params), getDocumentSummary()])
    setDocs(docsRes.data || [])
    setSummary(sumRes.data || null)
    setLoading(false)
  }, [activeCategory, search])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    let res
    if (editDoc) {
      res = await updateDocument(editDoc.id, fd)
    } else {
      res = await createDocument(fd)
    }
    if (res.error) {
      showToast(`Error: ${res.error}`)
    } else {
      showToast(editDoc ? 'Document updated' : 'Document uploaded')
      setShowUpload(false)
      setEditDoc(null)
      load()
    }
    setUploading(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this document?')) return
    await deleteDocument(id)
    showToast('Document deleted')
    load()
  }

  function openEdit(doc: any) {
    setEditDoc(doc)
    setShowUpload(true)
  }

  function toggleFolder(key: string) {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function getGroupedDocs() {
    const groups: Record<string, any[]> = {}
    for (const cat of CATEGORIES) {
      if (!cat.key) continue
      groups[cat.key] = []
    }
    for (const doc of docs) {
      const key = doc.category || 'GENERAL'
      if (!groups[key]) groups[key] = []
      groups[key].push(doc)
    }
    return groups
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Styles
  const badge = (bg: string, text = '#fff'): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem',
    fontWeight: 700, background: bg + '20', color: bg, border: `1px solid ${bg}40`,
    textTransform: 'uppercase' as const, letterSpacing: '0.03em',
  })

  const statCard = (label: string, value: number, color: string, icon: string) => (
    <div key={label} style={{ background: C.card, borderRadius: 10, padding: '0.75rem 1rem', border: `1px solid ${C.border}`, flex: '1 1 120px', minWidth: 120 }}>
      <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: C.accent, color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Document Vault</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, margin: '2px 0 0' }}>UK legal requirements, policies, certificates & compliance documents</p>
        </div>
        <button onClick={() => { setEditDoc(null); setShowUpload(true) }} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
          + Upload Document
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {statCard('Total', summary.total, C.text, '📁')}
          {statCard('Valid', summary.valid, C.green, '✅')}
          {statCard('Expiring', summary.expiring_soon, C.amber, '⏰')}
          {statCard('Expired', summary.expired, C.red, '❌')}
          {statCard('Missing', summary.missing, C.slate, '📭')}
        </div>
      )}

      {/* Category Tabs + Search + View Toggle */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
              padding: '0.35rem 0.7rem', borderRadius: 8, border: `1px solid ${activeCategory === cat.key ? C.accent : C.border}`,
              background: activeCategory === cat.key ? C.accent + '20' : 'transparent',
              color: activeCategory === cat.key ? C.accent : C.muted, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
            }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setViewMode('folders')} title="Folder view" style={{
            padding: '0.35rem 0.55rem', borderRadius: 8, border: `1px solid ${viewMode === 'folders' ? C.accent : C.border}`,
            background: viewMode === 'folders' ? C.accent + '20' : 'transparent',
            color: viewMode === 'folders' ? C.accent : C.muted, fontSize: '0.8rem', cursor: 'pointer',
          }}>📂</button>
          <button onClick={() => setViewMode('grid')} title="Grid view" style={{
            padding: '0.35rem 0.55rem', borderRadius: 8, border: `1px solid ${viewMode === 'grid' ? C.accent : C.border}`,
            background: viewMode === 'grid' ? C.accent + '20' : 'transparent',
            color: viewMode === 'grid' ? C.accent : C.muted, fontSize: '0.8rem', cursor: 'pointer',
          }}>▦</button>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search documents…"
          style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: '0.8rem', width: 200, outline: 'none', colorScheme: 'dark' }}
        />
      </div>

      {/* Document List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading documents…</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 600 }}>No documents found</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            {activeCategory || search ? 'Try a different filter or search term.' : 'Upload your first document to get started.'}
          </div>
        </div>
      ) : viewMode === 'folders' ? (
        /* ── Folder View ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(() => {
            const grouped = getGroupedDocs()
            return CATEGORIES.filter(c => c.key).map(cat => {
              const catDocs = grouped[cat.key] || []
              if (activeCategory && activeCategory !== cat.key) return null
              if (catDocs.length === 0 && activeCategory) return null
              const isCollapsed = collapsedFolders.has(cat.key)
              const catColor = CAT_COLORS[cat.key] || C.muted
              return (
                <div key={cat.key} style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  {/* Folder header */}
                  <button onClick={() => toggleFolder(cat.key)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 1rem',
                    background: 'none', border: 'none', cursor: 'pointer', color: C.text, textAlign: 'left' as const,
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{isCollapsed ? '📁' : '📂'}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', flex: 1 }}>{cat.icon} {cat.label}</span>
                    <span style={badge(catColor)}>{catDocs.length} {catDocs.length === 1 ? 'doc' : 'docs'}</span>
                    <span style={{ fontSize: '0.7rem', color: C.muted, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>
                  {/* Folder contents */}
                  {!isCollapsed && (
                    <div style={{ borderTop: `1px solid ${C.border}` }}>
                      {catDocs.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: C.muted }}>No documents in this category</div>
                      ) : (
                        catDocs.map((doc: any) => {
                          const st = doc.status || 'VALID'
                          return (
                            <div key={doc.id} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1rem',
                              borderBottom: `1px solid ${C.border}22`,
                              opacity: st === 'MISSING' ? 0.7 : 1,
                            }}>
                              {/* Doc icon */}
                              <span style={{ fontSize: '1rem', marginTop: 2, flexShrink: 0 }}>{doc.file_url ? '📄' : '📋'}</span>
                              {/* Doc info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const }}>{doc.title}</div>
                                {doc.description && (
                                  <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: 2, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{doc.description}</div>
                                )}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                  <span style={badge(STATUS_COLORS[st] || C.muted)}>{STATUS_LABELS[st] || st}</span>
                                  <span style={badge(ACCESS_COLORS[doc.access_level] || C.muted)}>{doc.access_level}+</span>
                                  {doc.file_size_display && <span style={{ fontSize: '0.6rem', color: C.muted, alignSelf: 'center' }}>{doc.file_size_display}</span>}
                                  {doc.expiry_date && (
                                    <span style={{ fontSize: '0.6rem', color: doc.is_expired ? C.red : doc.is_expiring_soon ? C.amber : C.green, fontWeight: 600, alignSelf: 'center' }}>
                                      Exp: {fmtDate(doc.expiry_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
                                {doc.file_url ? (
                                  <a href={getMediaUrl(doc.file_url)} target="_blank" rel="noopener" style={{ fontSize: '0.75rem', color: C.accent, textDecoration: 'none', padding: '2px 6px' }} title="Download">📎</a>
                                ) : doc.is_placeholder ? (
                                  <button onClick={() => openEdit(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: C.amber, padding: '2px 6px' }} title="Upload">📤</button>
                                ) : null}
                                <button onClick={() => openEdit(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: C.muted, padding: '2px 4px' }} title="Edit">✏️</button>
                                <button onClick={() => handleDelete(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: C.red, padding: '2px 4px' }} title="Delete">🗑️</button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      ) : (
        /* ── Grid View ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {docs.map((doc: any) => {
            const st = doc.status || 'VALID'
            const catColor = CAT_COLORS[doc.category] || C.muted
            return (
              <div key={doc.id} style={{
                background: C.card, borderRadius: 10, padding: '0.85rem 1rem',
                border: `1px solid ${st === 'MISSING' ? C.slate + '60' : st === 'EXPIRED' ? C.red + '40' : st === 'EXPIRING' ? C.amber + '30' : C.border}`,
                opacity: st === 'MISSING' ? 0.75 : 1,
                transition: 'border-color 0.15s',
              }}>
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, lineHeight: 1.3, flex: 1, minWidth: 0, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const }}>{doc.title}</h3>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEdit(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: C.muted, padding: 2 }} title="Edit">✏️</button>
                    <button onClick={() => handleDelete(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: C.red, padding: 2 }} title="Delete">🗑️</button>
                  </div>
                </div>

                {/* Description */}
                {doc.description && (
                  <p style={{ fontSize: '0.7rem', color: C.muted, margin: '4px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{doc.description}</p>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={badge(catColor)}>{doc.category?.replace('_', ' ')}</span>
                  <span style={badge(STATUS_COLORS[st] || C.muted)}>{STATUS_LABELS[st] || st}</span>
                  <span style={badge(ACCESS_COLORS[doc.access_level] || C.muted)}>{doc.access_level}+</span>
                  {doc.file_size_display && <span style={{ fontSize: '0.6rem', color: C.muted, alignSelf: 'center' }}>{doc.file_size_display}</span>}
                </div>

                {/* Regulatory ref */}
                {doc.regulatory_ref && (
                  <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 6, fontStyle: 'italic' }}>📜 {doc.regulatory_ref}</div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.65rem', color: C.muted }}>
                  <span>{doc.uploaded_by_name ? `Uploaded by ${doc.uploaded_by_name}` : ''} {doc.created_at ? `— ${fmtDate(doc.created_at)}` : ''}</span>
                  {doc.expiry_date && (
                    <span style={{ color: doc.is_expired ? C.red : doc.is_expiring_soon ? C.amber : C.green, fontWeight: 600 }}>
                      Exp: {fmtDate(doc.expiry_date)}
                    </span>
                  )}
                </div>

                {/* File link or upload prompt */}
                {doc.file_url ? (
                  <a href={getMediaUrl(doc.file_url)} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 6, fontSize: '0.7rem', color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
                    📎 View / Download
                  </a>
                ) : doc.is_placeholder ? (
                  <button onClick={() => openEdit(doc)} style={{ marginTop: 6, padding: '0.3rem 0.8rem', borderRadius: 6, border: `1px dashed ${C.slate}`, background: 'transparent', color: C.amber, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                    📤 Upload this document
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload / Edit Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '1rem' }} onClick={() => { setShowUpload(false); setEditDoc(null) }}>
          <div style={{ background: C.card, borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>{editDoc ? 'Edit Document' : 'Upload Document'}</h2>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input name="title" defaultValue={editDoc?.title || ''} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea name="description" defaultValue={editDoc?.description || ''} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select name="category" defaultValue={editDoc?.category || 'GENERAL'} style={inputStyle}>
                    {CATEGORIES.filter(c => c.key).map(c => (
                      <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Access Level</label>
                  <select name="access_level" defaultValue={editDoc?.access_level || 'staff'} style={inputStyle}>
                    <option value="owner">Owner Only</option>
                    <option value="manager">Manager+</option>
                    <option value="staff">All Staff</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input name="expiry_date" type="date" defaultValue={editDoc?.expiry_date || ''} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Regulatory Ref</label>
                  <input name="regulatory_ref" defaultValue={editDoc?.regulatory_ref || ''} style={inputStyle} placeholder="e.g. HASAWA 1974" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>File {editDoc?.file_url ? '(replace)' : ''}</label>
                <input ref={fileRef} name="file" type="file" style={{ ...inputStyle, padding: '0.4rem' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.txt" />
                {editDoc?.filename && <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: 2 }}>Current: {editDoc.filename}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => { setShowUpload(false); setEditDoc(null) }} style={{ padding: '0.45rem 1rem', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={uploading} style={{ padding: '0.45rem 1.2rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', opacity: uploading ? 0.5 : 1 }}>
                  {uploading ? 'Saving…' : editDoc ? 'Save Changes' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '0.85rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' as const }
