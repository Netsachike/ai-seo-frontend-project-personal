import { redirect } from "next/navigation";

// Sign-up is off for now: accounts are created on the backend. To bring it
// back, restore this page and the link on the sign-in form.
//
// import { getTranslations } from "next-intl/server";
// import { SignUpForm } from "./sign-up-form";
//
// export async function generateMetadata() {
//   const t = await getTranslations("auth.signUp");
//   return { title: t("metaTitle") };
// }
//
// export default function SignUpPage() {
//   return <SignUpForm />;
// }

export default function SignUpPage() {
  redirect("/sign-in");
}
