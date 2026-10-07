import { redirect } from "next/navigation";

/** Signed in (proxy.ts guarantees it): every session starts by picking a site. */
export default function Home() {
  redirect("/sites");
}
