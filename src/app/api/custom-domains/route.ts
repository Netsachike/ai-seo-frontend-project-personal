import { NextResponse, type NextRequest } from "next/server";

import { VERCEL_PROJECT_ID, VERCEL_TOKEN, demoVercel, isVercelConfigured, isVercelDemo, vercelUrl } from "@/lib/vercel-domains";

/** Adds a White Label domain to the Vercel project so its DNS records exist. */
export async function POST(request: NextRequest) {
  try {
    if (!isVercelConfigured && !isVercelDemo) {
      console.error("Missing Vercel environment variables");
      return NextResponse.json({ error: "Vercel configuration is missing" }, { status: 500 });
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!cleanDomain) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    if (isVercelDemo) {
      return NextResponse.json({ success: true, domain: cleanDomain, vercel: demoVercel.add(cleanDomain) });
    }

    const response = await fetch(vercelUrl(`/v10/projects/${VERCEL_PROJECT_ID}/domains`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: cleanDomain }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Vercel API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "Could not add domain to Vercel", details: data },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, domain: cleanDomain, vercel: data });
  } catch (error) {
    console.error("Custom domain error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
