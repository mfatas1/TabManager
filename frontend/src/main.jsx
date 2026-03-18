import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home, Library, Share2 } from 'lucide-react';
import './index.css';
import LandingPage from './pages/LandingPage.jsx';
import LinkList from './pages/LinkList.jsx';
import Graph from './pages/Graph.jsx';
import { NavBar } from './components/ui/tubelight-navbar.jsx';

const navItems = [
  { name: 'Home', url: '/', icon: Home },
  { name: 'Library', url: '/library', icon: Library },
  { name: 'Graph', url: '/graph', icon: Share2 },
];

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <NavBar items={navItems} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/library" element={<LinkList />} />
        <Route path="/graph" element={<Graph />} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </StrictMode>,
);
