import { useState } from "react";
import { Menu, X, BookOpen, GraduationCap } from "lucide-react";

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navLinks = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "classes", label: "Classes" },
  { id: "timetable", label: "Timetable" },
  { id: "announcements", label: "Announcements" },
  { id: "materials", label: "Materials" },
  { id: "contact", label: "Contact" },
];

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      style={{ fontFamily: "var(--font-body)", background: "var(--primary)" }}
      className="sticky top-0 z-50 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <GraduationCap size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div className="text-left">
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  color: "#ffffff",
                  fontWeight: 600,
                  lineHeight: 1.1,
                  fontSize: "1rem",
                }}
              >
                Mr. Aravinda
              </div>
              <div style={{ color: "var(--accent)", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                TUITION CLASSES
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className="px-3 py-2 rounded-md transition-all duration-150"
                style={{
                  color: currentPage === link.id ? "var(--accent)" : "rgba(255,255,255,0.8)",
                  background: currentPage === link.id ? "rgba(201,168,76,0.12)" : "transparent",
                  fontSize: "0.875rem",
                  fontWeight: currentPage === link.id ? 600 : 400,
                }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => onNavigate("register")}
              className="ml-2 px-4 py-2 rounded-lg transition-all duration-150 hover:opacity-90"
              style={{
                background: "var(--accent)",
                color: "var(--primary)",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              Register Now
            </button>
            <button
              onClick={() => onNavigate("admin")}
              className="ml-1 px-3 py-2 rounded-lg transition-all duration-150 hover:opacity-80"
              style={{
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.8rem",
              }}
            >
              Admin
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md"
            style={{ color: "#ffffff" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t" style={{ borderColor: "rgba(255,255,255,0.1)", background: "var(--primary)" }}>
          <div className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => { onNavigate(link.id); setMobileOpen(false); }}
                className="text-left px-3 py-2 rounded-md"
                style={{
                  color: currentPage === link.id ? "var(--accent)" : "rgba(255,255,255,0.85)",
                  background: currentPage === link.id ? "rgba(201,168,76,0.12)" : "transparent",
                  fontSize: "0.9rem",
                }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => { onNavigate("register"); setMobileOpen(false); }}
              className="mt-2 px-4 py-2 rounded-lg"
              style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600 }}
            >
              Register Now
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
