import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen, Bell, FileText, BarChart3, Plus, Trash2, Edit2, X, TrendingUp, Mail, Check, Copy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import type { AdminUser, DashboardStats, Student, Paginated } from "../lib/types";

const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"];
const SUBJECTS = ["Mathematics", "Science", "English"];
const MEDIUMS = ["Sinhala", "English"];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "students", label: "Students", icon: Users },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "materials", label: "Materials", icon: FileText },
  { id: "messages", label: "Messages", icon: Mail },
];

type StudentForm = {
  fullName: string;
  studentPhone: string;
  preferredGrade: string;
  preferredSubject: string;
  preferredMedium: string;
  status: "pending" | "active" | "inactive";
};

const emptyForm: StudentForm = {
  fullName: "",
  studentPhone: "",
  preferredGrade: "Grade 6",
  preferredSubject: "Mathematics",
  preferredMedium: "Sinhala",
  status: "pending",
};

export function AdminPanel() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Students state
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const studentsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", "15");
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    return `/api/admin/students?${params.toString()}`;
  }, [statusFilter, search, page]);

  const { data: paginatedStudents, loading: studentsLoading, error: studentsError, refresh: refreshStudents } = useApi<Paginated<Student>>(
    user ? studentsUrl : null
  );

  useEffect(() => {
    api.get<AdminUser>("/api/admin/me")
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const { data: stats, loading: statsLoading } = useApi<DashboardStats>(
    user ? "/api/admin/dashboard" : null
  );

  const handleLogin = async () => {
    setAuthError("");
    try {
      const u = await api.post<AdminUser>("/api/admin/login", { email: loginEmail, password: loginPassword });
      setUser(u);
      setLoginEmail("");
      setLoginPassword("");
    } catch (e: any) {
      setAuthError(e.status === 401 ? "Invalid email or password" : (e.message || "Login failed"));
    }
  };

  const handleLogout = async () => {
    await api.post("/api/admin/logout").catch(() => {});
    setUser(null);
    setActiveTab("dashboard");
  };

  const openAddForm = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (s: Student) => {
    setEditingStudent(s);
    setForm({
      fullName: s.fullName,
      studentPhone: s.studentPhone || "",
      preferredGrade: s.preferredGrade || "Grade 6",
      preferredSubject: s.preferredSubject,
      preferredMedium: s.preferredMedium || "Sinhala",
      status: s.status,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormErrors({});
    setSaving(true);
    try {
      if (editingStudent) {
        await api.put(`/api/admin/students/${editingStudent.id}`, form);
      } else {
        await api.post("/api/admin/students", {
          fullName: form.fullName,
          studentPhone: form.studentPhone,
          preferredGrade: form.preferredGrade,
          preferredSubject: form.preferredSubject,
          status: form.status,
        });
      }
      setShowForm(false);
      setEditingStudent(null);
      setForm(emptyForm);
      refreshStudents();
    } catch (e: any) {
      if (e.status === 422 && e.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.errors)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        setFormErrors(mapped);
      } else {
        setFormErrors({ _general: e.message || "Save failed" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (s: Student) => {
    try {
      await api.patch(`/api/admin/students/${s.id}`, { status: "active" });
      refreshStudents();
    } catch (e: any) {
      alert(e.message || "Failed to approve student");
    }
  };

  const handleDelete = async (s: Student) => {
    if (!confirm(`Delete ${s.fullName}? This cannot be undone.`)) return;
    try {
      await api.del(`/api/admin/students/${s.id}`);
      refreshStudents();
    } catch (e: any) {
      alert(e.message || "Failed to delete student");
    }
  };

  const handleCopyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const students = paginatedStudents?.data ?? [];
  const totalPages = paginatedStudents ? Math.max(1, Math.ceil(paginatedStudents.total / paginatedStudents.perPage)) : 1;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm p-8 rounded-2xl shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--primary)" }}>
              <Users size={24} style={{ color: "var(--accent)" }} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Admin Login</h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "0.4rem" }}>Enter your credentials to continue</p>
          </div>
          <div>
            <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Email</label>
            <input
              type="email"
              placeholder="admin@aravinda.com"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
              className="w-full px-4 py-2.5 rounded-lg outline-none mb-3"
              style={{ background: "var(--input-background)", border: `1px solid ${authError ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.9rem" }}
            />
            <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
              className="w-full px-4 py-2.5 rounded-lg outline-none mb-3"
              style={{ background: "var(--input-background)", border: `1px solid ${authError ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.9rem" }}
            />
            {authError && <p style={{ color: "#e74c3c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{authError}</p>}
            <button
              onClick={handleLogin}
              className="w-full py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 600 }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--background)" }}>
      {/* Admin header */}
      <div style={{ background: "var(--primary)", borderBottom: "1px solid rgba(255,255,255,0.1)" }} className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "1.25rem", fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem" }}>Mr. Aravinda's Tuition Classes</p>
        </div>
        <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>
          Logout
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-52 min-h-screen py-6 px-3" style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left"
                style={{
                  background: activeTab === tab.id ? "var(--primary)" : "transparent",
                  color: activeTab === tab.id ? "#ffffff" : "var(--muted-foreground)",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: "0.875rem",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden w-full overflow-x-auto" style={{ borderBottom: "1px solid var(--border)", background: "var(--card)", position: "fixed", zIndex: 40, top: "64px" }}>
          <div className="flex px-4 py-2 gap-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ background: activeTab === tab.id ? "var(--primary)" : "var(--secondary)", color: activeTab === tab.id ? "#ffffff" : "var(--foreground)", fontSize: "0.8rem" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8">

          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Dashboard</h2>
              {statsLoading ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Loading dashboard…</p>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: "Total Students", value: stats.totalStudents, color: "var(--primary)" },
                      { label: "Active Students", value: stats.activeStudents, color: "#2d9e5f" },
                      { label: "Classes Running", value: stats.classesRunning, color: "#1a6b9c" },
                      { label: "Monthly Revenue", value: `Rs. ${stats.monthlyRevenue.toLocaleString()}`, color: "#7c3d8f" },
                    ].map((stat, i) => (
                      <div key={i} className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div style={{ color: stat.color, fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>{stat.value}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem", marginBottom: "1.5rem" }}>Student Enrollment (Last 6 Months)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.enrollmentByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }} />
                        <Bar dataKey="students" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>No data available.</p>
              )}
            </div>
          )}

          {/* Students */}
          {activeTab === "students" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Students</h2>
                <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" }}>
                  <Plus size={15} /> Add Student
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {(["all", "pending", "active", "inactive"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setPage(1); }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: statusFilter === f ? "var(--primary)" : "var(--secondary)",
                      color: statusFilter === f ? "#ffffff" : "var(--muted-foreground)",
                    }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Search students…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="ml-auto px-3 py-1.5 rounded-lg outline-none text-xs"
                  style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", width: "220px" }}
                />
              </div>

              {/* Form panel */}
              {showForm && (
                <div className="p-5 rounded-2xl mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>{editingStudent ? "Edit Student" : "Add New Student"}</h3>
                    <button onClick={() => { setShowForm(false); setEditingStudent(null); }}><X size={16} style={{ color: "var(--muted-foreground)" }} /></button>
                  </div>
                  {formErrors._general && <p style={{ color: "#e74c3c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{formErrors._general}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Name</label>
                      <input type="text" placeholder="Student name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${formErrors.fullName ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }} />
                      {formErrors.fullName && <p style={{ color: "#e74c3c", fontSize: "0.72rem", marginTop: "0.2rem" }}>{formErrors.fullName}</p>}
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Phone</label>
                      <input type="text" placeholder="07X XXX XXXX" value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${formErrors.studentPhone ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }} />
                      {formErrors.studentPhone && <p style={{ color: "#e74c3c", fontSize: "0.72rem", marginTop: "0.2rem" }}>{formErrors.studentPhone}</p>}
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Grade</label>
                      <select value={form.preferredGrade} onChange={e => setForm(f => ({ ...f, preferredGrade: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Subject</label>
                      <select value={form.preferredSubject} onChange={e => setForm(f => ({ ...f, preferredSubject: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {editingStudent && (
                      <div>
                        <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Medium</label>
                        <select value={form.preferredMedium} onChange={e => setForm(f => ({ ...f, preferredMedium: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                          {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    )}
                    {!editingStudent && (
                      <div>
                        <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Status</label>
                        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StudentForm["status"] }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 rounded-lg disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}
                  >
                    {saving ? "Saving…" : "Save Student"}
                  </button>
                </div>
              )}

              {studentsError && <p style={{ color: "#e74c3c", fontSize: "0.85rem", marginBottom: "1rem" }}>{studentsError}</p>}

              {studentsLoading ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Loading students…</p>
              ) : (
                <>
                  <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: "var(--secondary)" }}>
                            {["Name", "Grade", "Subject", "Phone", "Enrolled", "Status", "Actions"].map(h => (
                              <th key={h} className="text-left px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => (
                            <tr key={s.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "var(--card)" : "var(--background)" }}>
                              <td className="px-4 py-3" style={{ color: "var(--primary)", fontWeight: 500, fontSize: "0.88rem" }}>{s.fullName}</td>
                              <td className="px-4 py-3" style={{ color: "var(--foreground)", fontSize: "0.85rem" }}>{s.preferredGrade}</td>
                              <td className="px-4 py-3" style={{ color: "var(--foreground)", fontSize: "0.85rem" }}>{s.preferredSubject}</td>
                              <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>{s.studentPhone || "—"}</td>
                              <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{s.enrolledAt || "—"}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full" style={{
                                  background: s.status === "active" ? "#e6f7ee" : s.status === "pending" ? "#fff8e1" : "#f5f5f5",
                                  color: s.status === "active" ? "#1e7e34" : s.status === "pending" ? "#c88600" : "#6c757d",
                                  fontSize: "0.72rem", fontWeight: 600
                                }}>{s.status}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {s.status === "pending" && (
                                    <button onClick={() => handleApprove(s)} title="Approve" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#e6f7ee" }}>
                                      <Check size={14} style={{ color: "#1e7e34" }} />
                                    </button>
                                  )}
                                  <button onClick={() => openEditForm(s)} title="Edit" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "var(--secondary)" }}>
                                    <Edit2 size={14} style={{ color: "var(--primary)" }} />
                                  </button>
                                  <button onClick={() => handleDelete(s)} title="Delete" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#fdf2f2" }}>
                                    <Trash2 size={14} style={{ color: "#e74c3c" }} />
                                  </button>
                                  {s.status === "active" && s.accessCode && (
                                    <button onClick={() => handleCopyCode(s.accessCode!, s.id)} title="Copy access code" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "var(--secondary)" }}>
                                      {copiedId === s.id ? (
                                        <span style={{ color: "#1e7e34", fontSize: "0.7rem", fontWeight: 600 }}>Copied!</span>
                                      ) : (
                                        <Copy size={14} style={{ color: "var(--primary)" }} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>No students found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>Prev</button>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>Page {page} of {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Classes */}
          {activeTab === "classes" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Classes Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { subject: "Mathematics", grade: "Grade 10", medium: "Sinhala", fee: "Rs. 2,500", enrolled: 18, seats: 20, schedule: "Mon & Thu, 4–6 PM" },
                  { subject: "Mathematics", grade: "Grade 11", medium: "English", fee: "Rs. 2,500", enrolled: 12, seats: 15, schedule: "Mon & Thu, 6–8 PM" },
                  { subject: "Science", grade: "Grade 8", medium: "Sinhala", fee: "Rs. 2,000", enrolled: 14, seats: 20, schedule: "Tue & Fri, 3:30–5 PM" },
                  { subject: "Science", grade: "Grade 9", medium: "Sinhala", fee: "Rs. 2,000", enrolled: 16, seats: 20, schedule: "Tue & Fri, 5–6:30 PM" },
                  { subject: "English", grade: "Grade 6", medium: "English", fee: "Rs. 1,800", enrolled: 10, seats: 15, schedule: "Wed & Sat, 9–10:30 AM" },
                  { subject: "English", grade: "Grade 7", medium: "English", fee: "Rs. 1,800", enrolled: 11, seats: 15, schedule: "Wed & Sat, 10:30–12 PM" },
                ].map((cls, i) => (
                  <div key={i} className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>{cls.subject} — {cls.grade}</h3>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{cls.medium} Medium · {cls.schedule}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-md" style={{ background: "var(--secondary)" }}><Edit2 size={13} style={{ color: "var(--primary)" }} /></button>
                        <button className="p-1.5 rounded-md" style={{ background: "#fdf2f2" }}><Trash2 size={13} style={{ color: "#e74c3c" }} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{cls.enrolled}/{cls.seats} students</span>
                      <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>{cls.fee}/month</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(cls.enrolled / cls.seats) * 100}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {activeTab === "announcements" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Announcements</h2>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" }}>
                  <Plus size={15} /> New Announcement
                </button>
              </div>
              <div className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex flex-col gap-3 mb-4">
                  <div>
                    <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>Title</label>
                    <input placeholder="Announcement title" className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                  </div>
                  <div>
                    <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>Content</label>
                    <textarea rows={4} placeholder="Write the announcement details here…" className="w-full px-4 py-2.5 rounded-lg outline-none resize-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                  </div>
                  <div className="flex gap-3">
                    <select className="px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                      <option>Type: General</option>
                      <option>Type: Important</option>
                      <option>Type: Warning</option>
                      <option>Type: Info</option>
                    </select>
                    <button className="px-5 py-2 rounded-lg" style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}>Publish</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Materials */}
          {activeTab === "materials" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Materials</h2>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" }}>
                  <Plus size={15} /> Upload Material
                </button>
              </div>
              <div className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex flex-col gap-3">
                  <div>
                    <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>Title</label>
                    <input placeholder="Material title" className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {["Subject", "Grade", "Type"].map((label, i) => (
                      <div key={i}>
                        <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>{label}</label>
                        <select className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                          {label === "Subject" && ["Mathematics", "Science", "English"].map(o => <option key={o}>{o}</option>)}
                          {label === "Grade" && ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"].map(o => <option key={o}>{o}</option>)}
                          {label === "Type" && ["PDF", "Video", "Image"].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center py-8 rounded-xl cursor-pointer" style={{ border: "2px dashed var(--border)", color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                      <input type="file" className="hidden" />
                      Click to upload file (PDF, MP4, etc.)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="freeAccess" className="rounded" />
                    <label htmlFor="freeAccess" style={{ color: "var(--foreground)", fontSize: "0.875rem" }}>Free access (no login required)</label>
                  </div>
                  <button className="px-5 py-2.5 rounded-lg w-fit" style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600 }}>Upload Material</button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {activeTab === "messages" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Messages</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Coming in next step</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
