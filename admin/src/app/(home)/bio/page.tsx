import type { Metadata } from "next";
import { BioPage } from "./bio-page";

export const metadata: Metadata = {
  title: "Shea | Links & Apps",
  description: "Find Shea apps, download Shea POS, and request an invitation to test the iPhone app.",
};

export default function Page() { return <BioPage />; }
