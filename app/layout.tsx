
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const font = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Fixmate",
  description: "Fix it or cook it. Show, say or type.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
  try {
    var theme = localStorage.getItem("fm-theme");
    if (theme === "dark" || theme === "light") {
      document.documentElement.dataset.theme = theme;
    }
  } catch (error) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body
        suppressHydrationWarning
        className={`${font.variable} flex h-dvh flex-col`}
      >
        <Navbar />

        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col lg:max-w-4xl">
          {children}
        </main>
      </body>
    </html>
  );
}