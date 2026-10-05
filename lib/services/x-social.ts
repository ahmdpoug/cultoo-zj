import type { XProfile } from '@/lib/types'
import { authBridge } from '@/lib/auth/bridge'
import { mockXProfile, normalizeHandle } from '@/lib/game/scoring'
import type { SocialService } from './types'

export class XLookupError extends Error {}

/**
 * Live X profiles via `/api/x/profile` (X API v2, gated by the Privy session).
 * Falls back to generated stats when live data is unavailable, while still
 * using the signed-in user's real X name and avatar for their own card.
 */
export const xSocial: SocialService = {
  async getProfile(raw) {
    const handle = normalizeHandle(raw)
    const token = await authBridge.getAccessToken().catch(() => null)

    if (token) {
      const res = await fetch(`/api/x/profile?handle=${encodeURIComponent(handle)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) return ((await res.json()) as { profile: XProfile }).profile
      if (res.status === 404 || res.status === 400) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string }
        throw new XLookupError(error ?? `@${handle} doesn't exist on X.`)
      }
    }

    const base: XProfile = { ...mockXProfile(handle), source: 'generated' }
    const me = authBridge.getXIdentity()
    if (me && me.username.toLowerCase() === handle.toLowerCase()) {
      return { ...base, handle: me.username, displayName: me.name || me.username, avatarUrl: me.avatarUrl, xId: me.subject }
    }
    return base
  },

  shareUrl(text, url) {
    const params = new URLSearchParams({ text })
    if (url) params.set('url', url)
    return `https://x.com/intent/post?${params.toString()}`
  },
}
