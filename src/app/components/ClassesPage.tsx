import { useState } from "react";
import { Clock, DollarSign, Users, BookOpen } from "lucide-react";
import { useApi } from "../lib/hooks";
import { scheduleLabel } from "../lib/format";
import type { TuitionClass } from "../lib/types";

const grades = ["All", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"];
const subjects = ["All", "Mathematics", "Science", "English"];

interface ClassesPageProps {
  onNavigate: (page: string) => void;
}

export function ClassesPage({ onNavigate }: ClassesPageProps) {
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");

  const { data: allClasses, loading, error } = useApi<TuitionClass[]>("/api/classes");

  const filtered = (allClasses ?? []).filter(cls =>
    (selectedGrade === "All" || cls.grade === selectedGrade) &&
    (selectedSubject === "All" || cls.subject === selectedSubject)
  );

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-body)" }}>
        <div style={{ background: "var(--primary)" }} className="py-14 px-6">
          <div className="max-w-7xl mx-auto">
            <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>CURRICULUM</p>
            <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>All Classes</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem" }}>Loading classes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: "var(--font-body)" }}>
        <div style={{ background: "var(--primary)" }} className="py-14 px-6">
          <div className="max-w-7xl mx-auto">
            <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>CURRICULUM</p>
            <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>All Classes</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p style={{ color: "#e74c3c", fontSize: "0.95rem" }}>Could not load classes: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>CURRICULUM</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>All Classes</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Browse available classes and find the right fit for your grade.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }} className="px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex flex-wrap gap-2">
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", alignSelf: "center" }}>Grade:</span>
            {grades.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className="px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: selectedGrade === g ? "var(--primary)" : "var(--secondary)",
                  color: selectedGrade === g ? "#ffffff" : "var(--foreground)",
                  fontSize: "0.82rem",
                  fontWeight: selectedGrade === g ? 600 : 400,
                }}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", alignSelf: "center" }}>Subject:</span>
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className="px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: selectedSubject === s ? "var(--accent)" : "var(--secondary)",
                  color: selectedSubject === s ? "var(--primary)" : "var(--foreground)",
                  fontSize: "0.82rem",
                  fontWeight: selectedSubject === s ? 600 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classes grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filtered.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem" }}>No classes yet.</p>
        ) : (
          <>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{filtered.length} class{filtered.length !== 1 ? "es" : ""} found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((cls) => {
                const availability = cls.seatsLeft;
                const pct = (cls.enrolled / cls.capacity) * 100;
                return (
                  <div key={cls.id} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.15rem", fontWeight: 600 }}>{cls.subject}</h3>
                          <span style={{ color: "var(--accent)", fontSize: "0.78rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{cls.grade} · {cls.medium} Medium</span>
                        </div>
                        <span className="px-2 py-1 rounded-md" style={{ background: availability <= 3 ? "#fff3cd" : "var(--secondary)", color: availability <= 3 ? "#856404" : "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 600 }}>
                          {availability <= 0 ? "Full" : `${availability} seats left`}
                        </span>
                      </div>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.84rem", lineHeight: 1.6 }}>{cls.description}</p>
                    </div>

                    <div className="px-5 py-4">
                      <div className="flex flex-col gap-2.5 mb-4">
                        {[
                          { icon: Clock, text: scheduleLabel(cls) },
                          { icon: DollarSign, text: `Rs. ${cls.fee.toLocaleString()} / month` },
                          { icon: Users, text: `${cls.enrolled}/${cls.capacity} students enrolled` },
                        ].map(({ icon: Icon, text }, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Icon size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            <span style={{ color: "var(--foreground)", fontSize: "0.84rem" }}>{text}</span>
                          </div>
                        ))}
                      </div>
                      {/* Enrollment bar */}
                      <div className="mb-4">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 85 ? "#e67e22" : "var(--accent)" }} />
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate("register")}
                        className="w-full py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: availability <= 0 ? "var(--muted)" : "var(--primary)", color: availability <= 0 ? "var(--muted-foreground)" : "#ffffff", fontWeight: 500, fontSize: "0.875rem", cursor: availability <= 0 ? "not-allowed" : "pointer" }}
                        disabled={availability <= 0}
                      >
                        {availability <= 0 ? "Class Full — Join Waitlist" : "Enroll Now"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
