export interface ClassSession { dayOfWeek: number; startTime: string; endTime: string; room: string }
export interface TuitionClass {
  id: number; subject: string; grade: string; medium: string; fee: number;
  description: string; capacity: number; enrolled: number; seatsLeft: number; sessions: ClassSession[];
  isActive: boolean; createdAt: string; updatedAt: string;
}
export interface Announcement { id: number; title: string; content: string; type: 'general'|'important'|'warning'|'info'|'new'; tags: string[]; publishedAt: string }
export interface Material { id: number; title: string; subject: string; grade: string; type: 'pdf'|'video'|'image'; sizeBytes: number; isFree: boolean; downloadsCount: number; createdAt: string }
export interface Paginated<T> { data: T[]; total: number; page: number; perPage: number }
export interface Student {
  id: number; fullName: string; dateOfBirth: string | null; address: string | null;
  preferredGrade: string | null; preferredSubject: string; preferredMedium: string | null;
  studentPhone: string | null; parentName: string | null; parentPhone: string | null; email: string | null; school: string | null;
  previousResults: string | null; source: string | null;
  status: 'pending'|'active'|'inactive'; enrolledAt: string | null; accessCode: string | null;
  registeredClassId: number | null; classSubject: string | null; classGrade: string | null; createdAt: string; updatedAt: string;
}
export interface ContactMessage { id: number; name: string; phone: string|null; email: string|null; message: string; readAt: string|null; createdAt: string }
export interface DashboardStats { totalStudents: number; activeStudents: number; classesRunning: number; monthlyRevenue: number; enrollmentByMonth: { month: string; students: number }[] }
export interface AdminUser { id: number; name: string; email: string }
