import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen, Bell, FileText, BarChart3, Plus, Trash2, Edit2, X, TrendingUp, Mail, Check, Copy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import type { AdminUser, Announcement, ContactMessage, DashboardStats, Material, Paginated, Student, TuitionClass } from "../lib/types";
import { scheduleLabel, DAY_NAMES, fmtTime, humanSize } from "../lib/format";

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

type ScheduleSlot = { dayOfWeek: number; startTime: string; endTime: string; room: string };

type ClassForm = {
  subject: string;
  grade: string;
  medium: string;
  fee: number;
  capacity: number;
  description: string;
  isActive: boolean;
  sessions: ScheduleSlot[];
};

const emptyClassForm: ClassForm = {
  subject: "Mathematics",
  grade: "Grade 6",
  medium: "Sinhala",
  fee: 2000,
  capacity: 20,
  description: "",
  isActive: true,
  sessions: [{ dayOfWeek: 1, startTime: "16:00", endTime: "18:00", room: "" }],
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

  // Classes state
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<TuitionClass | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>(emptyClassForm);
  const [classFormErrors, setClassFormErrors] = useState<Record<string, string>>({});
  const [classSaving, setClassSaving] = useState(false);

  // Announcements state
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<Announcement["type"]>("general");
  const [annSaving, setAnnSaving] = useState(false);
  const { data: announcements, loading: annLoading, error: annError, refresh: refreshAnnouncements } = useApi<Announcement[]>(
    user ? "/api/admin/announcements" : null
  );

  // Materials state
  const [matTitle, setMatTitle] = useState("");
  const [matSubject, setMatSubject] = useState("Mathematics");
  const [matGrade, setMatGrade] = useState("Grade 6");
  const [matType, setMatType] = useState<Material["type"]>("pdf");
  const [matFree, setMatFree] = useState(false);
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matSaving, setMatSaving] = useState(false);
  const { data: materials, loading: matLoading, error: matError, refresh: refreshMaterials } = useApi<Material[]>(
    user ? "/api/admin/materials" : null
  );

  // Messages state
  const { data: messages, loading: msgLoading, error: msgError, refresh: refreshMessages } = useApi<ContactMessage[]>(
    user ? "/api/admin/messages" : null
  );

  const unreadCount = messages?.filter(m => !m.readAt).length ?? 0;

  const { data: classes, loading: classesLoading, error: classesError, refresh: refreshClasses } = useApi<TuitionClass[]>(
    user ? "/api/admin/classes" : null
  );

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

  const openAddClassForm = () => {
    setEditingClass(null);
    setClassForm(emptyClassForm);
    setClassFormErrors({});
    setShowClassForm(true);
  };

  const openEditClassForm = (cls: TuitionClass) => {
    setEditingClass(cls);
    setClassForm({
      subject: cls.subject,
      grade: cls.grade,
      medium: cls.medium,
      fee: cls.fee,
      capacity: cls.capacity,
      description: cls.description || "",
      isActive: true,
      sessions: cls.sessions.length > 0 ? cls.sessions.map(s => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, room: s.room || "" })) : [{ dayOfWeek: 1, startTime: "16:00", endTime: "18:00", room: "" }],
    });
    setClassFormErrors({});
    setShowClassForm(true);
  };

  const handleSaveClass = async () => {
    setClassFormErrors({});
    setClassSaving(true);
    const payload = {
      subject: classForm.subject,
      grade: classForm.grade,
      medium: classForm.medium,
      fee: classForm.fee,
      capacity: classForm.capacity,
      description: classForm.description,
      isActive: classForm.isActive,
      sessions: classForm.sessions,
    };
    try {
      if (editingClass) {
        await api.put(`/api/admin/classes/${editingClass.id}`, payload);
      } else {
        await api.post("/api/admin/classes", payload);
      }
      setShowClassForm(false);
      setEditingClass(null);
      setClassForm(emptyClassForm);
      refreshClasses();
    } catch (e: any) {
      if (e.status === 422 && e.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.errors)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        setClassFormErrors(mapped);
      } else {
        setClassFormErrors({ _general: e.message || "Save failed" });
      }
    } finally {
      setClassSaving(false);
    }
  };

  const handleDeleteClass = async (cls: TuitionClass) => {
    if (!confirm(`Delete ${cls.subject} — ${cls.grade}? This cannot be undone.`)) return;
    try {
      await api.del(`/api/admin/classes/${cls.id}`);
      refreshClasses();
    } catch (e: any) {
      alert(e.message || "Failed to delete class");
    }
  };

  const addScheduleSlot = () => {
    setClassForm(f => ({
      ...f,
      sessions: [...f.sessions, { dayOfWeek: 1, startTime: "16:00", endTime: "18:00", room: "" }],
    }));
  };

  const removeScheduleSlot = (idx: number) => {
    setClassForm(f => ({
      ...f,
      sessions: f.sessions.filter((_, i) => i !== idx),
    }));
  };

  const updateScheduleSlot = (idx: number, field: keyof ScheduleSlot, value: string | number) => {
    setClassForm(f => ({
      ...f,
      sessions: f.sessions.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  // Announcements handlers
  const handlePublishAnnouncement = async () => {
    setAnnSaving(true);
    try {
      await api.post("/api/admin/announcements", { title: annTitle, content: annContent, type: annType });
      setAnnTitle("");
      setAnnContent("");
      setAnnType("general");
      refreshAnnouncements();
    } catch (e: any) {
      alert(e.message || "Failed to publish announcement");
    } finally {
      setAnnSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api.del(`/api/admin/announcements/${id}`);
      refreshAnnouncements();
    } catch (e: any) {
      alert(e.message || "Failed to delete announcement");
    }
  };

  // Materials handlers
  const handleUploadMaterial = async () => {
    if (!matFile) { alert("Please select a file"); return; }
    setMatSaving(true);
    const fd = new FormData();
    fd.append("title", matTitle);
    fd.append("subject", matSubject);
    fd.append("grade", matGrade);
    fd.append("type", matType);
    fd.append("isFree", String(matFree));
    fd.append("file", matFile);
    try {
      await api.upload("/api/admin/materials", fd);
      setMatTitle("");
      setMatSubject("Mathematics");
      setMatGrade("Grade 6");
      setMatType("pdf");
      setMatFree(false);
      setMatFile(null);
      refreshMaterials();
    } catch (e: any) {
      alert(e.message || "Failed to upload material");
    } finally {
      setMatSaving(false);
    }
  };

  const handleToggleFree = async (m: Material) => {
    try {
      const res = await api.patch<{ ok: boolean; isFree: boolean }>(`/api/admin/materials/${m.id}/free-toggle`);
      refreshMaterials();
    } catch (e: any) {
      alert(e.message || "Failed to toggle free access");
    }
  };

  const handleDeleteMaterial = async (m: Material) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      await api.del(`/api/admin/materials/${m.id}`);
      refreshMaterials();
    } catch (e: any) {
      alert(e.message || "Failed to delete material");
    }
  };

  // Messages handlers
  const handleMarkRead = async (msg: ContactMessage) => {
    try {
      await api.patch(`/api/admin/messages/${msg.id}`);
      refreshMessages();
    } catch (e: any) {
      alert(e.message || "Failed to mark as read");
    }
  };

  const handleDeleteMessage = async (msg: ContactMessage) => {
    if (!confirm("Delete this message?")) return;
    try {
      await api.del(`/api/admin/messages/${msg.id}`);
      refreshMessages();
    } catch (e: any) {
      alert(e.message || "Failed to delete message");
    }
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
                {tab.id === "messages" && unreadCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full text-[0.65rem] font-bold" style={{ background: "#e74c3c", color: "#fff" }}>{unreadCount}</span>
                )}
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
                {tab.id === "messages" && unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold" style={{ background: "#e74c3c", color: "#fff" }}>{unreadCount}</span>
                )}
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
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Classes Management</h2>
                <button onClick={openAddClassForm} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" }}>
                  <Plus size={15} /> Add Class
                </button>
              </div>

              {showClassForm && (
                <div className="p-5 rounded-2xl mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>{editingClass ? "Edit Class" : "Add New Class"}</h3>
                    <button onClick={() => { setShowClassForm(false); setEditingClass(null); }}><X size={16} style={{ color: "var(--muted-foreground)" }} /></button>
                  </div>
                  {classFormErrors._general && <p style={{ color: "#e74c3c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{classFormErrors._general}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Subject</label>
                      <select value={classForm.subject} onChange={e => setClassForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${classFormErrors.subject ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Grade</label>
                      <select value={classForm.grade} onChange={e => setClassForm(f => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${classFormErrors.grade ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Medium</label>
                      <select value={classForm.medium} onChange={e => setClassForm(f => ({ ...f, medium: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${classFormErrors.medium ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Fee (Rs.)</label>
                      <input type="number" value={classForm.fee} onChange={e => setClassForm(f => ({ ...f, fee: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${classFormErrors.fee ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }} />
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Capacity</label>
                      <input type="number" value={classForm.capacity} onChange={e => setClassForm(f => ({ ...f, capacity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: `1px solid ${classFormErrors.capacity ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.875rem" }} />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--foreground)", fontSize: "0.875rem" }}>
                        <input type="checkbox" checked={classForm.isActive} onChange={e => setClassForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                        Active
                      </label>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Description</label>
                    <textarea rows={2} value={classForm.description} onChange={e => setClassForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none resize-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }} placeholder="Optional description…" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500 }}>Schedule</label>
                      <button type="button" onClick={addScheduleSlot} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: "var(--secondary)", color: "var(--primary)" }}>
                        <Plus size={12} /> Add slot
                      </button>
                    </div>
                    {classForm.sessions.map((slot, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-2 mb-2 p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                        <div>
                          <label style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", display: "block", marginBottom: "0.2rem" }}>Day</label>
                          <select value={slot.dayOfWeek} onChange={e => updateScheduleSlot(idx, "dayOfWeek", Number(e.target.value))} className="px-2 py-1.5 rounded-lg outline-none text-xs" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                            {DAY_NAMES.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", display: "block", marginBottom: "0.2rem" }}>Start</label>
                          <input type="time" value={slot.startTime} onChange={e => updateScheduleSlot(idx, "startTime", e.target.value)} className="px-2 py-1.5 rounded-lg outline-none text-xs" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div>
                          <label style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", display: "block", marginBottom: "0.2rem" }}>End</label>
                          <input type="time" value={slot.endTime} onChange={e => updateScheduleSlot(idx, "endTime", e.target.value)} className="px-2 py-1.5 rounded-lg outline-none text-xs" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", display: "block", marginBottom: "0.2rem" }}>Room</label>
                          <input type="text" value={slot.room} onChange={e => updateScheduleSlot(idx, "room", e.target.value)} placeholder="e.g. Room A" className="w-full px-2 py-1.5 rounded-lg outline-none text-xs" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        </div>
                        {classForm.sessions.length > 1 && (
                          <button type="button" onClick={() => removeScheduleSlot(idx)} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#fdf2f2" }}>
                            <Trash2 size={12} style={{ color: "#e74c3c" }} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSaveClass} disabled={classSaving} className="px-5 py-2 rounded-lg disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                    {classSaving ? "Saving…" : "Save Class"}
                  </button>
                </div>
              )}

              {classesError && <p style={{ color: "#e74c3c", fontSize: "0.85rem", marginBottom: "1rem" }}>{classesError}</p>}

              {classesLoading ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Loading classes…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(classes ?? []).map((cls) => (
                    <div key={cls.id} className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>{cls.subject} — {cls.grade}</h3>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{cls.medium} Medium · {scheduleLabel(cls)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditClassForm(cls)} title="Edit" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "var(--secondary)" }}>
                            <Edit2 size={13} style={{ color: "var(--primary)" }} />
                          </button>
                          <button onClick={() => handleDeleteClass(cls)} title="Delete" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#fdf2f2" }}>
                            <Trash2 size={13} style={{ color: "#e74c3c" }} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{cls.enrolled}/{cls.capacity} students</span>
                        <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>Rs. {cls.fee.toLocaleString()}/month</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                        <div className="h-full rounded-full" style={{ width: `${cls.capacity > 0 ? (cls.enrolled / cls.capacity) * 100 : 0}%`, background: "var(--accent)" }} />
                      </div>
                    </div>
                  ))}
                  {(classes ?? []).length === 0 && (
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", gridColumn: "1 / -1" }}>No classes yet. Click "Add Class" to create one.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Announcements */}
          {activeTab === "announcements" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Announcements</h2>
              <div className="p-6 rounded-2xl mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex flex-col gap-3">
                  <div>
                    <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>Title</label>
                    <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Announcement title" className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                  </div>
                  <div>
                    <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>Content</label>
                    <textarea rows={4} value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Write the announcement details here…" className="w-full px-4 py-2.5 rounded-lg outline-none resize-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                  </div>
                  <div className="flex gap-3">
                    <select value={annType} onChange={e => setAnnType(e.target.value as Announcement["type"])} className="px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                      <option value="general">General</option>
                      <option value="important">Important</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                      <option value="new">New</option>
                    </select>
                    <button onClick={handlePublishAnnouncement} disabled={annSaving || !annTitle.trim() || !annContent.trim()} className="px-5 py-2 rounded-lg disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}>{annSaving ? "Publishing…" : "Publish"}</button>
                  </div>
                </div>
              </div>
              {annError && <p style={{ color: "#e74c3c", fontSize: "0.85rem", marginBottom: "1rem" }}>{annError}</p>}
              {annLoading ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Loading announcements…</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(announcements ?? []).map(ann => {
                    const chipBg = ann.type === "important" ? "#fff3e0" : ann.type === "warning" ? "#fce4ec" : ann.type === "info" ? "#e3f2fd" : ann.type === "new" ? "#e8f5e9" : "#f3f4f6";
                    const chipFg = ann.type === "important" ? "#e65100" : ann.type === "warning" ? "#c62828" : ann.type === "info" ? "#1565c0" : ann.type === "new" ? "#2e7d32" : "#555";
                    return (
                      <div key={ann.id} className="p-5 rounded-2xl flex items-start justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold" style={{ background: chipBg, color: chipFg }}>{ann.type}</span>
                            <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{ann.publishedAt}</span>
                          </div>
                          <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{ann.title}</h3>
                          <p style={{ color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.5 }}>{ann.content}</p>
                        </div>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} title="Delete" className="ml-4 p-1.5 rounded-md hover:opacity-70 transition-opacity shrink-0" style={{ background: "#fdf2f2" }}>
                          <Trash2 size={14} style={{ color: "#e74c3c" }} />
                        </button>
                      </div>
                    );
                  })}
                  {(announcements ?? []).length === 0 && <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>No announcements yet.</p>}
                </div>
              )}
            </div>
          )}

          {/* Materials */}
          {activeTab === "materials" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Materials</h2>
              <div className="p-6 rounded-2xl mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex flex-col gap-3">
                  <div>
                    <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>Title</label>
                    <input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Material title" className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Subject</label>
                      <select value={matSubject} onChange={e => setMatSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {SUBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Grade</label>
                      <select value={matGrade} onChange={e => setMatGrade(e.target.value)} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {GRADES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Type</label>
                      <select value={matType} onChange={e => setMatType(e.target.value as Material["type"])} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        <option value="pdf">PDF</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center py-8 rounded-xl cursor-pointer" style={{ border: `2px dashed ${matFile ? "var(--accent)" : "var(--border)"}`, color: matFile ? "var(--primary)" : "var(--muted-foreground)", fontSize: "0.875rem" }}>
                      <input type="file" className="hidden" onChange={e => setMatFile(e.target.files?.[0] ?? null)} />
                      {matFile ? matFile.name : "Click to upload file (PDF, MP4, etc.)"}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="freeAccess" checked={matFree} onChange={e => setMatFree(e.target.checked)} className="rounded" />
                    <label htmlFor="freeAccess" style={{ color: "var(--foreground)", fontSize: "0.875rem" }}>Free access (no login required)</label>
                  </div>
                  <button onClick={handleUploadMaterial} disabled={matSaving || !matTitle.trim() || !matFile} className="px-5 py-2.5 rounded-lg w-fit disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600 }}>{matSaving ? "Uploading…" : "Upload Material"}</button>
                </div>
              </div>
              {matError && <p style={{ color: "#e74c3c", fontSize: "0.85rem", marginBottom: "1rem" }}>{matError}</p>}
              {matLoading ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Loading materials…</p>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "var(--secondary)" }}>
                        {["Title", "Size", "Access", "Downloads", "Actions"].map(h => (
                          <th key={h} className="text-left px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(materials ?? []).map((m, i) => (
                        <tr key={m.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "var(--card)" : "var(--background)" }}>
                          <td className="px-4 py-3" style={{ color: "var(--primary)", fontWeight: 500, fontSize: "0.88rem" }}>{m.title}</td>
                          <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{humanSize(m.sizeBytes)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleToggleFree(m)} className="px-2 py-0.5 rounded-full text-[0.72rem] font-semibold cursor-pointer hover:opacity-80 transition-opacity" style={{ background: m.isFree ? "#e6f7ee" : "var(--secondary)", color: m.isFree ? "#1e7e34" : "var(--muted-foreground)" }}>
                              {m.isFree ? "Free" : "Members"}
                            </button>
                          </td>
                          <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{m.downloadsCount}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <a href={`/api/materials/${m.id}/download`} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "var(--secondary)" }} title="Download">
                                <FileText size={14} style={{ color: "var(--primary)" }} />
                              </a>
                              <button onClick={() => handleDeleteMaterial(m)} title="Delete" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#fdf2f2" }}>
                                <Trash2 size={14} style={{ color: "#e74c3c" }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(materials ?? []).length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>No materials uploaded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {activeTab === "messages" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Messages {unreadCount > 0 && <span style={{ color: "#e74c3c", fontSize: "0.9rem", fontWeight: 500 }}>({unreadCount} unread)</span>}</h2>
              {msgError && <p style={{ color: "#e74c3c", fontSize: "0.85rem", marginBottom: "1rem" }}>{msgError}</p>}
              {msgLoading ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Loading messages…</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(messages ?? []).map(msg => (
                    <div key={msg.id} className="p-5 rounded-2xl flex items-start justify-between" style={{ background: "var(--card)", border: `1px solid ${!msg.readAt ? "var(--accent)" : "var(--border)"}`, borderLeftWidth: !msg.readAt ? "3px" : "1px" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.readAt && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#e74c3c" }} />}
                          <span style={{ color: !msg.readAt ? "var(--primary)" : "var(--foreground)", fontWeight: !msg.readAt ? 600 : 400, fontSize: "0.95rem" }}>{msg.name}</span>
                          {msg.phone && <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>· {msg.phone}</span>}
                          {msg.email && <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>· {msg.email}</span>}
                          <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>· {msg.createdAt}</span>
                        </div>
                        <p style={{ color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.5 }}>{msg.message}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        {!msg.readAt && (
                          <button onClick={() => handleMarkRead(msg)} title="Mark as read" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#e6f7ee" }}>
                            <Check size={14} style={{ color: "#1e7e34" }} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteMessage(msg)} title="Delete" className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ background: "#fdf2f2" }}>
                          <Trash2 size={14} style={{ color: "#e74c3c" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(messages ?? []).length === 0 && <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>No messages yet.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
