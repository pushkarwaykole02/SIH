import LandingPage from "./pages/LandingPage";
import { Routes, Route } from "react-router-dom"
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotableAlumniPage from "./pages/NotableAlumniPage";
import NostalgiaRepoPage from "./pages/NostalgiaRepoPage";
import FAQPage from "./pages/FAQPage";
import AboutPage from "./pages/AboutPage";
import AlumniDashboard from './pages/AlumniDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import PendingVerification from './pages/PendingVerification';
import RejectedPage from './pages/RejectedPage';
import StudentRegister from './pages/StudentRegister';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/notable-alumni" element={<NotableAlumniPage />} />
        <Route path="/nostalgia" element={<NostalgiaRepoPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/alumni-dashboard" element={<AlumniDashboard />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/student-register" element={<StudentRegister />} />
        <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
        <Route path="/pending" element={<PendingVerification />} />
        <Route path="/rejected" element={<RejectedPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}

export default App
