import { Star, Users, Award, BookOpen, ArrowRight, ChevronRight } from "lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const stats = [
  { label: "Years Experience", value: "12+" },
  { label: "Students Taught", value: "850+" },
  { label: "Distinction Passes", value: "340+" },
  { label: "Subjects Offered", value: "6" },
];

const featuredClasses = [
  { subject: "Mathematics", grade: "Grade 10 & 11", medium: "Sinhala / English", fee: "Rs. 2,500/month", day: "Mon & Thu", time: "4:00 – 6:00 PM", color: "#1a2744", badge: "Most Popular" },
  { subject: "Science", grade: "Grade 8 & 9", medium: "Sinhala", fee: "Rs. 2,000/month", day: "Tue & Fri", time: "3:30 – 5:30 PM", color: "#2d4a7a", badge: "" },
  { subject: "English", grade: "Grade 6 & 7", medium: "English", fee: "Rs. 1,800/month", day: "Wed & Sat", time: "9:00 – 11:00 AM", color: "#1e3a5f", badge: "New Batch" },
];

const testimonials = [
  { name: "Dilnoza Perera", grade: "Grade 11 (2023)", text: "Sir's mathematics classes helped me achieve an A grade for O/Levels. His explanations are crystal clear and he never gives up on any student.", rating: 5 },
  { name: "Kavindra Silva", grade: "Grade 9 (2024)", text: "Science used to be my weakest subject. After joining these classes, I topped my school term exam. Very grateful!", rating: 5 },
  { name: "Nimal Fernando", grade: "Parent, Colombo", text: "Excellent teacher with genuine concern for every student. The structured timetable and regular progress updates give us confidence.", rating: 5 },
];

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a2744 0%, #2d4a7a 60%, #1e3a5f 100%)",
          minHeight: "88vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
              <span style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.08em" }}>Colombo's Trusted Tuition Centre</span>
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "clamp(2.2rem, 5vw, 3.5rem)", lineHeight: 1.2, fontWeight: 700, marginBottom: "1.25rem" }}>
              Excel in Every Subject with Expert Guidance
            </h1>

            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: "480px", marginBottom: "2.5rem" }}>
              Personalized tuition classes for Grade 6–11 students in Mathematics, Science, and English. Both Sinhala and English medium available in Colombo.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("register")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}
              >
                Register Now <ArrowRight size={16} />
              </button>
              <button
                onClick={() => onNavigate("classes")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg hover:opacity-80 transition-opacity"
                style={{ border: "1.5px solid rgba(255,255,255,0.3)", color: "#ffffff", fontSize: "0.95rem" }}
              >
                View Classes <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=500&fit=crop&auto=format"
                alt="Students studying in class"
                className="rounded-2xl shadow-2xl w-full object-cover"
                style={{ height: "400px" }}
              />
              <div className="absolute -bottom-5 -left-5 p-4 rounded-xl shadow-xl" style={{ background: "#ffffff" }}>
                <div style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 500 }}>98%</div>
                <div style={{ color: "var(--primary)", fontSize: "0.78rem" }}>Pass Rate (O/Levels)</div>
              </div>
              <div className="absolute -top-4 -right-4 p-3 rounded-xl shadow-xl flex items-center gap-2" style={{ background: "var(--primary)" }}>
                <Star size={16} style={{ color: "var(--accent)" }} fill="currentColor" />
                <span style={{ color: "#ffffff", fontSize: "0.85rem", fontWeight: 600 }}>4.9 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: "var(--accent)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, color: "var(--primary)" }}>{s.value}</div>
              <div style={{ color: "rgba(26,39,68,0.7)", fontSize: "0.875rem", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Classes */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>WHAT WE OFFER</p>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "2rem", fontWeight: 700 }}>Featured Classes</h2>
          </div>
          <button onClick={() => onNavigate("classes")} className="flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: "var(--accent)", fontWeight: 500, fontSize: "0.9rem" }}>
            See all classes <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredClasses.map((cls, i) => (
            <div key={i} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="p-5" style={{ background: cls.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "1.3rem", fontWeight: 600 }}>{cls.subject}</h3>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginTop: "0.25rem" }}>{cls.grade}</p>
                  </div>
                  {cls.badge && (
                    <span className="px-2 py-1 rounded-md" style={{ background: "var(--accent)", color: "var(--primary)", fontSize: "0.7rem", fontWeight: 600 }}>{cls.badge}</span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Medium", val: cls.medium },
                    { label: "Schedule", val: `${cls.day}, ${cls.time}` },
                    { label: "Monthly Fee", val: cls.fee },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{label}</span>
                      <span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate("register")}
                  className="w-full mt-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 500, fontSize: "0.875rem" }}
                >
                  Enroll Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About strip */}
      <section style={{ background: "var(--secondary)" }}>
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <img
              src="https://images.unsplash.com/photo-1571260898995-e7f353571ab8?w=560&h=420&fit=crop&auto=format"
              alt="Teacher in classroom"
              className="rounded-2xl shadow-lg w-full object-cover"
              style={{ height: "360px" }}
            />
          </div>
          <div>
            <p style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>MEET YOUR TEACHER</p>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
              Mr. Aravinda Bandara
            </h2>
            <p style={{ color: "var(--muted-foreground)", lineHeight: 1.8, marginBottom: "1.25rem", fontSize: "0.95rem" }}>
              B.Sc. (Special) in Mathematics from University of Colombo. Over 12 years of teaching experience at both national school and private tuition level. Dedicated to making every student reach their highest potential.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {["Former National School Teacher (Grade A)", "Expertise in O/Level & A/Level preparation", "Proven exam technique coaching", "Individual attention for every student"].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8.5 2.5" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ color: "var(--foreground)", fontSize: "0.88rem" }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onNavigate("about")} className="flex items-center gap-2 px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500, fontSize: "0.9rem" }}>
              Learn More <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p style={{ color: "var(--accent)", fontSize: "0.8rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>WHAT STUDENTS SAY</p>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "2rem", fontWeight: 700 }}>Testimonials</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={14} style={{ color: "var(--accent)" }} fill="currentColor" />
                ))}
              </div>
              <p style={{ color: "var(--foreground)", lineHeight: 1.75, fontSize: "0.9rem", marginBottom: "1.25rem", fontStyle: "italic" }}>"{t.text}"</p>
              <div>
                <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem" }}>{t.name}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: "0.1rem" }}>{t.grade}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-6 mb-16 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #1a2744 0%, #2d4a7a 100%)", maxWidth: "1200px", margin: "0 auto 5rem" }}>
        <div className="px-10 py-14 text-center">
          <h2 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 700, marginBottom: "1rem" }}>
            Ready to Boost Your Grades?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", marginBottom: "2rem" }}>
            Limited seats available. Register today to secure your spot.
          </p>
          <button
            onClick={() => onNavigate("register")}
            className="px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 700, fontSize: "1rem" }}
          >
            Register Now — It's Free
          </button>
        </div>
      </section>
    </div>
  );
}
