import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Rails PoC #35 | Weather-to-Supply Chain Risk",
  description: "A Real Rails intelligence dashboard showing how weather events propagate into logistics delays.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full overflow-hidden bg-rr-base text-white">{children}</body>
    </html>
  );
}