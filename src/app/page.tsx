import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "EstiForge — Electrical estimates and quotations",
  description:
    "Local-first electrical estimation. Review quantities from your rate book, then export a quotation PDF and CSV.",
};

export default function HomePage() {
  return <LandingPage />;
}
