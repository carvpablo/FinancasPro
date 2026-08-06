import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowUpDown, Tag, Target, BarChart3,
  LogOut, TrendingUp, Wallet, Gauge, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transações' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/budgets', icon: Gauge, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}>
              <Wallet size={20} color="white" />
            </div>

            {!collapsed && (
              <div className="sidebar-logo-labels">
                <div className="sidebar-logo-text">FinançasPro</div>
                <div className="sidebar-logo-sub">Gestão Financeira</div>
              </div>
            )}
          </div>

          {/* Mobile close / Desktop collapse toggle */}
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
            id="btn-sidebar-toggle"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile close button (only visible on mobile) */}
          <button
            className="sidebar-close-mobile"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" role="navigation" aria-label="Menu principal">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span className="nav-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 4px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }} className="truncate">{user?.name}</div>
                <div className="text-xs text-muted truncate">{user?.email}</div>
              </div>
            </div>
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: '50%', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 700, color: 'white',
            }} title={user?.name}>
              {initials}
            </div>
          )}

          <button
            className={`btn btn-secondary btn-sm ${collapsed ? '' : 'btn-full'}`}
            onClick={handleLogout}
            style={collapsed ? { width: '100%', justifyContent: 'center', padding: '8px' } : {}}
            title={collapsed ? 'Sair' : undefined}
            id="btn-logout"
          >
            <LogOut size={14} />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>
    </>
  );
}
