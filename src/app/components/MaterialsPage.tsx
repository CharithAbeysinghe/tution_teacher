import { FileText, Video, Download, Lock, Search } from "lucide-react";
import { useState } from "react";

const materials = [
  { id: 1, title: "O/Level Mathematics — 2023 Past Paper (Sinhala)", subject: "Mathematics", grade: "Grade 11", type: "pdf", size: "2.4 MB", date: "2024-11-10", free: true, downloads: 245 },
  { id: 2, title: "O/Level Mathematics — 2023 Past Paper (English)", subject: "Mathematics", grade: "Grade 11", type: "pdf", size: "2.1 MB", date: "2024-11-10", free: true, downloads: 189 },
  { id: 3, title: "Algebra — Complete Notes (Grade 10)", subject: "Mathematics", grade: "Grade 10", type: "pdf", size: "3.8 MB", date: "2024-10-22", free: false, downloads: 102 },
  { id: 4, title: "Statistics Practice Questions — Worksheet 1", subject: "Mathematics", grade: "Grade 10", type: "pdf", size: "1.2 MB", date: "2024-10-15", free: true, downloads: 178 },
  { id: 5, title: "Science — Photosynthesis Video Lesson", subject: "Science", grade: "Grade 8", type: "video", size: "45 min", date: "2024-11-05", free: false, downloads: 67 },
  { id: 6, title: "Science — Chemical Reactions Worksheet", subject: "Science", grade: "Grade 9", type: "pdf", size: "980 KB", date: "2024-11-01", free: true, downloads: 134 },
  { id: 7, title: "English — Essay Writing Guide", subject: "English", grade: "Grade 7", type: "pdf", size: "1.6 MB", date: "2024-10-29", free: true, downloads: 98 },
  { id: 8, title: "English Comprehension — Advanced Exercises", subject: "English", grade: "Grade 7", type: "pdf", size: "2.2 MB", date: "2024-10-18", free: false, downloads: 55 },
];

const subjectFilters = ["All", "Mathematics", "Science", "English"];

export function MaterialsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const filtered = materials.filter(m =>
    (selectedSubject === "All" || m.subject === selectedSubject) &&
    (!showFreeOnly || m.free) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>STUDY RESOURCES</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>Learning Materials</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Download past papers, notes, worksheets, and video lessons.</p>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }} className="px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
            <input
              placeholder="Search materials…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg outline-none"
              style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {subjectFilters.map(s => (
              <button key={s} onClick={() => setSelectedSubject(s)} className="px-3 py-2 rounded-lg transition-all" style={{ background: selectedSubject === s ? "var(--primary)" : "var(--secondary)", color: selectedSubject === s ? "#ffffff" : "var(--foreground)", fontSize: "0.82rem", fontWeight: selectedSubject === s ? 600 : 400 }}>
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFreeOnly(!showFreeOnly)}
            className="px-3 py-2 rounded-lg transition-all"
            style={{ background: showFreeOnly ? "var(--accent)" : "var(--secondary)", color: showFreeOnly ? "var(--primary)" : "var(--foreground)", fontSize: "0.82rem", fontWeight: showFreeOnly ? 600 : 400 }}
          >
            Free Only
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""} found</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(mat => (
            <div key={mat.id} className="flex items-center gap-4 p-5 rounded-2xl hover:shadow-sm transition-shadow" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: mat.type === "video" ? "#7c3d8f20" : "#1a274420" }}>
                {mat.type === "video" ? <Video size={20} style={{ color: "#7c3d8f" }} /> : <FileText size={20} style={{ color: "var(--primary)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h3 style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.4 }}>{mat.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span style={{ color: "var(--accent)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{mat.subject}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>·</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{mat.grade}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>·</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{mat.size}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>·</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{mat.downloads} downloads</span>
                </div>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg flex-shrink-0 hover:opacity-85 transition-opacity"
                style={{
                  background: mat.free ? "var(--accent)" : "var(--secondary)",
                  color: mat.free ? "var(--primary)" : "var(--muted-foreground)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                {mat.free ? <Download size={13} /> : <Lock size={13} />}
                {mat.free ? "Free" : "Members"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--foreground)" }}>Members-only materials</strong> are available to currently enrolled students. Please contact Mr. Aravinda to receive your access code after registration.
          </p>
        </div>
      </div>
    </div>
  );
}
