import { useState, useCallback, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export function Layout() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className={`app-layout ${collapsed ? 'layout--collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapse}
        onCloseMobile={closeMobile}
      />

      <main className="main-content">
        {/* Mobile top bar */}
        <header className="mobile-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            id="btn-mobile-menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '0.9rem' }}>💰</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              FinançasPro
            </span>
          </div>
          {/* Spacer to center logo */}
          <div style={{ width: 40 }} />
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
