import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = (process.env.DJANGO_BACKEND_URL || 'http://localhost:8000').trim()

/**
 * Proxy media/document file requests to the Django backend.
 * Routes /api/files/documents/2026/02/file.pdf → DJANGO_BACKEND_URL/documents/2026/02/file.pdf
 */
async function proxyMedia(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/files/, '')
  const target = `${BACKEND_URL}${path}${url.search}`

  try {
    const headers: Record<string, string> = {}
    const auth = req.headers.get('authorization')
    if (auth) headers['Authorization'] = auth

    const res = await fetch(target, { method: 'GET', headers })

    if (!res.ok) {
      return new NextResponse(`File not found`, { status: res.status })
    }

    const body = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = res.headers.get('content-disposition')

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
    }
    if (contentDisposition) {
      responseHeaders['Content-Disposition'] = contentDisposition
    }

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error('[MEDIA PROXY ERROR]', target, err.message)
    return new NextResponse('File proxy error', { status: 502 })
  }
}

export const GET = proxyMedia
