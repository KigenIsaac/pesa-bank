import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Pesa Bank",
  description: "Pesa Bank customer, teller, and admin portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
