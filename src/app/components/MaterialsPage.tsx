import { FileText, Video, Download, Lock, Search } from "lucide-react";
import { useState } from "react";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { humanSize } from "../lib/format";
import type { Material } from "../lib/types";

const subjectFilters = ["All", "Mathematics", "Science", "English"];

export function MaterialsPage() {
  const { data: materials } = useApi<Material[]>("/api/materials");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [unlockFor, setUnlockFor] = useState<number | null>(null);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  const code = localStorage.getItem("member_access_code") || "";

  const filtered = (materials ?? []).filter(m =>
    (selectedSubject === "All" || m.subject === selectedSubject) &&
    (!showFreeOnly || m.isFree) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function buildHref(mat: Material) {
    const base = `/api/materials/${mat.id}/download`;
    if (!mat.isFree && code) return `${base}?code=${encodeURIComponent(code)}`;
    return base;
  }

  async function handleUnlock(matId: number) {
    setUnlockLoading(true);
    setUnlockError(null);
    try {
      await api.post("/api/materials/unlock", { code: unlockCode });
      localStorage.setItem("member_access_code", unlockCode);
      setUnlockFor(null);
      setUnlockCode("");
    } catch (e: any) {
      setUnlockError(e.message || "Unlock failed");
    } finally {
      setUnlockLoading(false);
    }
  }

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
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{humanSize(mat.sizeBytes)}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>·</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{mat.downloadsCount} downloads</span>
                </div>
              </div>
              {mat.isFree ? (
                <a
                  href={buildHref(mat)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg flex-shrink-0 hover:opacity-85 transition-opacity"
                  style={{
                    background: "var(--accent)",
                    color: "var(--primary)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Download size={13} />
                  Free
                </a>
              ) : code ? (
                <a
                  href={buildHref(mat)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg flex-shrink-0 hover:opacity-85 transition-opacity"
                  style={{
                    background: "var(--secondary)",
                    color: "var(--muted-foreground)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Download size={13} />
                  Members
                </a>
              ) : (
                <div className="flex flex-col items-end flex-shrink-0">
                  <button
                    onClick={() => { setUnlockFor(unlockFor === mat.id ? null : mat.id); setUnlockError(null); setUnlockCode(""); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:opacity-85 transition-opacity"
                    style={{
                      background: "var(--secondary)",
                      color: "var(--muted-foreground)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <Lock size={13} />
                    Members
                  </button>
                  {unlockFor === mat.id && (
                    <div className="mt-2 flex flex-col gap-1.5" style={{ minWidth: "220px" }}>
                      <input
                        placeholder="Enter access code"
                        value={unlockCode}
                        onChange={e => { setUnlockCode(e.target.value); setUnlockError(null); }}
                        className="px-3 py-2 rounded-lg outline-none"
                        style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.82rem" }}
                      />
                      {unlockError && <span style={{ color: "#dc2626", fontSize: "0.78rem" }}>{unlockError}</span>}
                      <button
                        onClick={() => handleUnlock(mat.id)}
                        disabled={unlockLoading || !unlockCode.trim()}
                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: "var(--primary)", color: "#ffffff" }}
                      >
                        {unlockLoading ? "Unlocking…" : "Unlock"}
                      </button>
                    </div>
                  )}
                </div>
              )}
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
