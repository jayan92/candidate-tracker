import { NavLink, Route, Routes } from "react-router-dom";

import { ApplicationForm } from "./pages/ApplicationForm";
import { ApplicationsList } from "./pages/ApplicationsList";
import { CandidateDetail } from "./pages/CandidateDetail";
import { CandidatesList } from "./pages/CandidatesList";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./pages/NotFound";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

export const App = () => (
  <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-3">
        <span className="mr-4 font-semibold text-slate-900">
          Candidate Tracker
        </span>
        <NavLink to="/" end className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/candidates" className={navLinkClass}>
          Candidates
        </NavLink>
        <NavLink to="/applications" className={navLinkClass}>
          Applications
        </NavLink>
      </nav>
    </header>

    <main className="mx-auto max-w-6xl px-6 py-8">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/candidates" element={<CandidatesList />} />
        <Route path="/candidates/:id" element={<CandidateDetail />} />
        <Route path="/applications" element={<ApplicationsList />} />
        <Route path="/applications/new" element={<ApplicationForm />} />
        <Route path="/applications/:id" element={<ApplicationForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  </div>
);
