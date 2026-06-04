import { useState } from "react";
import { CheckCircle } from "lucide-react";

const grades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"];
const subjects = ["Mathematics", "Science", "English"];
const mediums = ["Sinhala", "English"];

export function RegistrationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    studentName: "",
    dateOfBirth: "",
    grade: "",
    school: "",
    parentName: "",
    parentPhone: "",
    studentPhone: "",
    email: "",
    address: "",
    subject: "",
    medium: "",
    previousResults: "",
    howDidYouHear: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#e6f7ee" }}>
            <CheckCircle size={40} style={{ color: "#2d9e5f" }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "1rem" }}>
            Registration Submitted!
          </h2>
          <p style={{ color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            Thank you, <strong style={{ color: "var(--primary)" }}>{form.studentName}</strong>. Your registration has been received. Mr. Aravinda will contact you at <strong>{form.parentPhone}</strong> within 24 hours to confirm your enrollment.
          </p>
          <div className="p-4 rounded-xl mb-6" style={{ background: "#fff9e6", border: "1px solid #f5d87a" }}>
            <p style={{ color: "#7d5a00", fontSize: "0.85rem" }}>Please bring your previous term results on your first day of class.</p>
          </div>
          <button onClick={() => setSubmitted(false)} className="px-6 py-2.5 rounded-lg" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 500 }}>
            Register Another Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ background: "var(--primary)" }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--accent)", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>JOIN US</p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "#ffffff", fontSize: "2.2rem", fontWeight: 700 }}>Student Registration</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Fill in the form below to register for classes. All fields marked * are required.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Student Info */}
          <section className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.15rem", fontWeight: 600, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
              Student Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Full Name *", name: "studentName", type: "text", placeholder: "Student's full name", required: true },
                { label: "Date of Birth *", name: "dateOfBirth", type: "date", placeholder: "", required: true },
              ].map(({ label, name, type, placeholder, required }) => (
                <div key={name}>
                  <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>{label}</label>
                  <input
                    name={name} type={type} placeholder={placeholder} required={required}
                    value={(form as any)[name]} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg outline-none transition-all"
                    style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Grade *</label>
                <select name="grade" required value={form.grade} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }}>
                  <option value="">Select grade</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>School *</label>
                <input name="school" type="text" placeholder="Name of current school" required value={form.school} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
              </div>
            </div>
          </section>

          {/* Parent Info */}
          <section className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.15rem", fontWeight: 600, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
              Parent / Guardian Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Parent/Guardian Name *", name: "parentName", placeholder: "Full name", required: true },
                { label: "Parent Phone *", name: "parentPhone", placeholder: "07X XXX XXXX", required: true },
                { label: "Student Phone", name: "studentPhone", placeholder: "07X XXX XXXX (if applicable)", required: false },
                { label: "Email Address", name: "email", placeholder: "email@example.com", required: false },
              ].map(({ label, name, placeholder, required }) => (
                <div key={name}>
                  <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>{label}</label>
                  <input name={name} type="text" placeholder={placeholder} required={required} value={(form as any)[name]} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Home Address</label>
                <textarea name="address" placeholder="Full residential address" rows={2} value={form.address} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none resize-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
              </div>
            </div>
          </section>

          {/* Class Preference */}
          <section className="p-6 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontSize: "1.15rem", fontWeight: 600, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
              Class Preference
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Subject *</label>
                <select name="subject" required value={form.subject} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Preferred Medium *</label>
                <select name="medium" required value={form.medium} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }}>
                  <option value="">Select medium</option>
                  {mediums.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>Previous Term / Exam Results (optional)</label>
                <textarea name="previousResults" placeholder="e.g. Term 1 - 72%, Term 2 - 68% (Mathematics)" rows={2} value={form.previousResults} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none resize-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }} />
              </div>
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>How did you hear about us?</label>
                <select name="howDidYouHear" value={form.howDidYouHear} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg outline-none" style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }}>
                  <option value="">Select</option>
                  {["Friend / Family", "Facebook", "School Notice Board", "WhatsApp", "Google Search", "Other"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </section>

          <button type="submit" className="w-full py-3.5 rounded-xl hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "#ffffff", fontWeight: 600, fontSize: "1rem" }}>
            Submit Registration
          </button>
        </form>
      </div>
    </div>
  );
}
