'use client'

import { useState } from 'react'
import { type TabHookProps, type TabHookResult } from './shared/icons'

function getTallyEmbedUrl(url: string): string | null {
  if (!url) return null
  // tally.so/r/{id} -> tally.so/embed/{id}?hideTitle=1
  if (url.includes('tally.so/r/')) {
    const formId = url.split('/r/')[1]?.split('?')[0]?.split('/')[0]
    if (formId) {
      return `https://tally.so/embed/${formId}?hideTitle=1`
    }
  }
  // If it's already an embed URL, preserve the URL but remove transparent background
  if (url.includes('tally.so/embed/')) {
    return url.replace(/([?&])transparentBackground=1(&)?/g, (_, sep, amp) => (amp ? sep : '')).replace(/[?&]$/, '')
  }
  return null
}

function getSpotifyEmbedUrl(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!['open.spotify.com', 'spotify.com', 'www.spotify.com'].includes(parsed.hostname)) return null
    if (parsed.pathname.startsWith('/embed/playlist/') || parsed.pathname.startsWith('/embed/show/')) {
      return parsed.toString()
    }
    if (parsed.pathname.startsWith('/playlist/')) {
      const playlistId = parsed.pathname.split('/playlist/')[1]?.split('/')[0]
      if (playlistId) {
        return `https://open.spotify.com/embed/playlist/${playlistId}`
      }
    }
    if (parsed.pathname.startsWith('/show/')) {
      const showId = parsed.pathname.split('/show/')[1]?.split('/')[0]
      if (showId) {
        return `https://open.spotify.com/embed/show/${showId}`
      }
    }
  } catch {
    return null
  }
  return null
}

function getProxyUrl(type: string, url: string): string {
  return type === 'Spotify'
    ? `/spotify-proxy?url=${encodeURIComponent(url)}`
    : `/tally-proxy?url=${encodeURIComponent(url)}`
}

export function useEmbedTab({ tab, onSave }: TabHookProps): TabHookResult {
  // Saved values
  const savedOriginalUrl = (tab as any).original_url ?? ''
  const savedEmbedUrl = (tab as any).embed_url ?? ''

  // State
  const [originalUrl, setOriginalUrl] = useState(savedOriginalUrl)

  // Derived
  const tabType = (tab as any).type || ''
  const isSpotify = tabType === 'Spotify'
  const embedUrl = isSpotify ? getSpotifyEmbedUrl(originalUrl) || '' : getTallyEmbedUrl(originalUrl) || ''

  // Change detection — also trigger save if embed_url is missing but we can compute it
  const hasChanges = originalUrl !== savedOriginalUrl || (embedUrl && embedUrl !== savedEmbedUrl)

  // Save handler
  const handleSave = async () => {
    await onSave({
      original_url: originalUrl,
      embed_url: embedUrl,
    })
  }

  // Editor sections
  const editorSections = (
    <div className="contentblock">
      <div className="contenthead-row">
        <h2 className="contenthead">Embed Settings</h2>
      </div>
      <div className="formblock w-form">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="formcontent">
            <div className="fieldblocks">
              <div className="labelrow">
                <div className="labeltext">{isSpotify ? 'Spotify URL' : 'Tally Form URL'}</div>
                <div className="labeldivider"></div>
              </div>
              <input
                className="formfields urlfield w-input"
                maxLength={512}
                placeholder={isSpotify ? 'https://open.spotify.com/playlist/your-playlist-id or /show/your-show-id' : 'https://tally.so/r/your-form-id'}
                type="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
              />
              {originalUrl && embedUrl && (
                <div className="fieldexplainer" style={{ marginTop: 6 }}>
                  Embed URL: <strong>{embedUrl}</strong>
                </div>
              )}
              {originalUrl && !embedUrl && (
                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 6, fontWeight: 500 }}>
                  {isSpotify
                    ? 'Please enter a valid Spotify playlist or show URL (e.g. https://open.spotify.com/playlist/abc123)'
                    : 'Please enter a valid Tally URL (e.g. https://tally.so/r/abc123)'}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  // Preview — use saved embed URL, or fall back to live-computed embed URL
  const previewUrl = savedEmbedUrl || embedUrl
  const proxyUrl = previewUrl ? getProxyUrl(isSpotify ? 'Spotify' : 'Tally', previewUrl) : ''

  const preview = (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {proxyUrl ? (
        <iframe
          src={proxyUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0, display: 'block' }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 14 }}>
          {isSpotify ? 'Enter a Spotify playlist or show URL and save to see a preview' : 'Enter a Tally form URL and save to see a preview'}
        </div>
      )}
    </div>
  )

  return { editorSections, preview, hasChanges, handleSave }
}
