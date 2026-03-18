import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import './index.css';
import LandingPage from './pages/LandingPage.jsx';
import LinkList from './pages/LinkList.jsx';
import Graph from './pages/Graph.jsx';

function AppShell({ children }) {
  return (
    <div className="app-root">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-dot" />
          TabManager
        </Link>
        <div className="navbar-links">
          <NavLink
            to="/library"
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link-active' : 'nav-link'
            }
          >
            Library
          </NavLink>
          <NavLink
            to="/graph"
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link-active' : 'nav-link'
            }
          >
            Graph
          </NavLink>
        </div>
      </nav>
      {children}
    </div>
  );
}

function AppLayout() {
  return (
    <Routes>
      {/* Landing page has its own full-page layout (no app shell navbar) */}
      <Route path="/" element={<LandingPage />} />

      {/* App pages share the navbar shell */}
      <Route
        path="/library"
        element={
          <AppShell>
            <main className="app-main">
              <LinkList />
            </main>
          </AppShell>
        }
      />
      <Route
        path="/graph"
        element={
          <AppShell>
            <main className="app-main">
              <Graph />
            </main>
          </AppShell>
        }
      />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </StrictMode>,
);
