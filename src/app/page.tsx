import { redirect } from "next/navigation";

/** Phase 1: the app shell does not exist yet, so the root opens the component gallery. */
export default function Home() {
  redirect("/dev/components");
}
