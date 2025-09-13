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
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}

export default App
