import { useState } from "react";
import { Users, BookOpen, Bell, FileText, BarChart3, Plus, Trash2, Edit2, X, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const adminPassword = "admin123";

const initialStudents = [
  { id: 1, name: "Dilnoza Perera", grade: "Grade 11", subject: "Mathematics", phone: "071 234 5678", enrolled: "2024-09-01", status: "Active" },
  { id: 2, name: "Kavindra Silva", grade: "Grade 9", subject: "Science", phone: "077 345 6789", enrolled: "2024-09-05", status: "Active" },
  { id: 3, name: "Amali Fernando", grade: "Grade 10", subject: "Mathematics", phone: "076 456 7890", enrolled: "2024-09-10", status: "Active" },
  { id: 4, name: "Nimal Jayawardena", grade: "Grade 7", subject: "English", phone: "075 567 8901", enrolled: "2024-10-01", status: "Inactive" },
  { id: 5, name: "Sithum Rathnayake", grade: "Grade 11", subject: "Mathematics", phone: "071 678 9012", enrolled: "2024-09-15", status: "Active" },
];

const chartData = [
  { month: "Jul", students: 32 }, { month: "Aug", students: 38 }, { month: "Sep", students: 45 },
  { month: "Oct", students: 48 }, { month: "Nov", students: 51 }, { month: "Dec", students: 47 },
];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "students", label: "Students", icon: Users },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "materials", label: "Materials", icon: FileText },
];

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState(initialStudents);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", grade: "Grade 6", subject: "Mathematics", phone: "", enrolled: new Date().toISOString().split("T")[0], status: "Active" });

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm p-8 rounded-2xl shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--primary)" }}>
              <Users size={24} style={{ color: "var(--accent)" }} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Admin Login</h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "0.4rem" }}>Enter password to continue</p>
          </div>
          <div>
            <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Password</label>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { if (password === adminPassword) { setAuthenticated(true); setAuthError(""); } else { setAuthError("Incorrect password. Try: admin123"); } } }}
              className="w-full px-4 py-2.5 rounded-lg outline-none mb-3"
              style={{ background: "var(--input-background)", border: `1px solid ${authError ? "#e74c3c" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.9rem" }}
            />
            {authError && <p style={{ color: "#e74c3c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{authError}</p>}
            <button
              onClick={() => { if (password === adminPassword) { setAuthenticated(true); setAuthError(""); } else { setAuthError("Incorrect password. Try: admin123"); } }}
              className="w-full py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 600 }}
            >
              Login
            </button>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", textAlign: "center", marginTop: "1.5rem" }}>Demo password: admin123</p>
        </div>
      </div>
    );
  }

  const activeStudents = students.filter(s => s.status === "Active").length;

  return (
    <div style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--background)" }}>
      {/* Admin header */}
      <div style={{ background: "var(--primary)", borderBottom: "1px solid rgba(255,255,255,0.1)" }} className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "1.25rem", fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem" }}>Mr. Aravinda's Tuition Classes</p>
        </div>
        <button onClick={() => setAuthenticated(false)} className="px-3 py-1.5 rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Students", value: students.length, color: "var(--primary)" },
                  { label: "Active Students", value: activeStudents, color: "#2d9e5f" },
                  { label: "Classes Running", value: 6, color: "#1a6b9c" },
                  { label: "Monthly Revenue", value: "Rs. 127,500", color: "#7c3d8f" },
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
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }} />
                    <Bar dataKey="students" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Students */}
          {activeTab === "students" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.5rem", fontWeight: 700 }}>Students</h2>
                <button onClick={() => setShowAddStudent(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500, fontSize: "0.875rem" }}>
                  <Plus size={15} /> Add Student
                </button>
              </div>

              {showAddStudent && (
                <div className="p-5 rounded-2xl mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>Add New Student</h3>
                    <button onClick={() => setShowAddStudent(false)}><X size={16} style={{ color: "var(--muted-foreground)" }} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Name", name: "name", type: "text", placeholder: "Student name" },
                      { label: "Phone", name: "phone", type: "text", placeholder: "07X XXX XXXX" },
                    ].map(({ label, name, type, placeholder }) => (
                      <div key={name}>
                        <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>{label}</label>
                        <input type={type} placeholder={placeholder} value={(newStudent as any)[name]} onChange={e => setNewStudent(s => ({ ...s, [name]: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Grade</label>
                      <select value={newStudent.grade} onChange={e => setNewStudent(s => ({ ...s, grade: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500, display: "block", marginBottom: "0.3rem" }}>Subject</label>
                      <select value={newStudent.subject} onChange={e => setNewStudent(s => ({ ...s, subject: e.target.value }))} className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem" }}>
                        {["Mathematics", "Science", "English"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (newStudent.name && newStudent.phone) {
                        setStudents(prev => [...prev, { id: Date.now(), ...newStudent }]);
                        setNewStudent({ name: "", grade: "Grade 6", subject: "Mathematics", phone: "", enrolled: new Date().toISOString().split("T")[0], status: "Active" });
                        setShowAddStudent(false);
                      }
                    }}
                    className="px-5 py-2 rounded-lg"
                    style={{ background: "var(--accent)", color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}
                  >
                    Save Student
                  </button>
                </div>
              )}

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
                          <td className="px-4 py-3" style={{ color: "var(--primary)", fontWeight: 500, fontSize: "0.88rem" }}>{s.name}</td>
                          <td className="px-4 py-3" style={{ color: "var(--foreground)", fontSize: "0.85rem" }}>{s.grade}</td>
                          <td className="px-4 py-3" style={{ color: "var(--foreground)", fontSize: "0.85rem" }}>{s.subject}</td>
                          <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>{s.phone}</td>
                          <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{s.enrolled}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full" style={{ background: s.status === "Active" ? "#e6f7ee" : "#f5f5f5", color: s.status === "Active" ? "#1e7e34" : "#6c757d", fontSize: "0.72rem", fontWeight: 600 }}>{s.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setStudents(prev => prev.filter(st => st.id !== s.id))} className="p-1.5 rounded-md hover:opacity-70 transition-opacity">
                              <Trash2 size={14} style={{ color: "#e74c3c" }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
        </div>
      </div>
    </div>
  );
}
