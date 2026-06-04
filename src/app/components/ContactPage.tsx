import { useState } from "react";
import { Phone, Mail, MapPin, Clock, CheckCircle } from "lucide-react";

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>GET IN TOUCH</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>Contact Us</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Have a question? We'd love to hear from you.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-14">
        {/* Contact Info */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Reach Us Directly</h2>
          <div className="flex flex-col gap-6">
            {[
              { icon: Phone, title: "Phone / WhatsApp", detail: "+94 71 234 5678", sub: "Available 8:00 AM – 8:00 PM daily" },
              { icon: Mail, title: "Email", detail: "aravinda.classes@gmail.com", sub: "We'll reply within 12 hours" },
              { icon: MapPin, title: "Location", detail: "45/B, Galle Road, Colombo 06", sub: "Near Thummulla Junction" },
              { icon: Clock, title: "Office Hours", detail: "Mon – Sat: 9:00 AM – 8:00 PM", sub: "Closed on public holidays" },
            ].map(({ icon: Icon, title, detail, sub }, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                  <Icon size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "0.25rem" }}>{title}</div>
                  <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>{detail}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.15rem" }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Map placeholder */}
          <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", height: "200px", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="text-center">
              <MapPin size={32} style={{ color: "var(--accent)", margin: "0 auto 0.5rem" }} />
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>45/B, Galle Road, Colombo 06</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Near Thummulla Junction</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Send a Message</h2>
          {sent ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#e6f7ee" }}>
                <CheckCircle size={32} style={{ color: "#2d9e5f" }} />
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.75rem" }}>Message Sent!</h3>
              <p style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>Thank you for reaching out, {form.name}. We'll get back to you soon.</p>
              <button onClick={() => setSent(false)} className="mt-5 px-5 py-2.5 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500 }}>Send Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { label: "Your Name *", name: "name", type: "text", placeholder: "Full name" },
                { label: "Phone Number", name: "phone", type: "text", placeholder: "07X XXX XXXX" },
                { label: "Email Address", name: "email", type: "email", placeholder: "email@example.com" },
              ].map(({ label, name, type, placeholder }) => (
                <div key={name}>
                  <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>{label}</label>
                  <input name={name} type={type} placeholder={placeholder} required={name === "name"} value={(form as any)[name]} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                </div>
              ))}
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Message *</label>
                <textarea name="message" placeholder="Your question or message…" rows={5} required value={form.message} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none resize-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 600 }}>
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
