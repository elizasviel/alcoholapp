import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTB Label Verifier | AI-Powered Alcohol Label Compliance",
  description: "Streamline your TTB label verification process with AI-powered compliance checking. Upload label images and verify against application data in seconds.",
  keywords: ["TTB", "label verification", "alcohol compliance", "COLA", "beverage labels"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;600&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
