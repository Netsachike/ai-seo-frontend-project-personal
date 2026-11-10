import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";

const HOSTS = ["api.duda.co", "api.eu.duda.co"] as const;

/**
 * Checks Duda API credentials before the connection is saved: a Get Site on
 * the given site name proves the username and password work and that this
 * account can reach that site. Tries the US host, then the EU one, and
 * returns whichever answered. Nothing is stored or logged here; the connect
 * form saves the connection through the backend afterwards.
 */
export async function POST(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ code: "unauthenticated" }, { status: 401 });
  }

  let body: { username?: unknown; password?: unknown; site_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const siteName = typeof body.site_name === "string" ? body.site_name.trim() : "";
  if (!username || !password || !siteName) return NextResponse.json({ code: "duda_fields" }, { status: 422 });
  if (!/^[a-z0-9]+$/i.test(siteName)) return NextResponse.json({ code: "duda_site_not_found" }, { status: 422 });

  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  let lastStatus = 0;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`https://${host}/api/sites/multiscreen/${siteName}`, {
        headers: { Authorization: auth, Accept: "application/json", "User-Agent": "Rankoya/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return NextResponse.json({ host, site_name: siteName });
      lastStatus = res.status;
    } catch {
      lastStatus = 502;
    }
  }

  if (lastStatus === 401 || lastStatus === 403) return NextResponse.json({ code: "duda_auth" }, { status: 422 });
  if (lastStatus === 404) return NextResponse.json({ code: "duda_site_not_found" }, { status: 422 });
  return NextResponse.json({ code: "duda_unavailable" }, { status: 502 });
}
