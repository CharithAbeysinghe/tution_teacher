import { Bell, AlertCircle, Info, CheckCircle, Calendar } from "lucide-react";

const announcements = [
  {
    id: 1,
    title: "O/Level Intensive Revision — December 2024",
    date: "2024-11-20",
    type: "important",
    content: "Special intensive revision classes for Grade 11 O/Level students will commence from December 1st. Classes will be held daily (Mon–Sat) from 4:00–8:00 PM. Fee: Rs. 5,000 for the full programme. Please confirm attendance by November 28.",
    tags: ["Grade 11", "Mathematics", "Revision"],
  },
  {
    id: 2,
    title: "December Fee Payment Deadline",
    date: "2024-11-15",
    type: "warning",
    content: "Monthly fees for December must be paid by December 5th. Students with outstanding fees will not receive study materials for that month. Payment can be made in person or via bank transfer. Contact us for bank account details.",
    tags: ["All Students", "Fees"],
  },
  {
    id: 3,
    title: "New Study Materials Uploaded",
    date: "2024-11-10",
    type: "info",
    content: "Past papers for 2022 and 2023 O/Level Mathematics (both Sinhala and English medium) have been uploaded to the Materials section. Please download and practice before the next class.",
    tags: ["Mathematics", "Grade 10", "Grade 11"],
  },
  {
    id: 4,
    title: "Class Holiday — Deepavali",
    date: "2024-11-01",
    type: "normal",
    content: "There will be no classes on Monday, November 11 due to the Deepavali public holiday. All classes will resume on Tuesday, November 12. Wishing everyone a joyful celebration!",
    tags: ["All Students"],
  },
  {
    id: 5,
    title: "Grade 8 & 9 Science — New Batch Starting",
    date: "2024-10-28",
    type: "success",
    content: "A new batch for Grade 8 and 9 Science (Sinhala medium) will start from December 3rd. Available days: Tuesday & Friday, 3:30–6:30 PM. Only 5 seats remaining. Register soon!",
    tags: ["Science", "Grade 8", "Grade 9", "New Batch"],
  },
];

const typeConfig = {
  important: { icon: AlertCircle, color: "#c0392b", bg: "#fdf2f2", border: "#f5c6c6", label: "Important" },
  warning: { icon: Bell, color: "#b7770d", bg: "#fffbf0", border: "#f7e4a0", label: "Notice" },
  info: { icon: Info, color: "#1a6b9c", bg: "#f0f7ff", border: "#b8d9f5", label: "Info" },
  normal: { icon: Calendar, color: "#5c5c5c", bg: "#f9f9f9", border: "#e0e0e0", label: "General" },
  success: { icon: CheckCircle, color: "#1e7e34", bg: "#f2faf4", border: "#b8dfc5", label: "New" },
};

export function AnnouncementsPage() {
  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>NOTICE BOARD</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>Announcements</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Latest updates, notices, and class-related information.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-5">
        {announcements.map((ann) => {
          const config = typeConfig[ann.type as keyof typeof typeConfig];
          const Icon = config.icon;
          return (
            <div
              key={ann.id}
              className="p-6 rounded-2xl"
              style={{ background: config.bg, border: `1px solid ${config.border}` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.color + "18" }}>
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md mr-2" style={{ background: config.color + "20", color: config.color, fontSize: "0.7rem", fontWeight: 700 }}>{config.label}</span>
                      <h3 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.05rem", fontWeight: 600, display: "inline" }}>{ann.title}</h3>
                    </div>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {new Date(ann.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p style={{ color: "var(--foreground)", fontSize: "0.9rem", lineHeight: 1.7 }}>{ann.content}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ann.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-full" style={{ background: "var(--primary)", color: "#ffffff", fontSize: "0.72rem", fontWeight: 500 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
