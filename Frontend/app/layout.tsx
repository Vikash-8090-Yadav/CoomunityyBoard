import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster"
import NetworkSwitchButton from "../components/NetworkSwitchButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Community Bounty Board",
  description: "A decentralized platform for creating and completing bounties",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NetworkSwitchButton />
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
