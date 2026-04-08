"use client"
import { useState, useEffect } from "react";
import { Menu, X, ShoppingBag, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import SelectLanguage from "../language";
import Link from "next/link";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, now we can show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "py-3 glass shadow-xs" : "py-5 bg-transparent"}`}>
    <div className="container flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <img src="/text.png" alt="Shea Logo" className="h-9 w-auto" />
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        <Link href="#products" className="link-hover text-sm font-medium">
          Products
        </Link>
        <Link href="#features" className="link-hover text-sm font-medium">
          Features
        </Link>
        <Link href="#testimonials" className="link-hover text-sm font-medium">
          Testimonials
        </Link>
        <Link href="#download" className="link-hover text-sm font-medium">
          Download
        </Link>
      </nav>

      <div className="hidden md:flex items-center gap-4">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}
        <Button variant="ghost" size="icon">
          <ShoppingBag className="h-5 w-5" />
        </Button>
        <SelectLanguage />
        <Button>Get Started</Button>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-xs transition-all duration-300 md:hidden ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
        <div className="container h-full flex flex-col pt-24 pb-12">
          <nav className="flex flex-col gap-6 text-center">
            <Link href="#products" className="text-xl font-medium py-2" onClick={() => setIsOpen(false)}>
              Products
            </Link>
            <Link href="#features" className="text-xl font-medium py-2" onClick={() => setIsOpen(false)}>
              Features
            </Link>
            <Link href="#testimonials" className="text-xl font-medium py-2" onClick={() => setIsOpen(false)}>
              Testimonials
            </Link>
            <Link href="#download" className="text-xl font-medium py-2" onClick={() => setIsOpen(false)}>
              Download
            </Link>
          </nav>
          <div className="mt-auto">
            <Button className="w-full">Get Started</Button>
          </div>
        </div>
      </div>
    </div>
  </header>;
};
export default Navbar;
