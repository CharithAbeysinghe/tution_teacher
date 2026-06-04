import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { HomePage } from "./components/HomePage";
import { AboutPage } from "./components/AboutPage";
import { ClassesPage } from "./components/ClassesPage";
import { TimetablePage } from "./components/TimetablePage";
import { RegistrationPage } from "./components/RegistrationPage";
import { AnnouncementsPage } from "./components/AnnouncementsPage";
import { MaterialsPage } from "./components/MaterialsPage";
import { ContactPage } from "./components/ContactPage";
import { AdminPanel } from "./components/AdminPanel";

{/* MARKER-MAKE-KIT-INVOKED */}

type Page = "home" | "about" | "classes" | "timetable" | "register" | "announcements" | "materials" | "contact" | "admin";

const noFooterPages: Page[] = ["admin"];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const navigate = (page: string) => {
    setCurrentPage(page as Page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {currentPage !== "admin" && (
        <Navbar currentPage={currentPage} onNavigate={navigate} />
      )}

      <main className="flex-1">
        {currentPage === "home" && <HomePage onNavigate={navigate} />}
        {currentPage === "about" && <AboutPage />}
        {currentPage === "classes" && <ClassesPage onNavigate={navigate} />}
        {currentPage === "timetable" && <TimetablePage />}
        {currentPage === "register" && <RegistrationPage />}
        {currentPage === "announcements" && <AnnouncementsPage />}
        {currentPage === "materials" && <MaterialsPage />}
        {currentPage === "contact" && <ContactPage />}
        {currentPage === "admin" && <AdminPanel />}
      </main>

      {!noFooterPages.includes(currentPage) && (
        <Footer onNavigate={navigate} />
      )}
    </div>
  );
}
