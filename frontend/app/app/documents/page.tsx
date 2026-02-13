'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDocuments, getMediaUrl } from '@/lib/api'

const C = {
  bg: '#0f172a', card: '#1e293b', text: '#f8fafc', muted: '#94a3b8',
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

const STATUS_COLORS: Record<string, string> = { VALID: C.green, EXPIRING: C.amber, EXPIRED: C.red, MISSING: C.slate }
const STATUS_LABELS: Record<string, string> = { VALID: 'Valid', EXPIRING: 'Expiring Soon', EXPIRED: 'Expired', MISSING: 'Not Uploaded' }
const CAT_COLORS: Record<string, string> = {
  LEGAL: C.red, INSURANCE: C.amber, POLICY: C.purple, HEALTH_SAFETY: C.green,
  COMPLIANCE: C.blue, TRAINING: C.accent, HR: C.purple, CONTRACT: C.slate, GENERAL: C.muted,
}

export default function StaffDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params: any = {}
    if (activeCategory) params.category = activeCategory
    if (search) params.search = search
    const res = await getDocuments(params)
    // Staff only sees documents with access_level 'staff'
    const all = res.data || []
    setDocs(all.filter((d: any) => d.access_level === 'staff'))
    setLoading(false)
  }, [activeCategory, search])

  useEffect(() => { load() }, [load])

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const badge = (bg: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem',
    fontWeight: 700, background: bg + '20', color: bg, border: `1px solid ${bg}40`,
    textTransform: 'uppercase' as const, letterSpacing: '0.03em',
  })

  return (
    <div style={{ color: C.text, maxWidth: 1000, margin: '0 auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Documents</h1>
        <p style={{ fontSize: '0.75rem', color: C.muted, margin: '2px 0 0' }}>Company policies, certificates & compliance documents</p>
      </div>

      {/* Category Tabs + Search */}
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
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: '0.8rem', width: 180, outline: 'none', colorScheme: 'dark' }}
        />
      </div>

      {/* Document List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading documents…</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 600 }}>No documents available</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            {activeCategory || search ? 'Try a different filter.' : 'No documents have been shared yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {docs.map((doc: any) => {
            const st = doc.status || 'VALID'
            const catColor = CAT_COLORS[doc.category] || C.muted
            return (
              <div key={doc.id} style={{
                background: C.card, borderRadius: 10, padding: '0.85rem 1rem',
                border: `1px solid ${st === 'EXPIRED' ? C.red + '40' : st === 'EXPIRING' ? C.amber + '30' : C.border}`,
              }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{doc.title}</h3>
                {doc.description && (
                  <p style={{ fontSize: '0.7rem', color: C.muted, margin: '4px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{doc.description}</p>
                )}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={badge(catColor)}>{doc.category?.replace('_', ' ')}</span>
                  <span style={badge(STATUS_COLORS[st] || C.muted)}>{STATUS_LABELS[st] || st}</span>
                  {doc.file_size_display && <span style={{ fontSize: '0.6rem', color: C.muted, alignSelf: 'center' }}>{doc.file_size_display}</span>}
                </div>
                {doc.regulatory_ref && (
                  <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 6, fontStyle: 'italic' }}>📜 {doc.regulatory_ref}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.65rem', color: C.muted }}>
                  <span>{doc.uploaded_by_name ? `By ${doc.uploaded_by_name}` : ''} {doc.created_at ? `— ${fmtDate(doc.created_at)}` : ''}</span>
                  {doc.expiry_date && (
                    <span style={{ color: doc.is_expired ? C.red : doc.is_expiring_soon ? C.amber : C.green, fontWeight: 600 }}>
                      Exp: {fmtDate(doc.expiry_date)}
                    </span>
                  )}
                </div>
                {doc.file_url && (
                  <a href={getMediaUrl(doc.file_url)} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 6, fontSize: '0.7rem', color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
                    📎 View / Download
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
