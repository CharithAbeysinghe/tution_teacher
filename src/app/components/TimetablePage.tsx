const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const schedule: Record<string, { time: string; subject: string; grade: string; medium: string; room: string }[]> = {
  Monday: [
    { time: "4:00 – 6:00 PM", subject: "Mathematics", grade: "Grade 10", medium: "Sinhala", room: "Room A" },
    { time: "6:00 – 8:00 PM", subject: "Mathematics", grade: "Grade 11", medium: "English", room: "Room A" },
  ],
  Tuesday: [
    { time: "3:30 – 5:00 PM", subject: "Science", grade: "Grade 8", medium: "Sinhala", room: "Room B" },
    { time: "5:00 – 6:30 PM", subject: "Science", grade: "Grade 9", medium: "Sinhala", room: "Room B" },
  ],
  Wednesday: [
    { time: "9:00 – 10:30 AM", subject: "English", grade: "Grade 6", medium: "English", room: "Room C" },
    { time: "10:30 AM – 12:00 PM", subject: "English", grade: "Grade 7", medium: "English", room: "Room C" },
    { time: "4:00 – 6:00 PM", subject: "Mathematics", grade: "Grade 10", medium: "English", room: "Room A" },
  ],
  Thursday: [
    { time: "4:00 – 6:00 PM", subject: "Mathematics", grade: "Grade 10", medium: "Sinhala", room: "Room A" },
    { time: "6:00 – 8:00 PM", subject: "Mathematics", grade: "Grade 11", medium: "English", room: "Room A" },
  ],
  Friday: [
    { time: "3:30 – 5:00 PM", subject: "Science", grade: "Grade 8", medium: "Sinhala", room: "Room B" },
    { time: "5:00 – 6:30 PM", subject: "Science", grade: "Grade 9", medium: "Sinhala", room: "Room B" },
  ],
  Saturday: [
    { time: "9:00 – 10:30 AM", subject: "English", grade: "Grade 6", medium: "English", room: "Room C" },
    { time: "10:30 AM – 12:00 PM", subject: "English", grade: "Grade 7", medium: "English", room: "Room C" },
    { time: "2:00 – 4:00 PM", subject: "Mathematics", grade: "Grade 11 Revision", medium: "Sinhala/English", room: "Room A" },
  ],
  Sunday: [],
};

const subjectColors: Record<string, { bg: string; text: string }> = {
  Mathematics: { bg: "#1a2744", text: "#ffffff" },
  Science: { bg: "#2d6a4f", text: "#ffffff" },
  English: { bg: "#7c3d8f", text: "#ffffff" },
};

export function TimetablePage() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>WEEKLY SCHEDULE</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>Class Timetable</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.5rem", fontSize: "0.95rem" }}>2024 Academic Year — All times are in Sri Lanka Standard Time (SLST)</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-10">
          {Object.entries(subjectColors).map(([subject, colors]) => (
            <div key={subject} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ background: colors.bg }} />
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{subject}</span>
            </div>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-7 gap-3">
          {days.map(day => (
            <div key={day}>
              <div
                className="text-center py-3 rounded-xl mb-3"
                style={{
                  background: day === today ? "var(--accent)" : "var(--secondary)",
                  color: day === today ? "var(--primary)" : "var(--muted-foreground)",
                  fontWeight: day === today ? 700 : 500,
                  fontSize: "0.82rem",
                  letterSpacing: "0.05em",
                }}
              >
                {day.slice(0, 3).toUpperCase()}
                {day === today && <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", opacity: 0.7 }}>TODAY</div>}
              </div>
              <div className="flex flex-col gap-2">
                {schedule[day].length === 0 ? (
                  <div className="text-center py-6 rounded-xl" style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Rest Day</div>
                ) : (
                  schedule[day].map((cls, i) => {
                    const colors = subjectColors[cls.subject] || { bg: "var(--primary)", text: "#ffffff" };
                    return (
                      <div key={i} className="rounded-xl p-3" style={{ background: colors.bg }}>
                        <div style={{ color: colors.text, fontWeight: 600, fontSize: "0.78rem" }}>{cls.subject}</div>
                        <div style={{ color: colors.bg === "#ffffff" ? "var(--muted-foreground)" : "rgba(255,255,255,0.75)", fontSize: "0.7rem", marginTop: "2px" }}>{cls.grade}</div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.65rem", marginTop: "4px", fontFamily: "var(--font-mono)" }}>{cls.time}</div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.65rem" }}>{cls.room} · {cls.medium}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile list */}
        <div className="md:hidden flex flex-col gap-6">
          {days.map(day => (
            <div key={day}>
              <div
                className="px-4 py-2 rounded-xl mb-3 inline-block"
                style={{
                  background: day === today ? "var(--accent)" : "var(--secondary)",
                  color: day === today ? "var(--primary)" : "var(--muted-foreground)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                {day} {day === today && "— Today"}
              </div>
              {schedule[day].length === 0 ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", paddingLeft: "1rem" }}>No classes</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {schedule[day].map((cls, i) => {
                    const colors = subjectColors[cls.subject] || { bg: "var(--primary)", text: "#ffffff" };
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                        <div className="w-2 h-14 rounded-full flex-shrink-0" style={{ background: colors.bg }} />
                        <div>
                          <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem" }}>{cls.subject} — {cls.grade}</div>
                          <div style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginTop: "2px" }}>{cls.time} · {cls.room}</div>
                          <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{cls.medium} Medium</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-10 p-5 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #f5d87a" }}>
          <p style={{ color: "#7d5a00", fontSize: "0.85rem", lineHeight: 1.7 }}>
            <strong>Note:</strong> Schedules may change during exam seasons. Please check announcements regularly or contact us directly for the latest timetable. Special revision sessions are added before O/Level examinations.
          </p>
        </div>
      </div>
    </div>
  );
}
