/**
 * OAuth return pages (Google, WordPress.com). They sit outside the app shell
 * because they can be reached mid-setup, before the site has a dashboard.
 */
export default function OAuthLayout({ children }: LayoutProps<"/">) {
  return <main className="grid min-h-dvh place-items-center bg-bg p-4">{children}</main>;
}
