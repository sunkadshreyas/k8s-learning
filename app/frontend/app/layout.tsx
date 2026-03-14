// Root layout — applies Tailwind styles and a shared nav header.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movies",
  description: "A simple movies app for learning Kubernetes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <header className="bg-white border-b px-6 py-4">
          <a href="/" className="text-lg font-semibold">🎬 Movies</a>
        </header>
        <main className="px-6 py-8 max-w-4xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
