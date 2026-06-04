import { Award, BookOpen, Users, Star } from "lucide-react";

const achievements = [
  "B.Sc. (Special) in Mathematics — University of Colombo",
  "Postgraduate Diploma in Education (PGDE) — NIE Sri Lanka",
  "Former Senior Teacher — Nalanda College, Colombo 10",
  "12+ Years Private Tuition Experience",
  "98% O/Level Pass Rate (2023 cohort)",
  "Over 840 students mentored across all grades",
];

const values = [
  { icon: BookOpen, title: "Structured Learning", desc: "Systematically planned lessons aligned with the national curriculum, ensuring every topic is covered thoroughly." },
  { icon: Users, title: "Individual Attention", desc: "Small class sizes ensure every student gets personalised feedback and support where they need it most." },
  { icon: Award, title: "Results-Driven", desc: "Proven exam technique coaching with intensive past paper practice to maximise marks under pressure." },
  { icon: Star, title: "Parent Involvement", desc: "Monthly progress reports and open communication with parents to ensure students stay on track." },
];

export function AboutPage() {
  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>OUR STORY</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>About Us</h1>
        </div>
      </div>

      {/* Teacher bio */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <img
            src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=560&h=500&fit=crop&auto=format"
            alt="Mr. Aravinda Bandara - tuition teacher"
            className="rounded-2xl shadow-lg w-full object-cover"
            style={{ height: "420px" }}
          />
        </div>
        <div>
          <p style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>YOUR TEACHER</p>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Mr. Aravinda Bandara</h2>
          <p style={{ color: "var(--accent)", fontSize: "0.9rem", marginBottom: "1.5rem", fontFamily: "var(--font-mono)" }}>B.Sc. (Special) Mathematics · PGDE · 12 Years Experience</p>
          <p style={{ color: "var(--muted-foreground)", lineHeight: 1.85, marginBottom: "1.25rem", fontSize: "0.95rem" }}>
            I began my teaching career at Nalanda College, Colombo, where I spent 7 years developing a passion for helping students discover the logic and beauty in mathematics and science. In 2018, I founded this tuition centre to provide high-quality, affordable education to students across Colombo.
          </p>
          <p style={{ color: "var(--muted-foreground)", lineHeight: 1.85, marginBottom: "1.75rem", fontSize: "0.95rem" }}>
            My teaching philosophy is simple: every student can excel with the right guidance, consistent practice, and belief in themselves. I combine structured curriculum coverage with targeted exam technique training to give students the best chance at success.
          </p>
          <div className="flex flex-col gap-2.5">
            {achievements.map((ach, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--accent)" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8.5 2.5" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ color: "var(--foreground)", fontSize: "0.9rem", lineHeight: 1.5 }}>{ach}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: "var(--secondary)" }} className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>WHAT WE BELIEVE IN</p>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "2rem", fontWeight: 700 }}>Our Teaching Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="p-6 rounded-2xl flex gap-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                    <Icon size={20} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.4rem" }}>{v.title}</h3>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.88rem", lineHeight: 1.7 }}>{v.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Class environment */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>OUR ENVIRONMENT</p>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "2rem", fontWeight: 700 }}>The Classroom</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=500&h=350&fit=crop&auto=format", alt: "Clean classroom setup" },
            { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=500&h=350&fit=crop&auto=format", alt: "Students learning together" },
            { src: "https://images.unsplash.com/photo-1472220625704-91e1462799b2?w=500&h=350&fit=crop&auto=format", alt: "Whiteboard lesson" },
          ].map((img, i) => (
            <img key={i} src={img.src} alt={img.alt} className="rounded-2xl object-cover w-full shadow-sm" style={{ height: "240px" }} />
          ))}
        </div>
      </section>
    </div>
  );
}
