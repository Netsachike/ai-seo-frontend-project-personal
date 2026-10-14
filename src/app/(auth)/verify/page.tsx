import { redirect } from "next/navigation";

/**
 * Email codes need a backend endpoint that doesn't exist yet: sign-up signs
 * the user in straight away, and password resets go to support by email.
 * Old links land on sign-in.
 */
export default function VerifyPage() {
  redirect("/sign-in");
}
