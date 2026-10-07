import { NextResponse, type NextRequest } from "next/server";

import { VERCEL_TOKEN, demoVercel, isVercelConfigured, isVercelDemo, vercelUrl } from "@/lib/vercel-domains";

/** DNS routing state for a domain (CNAME / A records) and Vercel's recommended targets. */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ domain: string }> }) {
  try {
    if (!isVercelConfigured && !isVercelDemo) {
      return NextResponse.json({ error: "Vercel configuration is missing" }, { status: 500 });
    }

    const { domain } = await ctx.params;
    const cleanDomain = decodeURIComponent(domain).trim().toLowerCase();

    if (isVercelDemo) {
      return NextResponse.json({ status: 200, ok: true, vercel: demoVercel.config(cleanDomain) });
    }

    const response = await fetch(vercelUrl(`/v6/domains/${encodeURIComponent(cleanDomain)}/config`), {
      method: "GET",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json({ status: response.status, ok: response.ok, vercel: data }, { status: response.status });
  } catch (error) {
    console.error("Vercel config error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
