import { NextResponse, type NextRequest } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { mapXUser, type XApiUser } from '@/lib/x/map-profile'

const USER_FIELDS = 'created_at,description,profile_image_url,public_metrics,verified,verified_type'

let privy: PrivyClient | null = null
function getPrivy() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const secret = process.env.PRIVY_APP_SECRET
  if (!appId || !secret) return null
  privy ??= new PrivyClient(appId, secret)
  return privy
}

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')?.trim().replace(/^@+/, '') ?? ''
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return NextResponse.json({ error: 'Invalid X username.' }, { status: 400 })
  }

  const client = getPrivy()
  const bearer = process.env.X_BEARER_TOKEN
  if (!client || !bearer) {
    return NextResponse.json({ error: 'Live X data is not configured.' }, { status: 503 })
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Sign in to scan live X profiles.' }, { status: 401 })
  try {
    await client.verifyAuthToken(token)
  } catch {
    return NextResponse.json({ error: 'Session expired. Sign in again.' }, { status: 401 })
  }

  const res = await fetch(`https://api.x.com/2/users/by/username/${handle}?user.fields=${USER_FIELDS}`, {
    headers: { Authorization: `Bearer ${bearer}` },
    next: { revalidate: 3600 },
  })

  if (res.status === 429) {
    return NextResponse.json({ error: 'X rate limit reached. Try again shortly.' }, { status: 429 })
  }
  const body = (await res.json().catch(() => null)) as { data?: XApiUser; errors?: { title?: string }[] } | null
  if (!res.ok || !body?.data) {
    const notFound = res.status === 404 || body?.errors?.some((e) => e.title === 'Not Found Error')
    return NextResponse.json(
      { error: notFound ? `@${handle} doesn't exist on X.` : 'X API request failed.' },
      { status: notFound ? 404 : 502 },
    )
  }

  return NextResponse.json({ profile: mapXUser(body.data) })
}
