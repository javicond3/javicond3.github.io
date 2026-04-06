import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import NavPublications from "@/components/NavPublications";
import NavProjects from "@/components/NavProjects";
import NavTeaching from "@/components/NavTeaching";
import NavInternational from "@/components/NavInternational";
import NavMobile from "@/components/NavMobile";
import NavAuthButton from "@/components/NavAuthButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Javier Conde | Assistant Professor at Universidad Politécnica de Madrid (UPM)",
  description:
    "Personal academic profile of Javier Conde – publications, research interests, and contact.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-white text-gray-900 antialiased min-h-screen`}>
        {/* Top nav */}
        <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: "#1c2d2d" }}>
          <div className="px-6 lg:px-24 h-14 flex items-center justify-between relative">
            <a className="font-bold tracking-tight" style={{ color: "#2ecfba" }} href="/">
              Javier Conde
            </a>
            {/* Desktop nav */}
            <nav className="hidden md:flex gap-6 text-sm font-medium items-center">
              <a href="#about" className="text-gray-300 transition-colors hover:text-accent">
                About
              </a>
              <NavPublications />
              <NavProjects />
              <NavTeaching />
              <NavInternational />
              <NavAuthButton isIcon={true} />
            </nav>
            {/* Mobile nav */}
            <NavMobile />
          </div>
        </header>

        {children}

        <Footer />
      </body>
    </html>
  );
}
