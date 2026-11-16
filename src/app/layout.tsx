import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// WPP Sans, self-hosted. The web-embedding licence is unconfirmed (docs/design/README.md):
// keep the repo private and don't deploy publicly until it is confirmed.
const wpp = localFont({
  src: [
    { path: "../../public/fonts/WPP-Thin.woff2", weight: "100", style: "normal" },
    { path: "../../public/fonts/WPP-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/WPP-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/WPP-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/WPP-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-wpp",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Weekly Project Health", template: "%s · Weekly Project Health" },
  description:
    "Weekly project health across clients and workstreams. WPP Enterprise Solutions | MAP.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={wpp.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
