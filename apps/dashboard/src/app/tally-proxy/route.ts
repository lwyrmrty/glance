import { NextRequest, NextResponse } from 'next/server'

function normalizeTallyUrl(rawUrl: string): string | null {
  if (!rawUrl) return null
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  if (host !== 'tally.so' && host !== 'www.tally.so') return null

  const path = parsed.pathname
  if (path.startsWith('/r/')) {
    const formId = path.split('/r/')[1]?.split('/')[0]
    if (!formId) return null
    return `https://tally.so/embed/${formId}?hideTitle=1`
  }

  if (path.startsWith('/embed/')) {
    return parsed.toString()
  }

  return null
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url') || ''
  const tallyUrl = normalizeTallyUrl(rawUrl)

  if (!tallyUrl) {
    return new NextResponse('Invalid Tally URL', { status: 400 })
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tally Embed</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #fff; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe src="${tallyUrl}" allow="payment; fullscreen; clipboard-write"></iframe>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
