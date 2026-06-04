import { Phone, Mail, MapPin, Facebook, Youtube } from "lucide-react";

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer style={{ background: "var(--primary)", fontFamily: "var(--font-body)" }}>
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <h3 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "1.3rem", marginBottom: "0.75rem" }}>
              Mr. Aravinda's Tuition Classes
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", lineHeight: 1.7, maxWidth: "360px" }}>
              Quality education for Grades 6–11. Specializing in Mathematics, Science, and English in both Sinhala and English medium. Over 12 years of experience guiding students to excellence.
            </p>
            <div className="flex gap-3 mt-5">
              {[Facebook, Youtube].map((Icon, i) => (
                <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: "var(--accent)", fontSize: "0.75rem", letterSpacing: "0.12em", marginBottom: "1rem" }}>QUICK LINKS</h4>
            <div className="flex flex-col gap-2">
              {["home", "classes", "timetable", "register", "materials", "contact"].map((page) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className="text-left hover:opacity-80 transition-opacity capitalize"
                  style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem" }}
                >
                  {page === "register" ? "Registration" : page.charAt(0).toUpperCase() + page.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: "var(--accent)", fontSize: "0.75rem", letterSpacing: "0.12em", marginBottom: "1rem" }}>CONTACT</h4>
            <div className="flex flex-col gap-3">
              {[
                { icon: Phone, text: "+94 71 234 5678" },
                { icon: Mail, text: "aravinda.classes@gmail.com" },
                { icon: MapPin, text: "45/B, Galle Road, Colombo 06, Sri Lanka" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon size={14} style={{ color: "var(--accent)", marginTop: "3px", flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
            © 2024 Mr. Aravinda's Tuition Classes. All rights reserved.
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
            Colombo, Sri Lanka
          </p>
        </div>
      </div>
    </footer>
  );
}
