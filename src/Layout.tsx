
import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import NotificationBell from './components/NotificationBell';
import {
  BarChart3,
  Users,
  LogOut,
  Package,
  FileText,
  ShoppingCart,
  Search,
  Info,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from 'lucide-react';

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',       icon: BarChart3,    path: '/',          roles: ['admin'] },
  { id: 'clients',   label: 'Clientes',         icon: Users,        path: '/clients',   roles: ['admin', 'vendedor'] },
  { id: 'inventory', label: 'Inventario',       icon: Package,      path: '/inventory', roles: ['admin'] },
  { id: 'proformas', label: 'Proformas',        icon: FileText,     path: '/proformas', roles: ['admin'] },
  { id: 'store',     label: 'Tienda Interna',   icon: ShoppingCart, path: '/store',     roles: ['admin', 'vendedor'] },
  { id: 'docs',      label: 'Documentos',       icon: Info,         path: '/documents', roles: ['admin'] },
  { id: 'users',     label: 'Usuarios',         icon: UserCog,      path: '/users',     roles: ['admin'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin:    'Administrador',
  vendedor: 'Vendedor',
};

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { logout, user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const menuItems = ALL_MENU_ITEMS.filter(
    item => !role || item.roles.includes(role)
  );

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch (e) { console.error(e); }
  };

  const activeLabel = menuItems.find(m => m.path === location.pathname)?.label ?? 'Dashboard';

  const sidebarW = collapsed ? '64px' : 'var(--sidebar-width)';

  return (
    <div
      className="main-layout"
      style={{
        gridTemplateColumns: `${sidebarW} 1fr`,
        transition: 'grid-template-columns 0.2s ease',
        minHeight: '100vh',
      }}
    >
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{ position: 'sticky', top: 0, height: '100vh' }}
      >
        {/* Logo */}
        <div style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid hsl(var(--border))',
          flexShrink: 0,
          gap: '10px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: 30, height: 30, flexShrink: 0,
            background: 'hsl(var(--primary))',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>G</span>
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'hsl(var(--text-primary))', lineHeight: 1.2 }}>GORRA CRM</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>Industrial</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {menuItems.map(item => {
            const Icon    = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`sidebar-nav-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
                style={{ justifyContent: collapsed ? 'center' : undefined }}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid hsl(var(--border))', flexShrink: 0 }}>
          {/* User info */}
          {!collapsed && (
            <div style={{
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid hsl(var(--border))',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'hsl(var(--primary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'hsl(var(--text-primary))',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.email?.split('@')[0]}
                </p>
                <span style={{
                  display: 'inline-block',
                  fontSize: 10, fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: role === 'admin' ? 'hsl(207 89% 92%)' : 'hsl(142 70% 90%)',
                  color: role === 'admin' ? 'hsl(207 89% 35%)' : 'hsl(142 70% 30%)',
                  marginTop: 2,
                }}>
                  {ROLE_LABELS[role ?? 'vendedor'] ?? role}
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="sidebar-nav-link"
            style={{
              width: '100%', background: 'transparent', border: 'none',
              justifyContent: collapsed ? 'center' : undefined,
            }}
            title={collapsed ? 'Cerrar Sesión' : undefined}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#FEF2F2';
              (e.currentTarget as HTMLElement).style.color = '#DC2626';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'hsl(var(--text-secondary))';
            }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '8px',
              background: 'transparent', border: 'none',
              borderTop: '1px solid hsl(var(--border))',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="content-area">
        {/* Topbar */}
        <div className="topbar">
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>GORRA CRM</span>
            <ChevronRight size={13} style={{ color: 'hsl(var(--border))' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{activeLabel}</span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute', left: 9, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--text-secondary))',
                }}
              />
              <input
                type="text"
                placeholder="Buscar..."
                style={{ paddingLeft: 30, paddingRight: 12, height: 32, width: 200, fontSize: 13 }}
              />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              style={{
                padding: 6, background: 'transparent',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius-sm)',
                color: 'hsl(var(--text-secondary))',
                display: 'flex', alignItems: 'center',
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* User avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'hsl(var(--primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div
          style={{ flex: 1, padding: 24, overflowY: 'auto' }}
          className="custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
