import { NextResponse, type NextRequest } from "next/server";

import { VERCEL_PROJECT_ID, VERCEL_TOKEN, demoVercel, isVercelConfigured, isVercelDemo, vercelUrl } from "@/lib/vercel-domains";

const missingConfig = () => NextResponse.json({ error: "Vercel configuration is missing" }, { status: 500 });

/** Ownership status of a domain on the Vercel project (TXT verification). */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ domain: string }> }) {
  try {
    if (!isVercelConfigured && !isVercelDemo) return missingConfig();

    const { domain } = await ctx.params;
    const cleanDomain = decodeURIComponent(domain).trim().toLowerCase();

    if (isVercelDemo) {
      return NextResponse.json({ success: true, domain: cleanDomain, vercel: demoVercel.status(cleanDomain) });
    }

    const response = await fetch(
      vercelUrl(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(cleanDomain)}`),
      { method: "GET", headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: "no-store" },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Could not retrieve domain status", details: data },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, domain: cleanDomain, vercel: data });
  } catch (error) {
    console.error("Domain status error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * Detaches the domain from the Vercel project. Runs before the backend record
 * is deleted so a host is never orphaned on the project.
 */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ domain: string }> }) {
  try {
    if (!isVercelConfigured && !isVercelDemo) return missingConfig();

    const { domain } = await ctx.params;
    const cleanDomain = decodeURIComponent(domain).trim().toLowerCase();

    if (isVercelDemo) {
      demoVercel.remove(cleanDomain);
      return NextResponse.json({ success: true, domain: cleanDomain });
    }

    const response = await fetch(
      vercelUrl(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(cleanDomain)}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: "no-store" },
    );

    // A 404 means the domain is already off the project: treat it as done so
    // a half-finished delete can always be retried to completion.
    if (!response.ok && response.status !== 404) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(
        { error: data?.error?.message || "Could not remove domain from Vercel", details: data },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, domain: cleanDomain });
  } catch (error) {
    console.error("Domain delete error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
