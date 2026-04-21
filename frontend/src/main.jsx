// TabManager v2.0 - Updated frontend
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FolderKanban, Home, Library, Share2 } from 'lucide-react';
import './index.css';
import LandingPage from './pages/LandingPage.jsx';
import LinkList from './pages/LinkList.jsx';
import Graph from './pages/Graph.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import { NavBar } from './components/ui/tubelight-navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';

const navItems = [
  { name: 'Home', url: '/', icon: Home },
  { name: 'Library', url: '/library', icon: Library },
  { name: 'Graph', url: '/graph', icon: Share2 },
  { name: 'Projects', url: '/projects', icon: FolderKanban },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#1e1b2e]">
      <NavBar items={navItems} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/library" element={<ProtectedRoute><LinkList /></ProtectedRoute>} />
        <Route path="/graph" element={<ProtectedRoute><Graph /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
