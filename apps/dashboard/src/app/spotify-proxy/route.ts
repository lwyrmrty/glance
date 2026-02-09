import { NextRequest, NextResponse } from 'next/server'

function normalizeSpotifyUrl(rawUrl: string): string | null {
  if (!rawUrl) return null
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  if (host !== 'open.spotify.com' && host !== 'spotify.com' && host !== 'www.spotify.com') return null

  if (parsed.pathname.startsWith('/embed/playlist/') || parsed.pathname.startsWith('/embed/show/')) {
    return parsed.toString()
  }

  if (parsed.pathname.startsWith('/playlist/')) {
    const playlistId = parsed.pathname.split('/playlist/')[1]?.split('/')[0]
    if (!playlistId) return null
    return `https://open.spotify.com/embed/playlist/${playlistId}`
  }

  if (parsed.pathname.startsWith('/show/')) {
    const showId = parsed.pathname.split('/show/')[1]?.split('/')[0]
    if (!showId) return null
    return `https://open.spotify.com/embed/show/${showId}`
  }

  return null
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url') || ''
  const spotifyUrl = normalizeSpotifyUrl(rawUrl)

  if (!spotifyUrl) {
    return new NextResponse('Invalid Spotify URL', { status: 400 })
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Spotify Embed</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #fff; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe src="${spotifyUrl}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
