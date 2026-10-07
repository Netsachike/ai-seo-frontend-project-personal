import { redirect } from "next/navigation";

import { accountHref } from "@/features/account/routes";

export default function AdminPage() {
  redirect(accountHref.admin());
}
