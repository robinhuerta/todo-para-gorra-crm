
import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  LogOut,
  Menu,
  X, 
  Package, 
  FileText, 
  ShoppingCart, 
  Bell,
  Search,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/' },
    { id: 'clients', label: 'Clientes', icon: Users, path: '/clients' },
    { id: 'inventory', label: 'Inventario', icon: Package, path: '/inventory' },
    { id: 'proformas', label: 'Proformas', icon: FileText, path: '/proformas' },
    { id: 'store', label: 'Tienda Interna', icon: ShoppingCart, path: '/store' },
    { id: 'docs', label: 'Documentos', icon: Info, path: '/documents' },
  ];

  const activePageLabel = menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="main-layout" style={{ 
      gridTemplateColumns: isSidebarOpen ? 'var(--sidebar-width) 1fr' : '100px 1fr',
      transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: '100vh',
      background: 'var(--bg-dark)'
    }}>
      {/* Sidebar */}
      <aside className="sidebar glass border-r border-white/5" style={{ 
        position: 'sticky', 
        top: 0, 
        height: '100vh',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <Zap className="text-white" size={24} />
          </div>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <h1 className="text-xl font-bold font-outfit leading-none">GORRA</h1>
              <span className="text-xs font-bold text-violet-400 mt-1 uppercase tracking-tighter">Industrial CRM</span>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <Icon size={22} className="shrink-0" />
                {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 flex flex-col gap-4">
          <button 
            className="flex items-center gap-4 p-4 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-2xl transition-all w-full group"
            onClick={handleLogout}
          >
            <LogOut size={22} className="shrink-0 group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="font-bold text-sm">Cerrar Sesión</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center p-3 text-slate-500 hover:text-slate-200 transition-all bg-slate-900/50 rounded-xl"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area p-8 overflow-y-auto">
        {/* Topbar */}
        <div className="topbar glass rounded-3xl p-6 mb-10 border border-white/5 flex items-center justify-between shadow-2xl shadow-black/20">
          <div className="flex items-center gap-6">
            <h2 className="hidden md:block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{activePageLabel}</h2>
            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            <div className="relative w-64 lg:w-96">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar datos..." 
                className="w-full pl-12 bg-slate-900/40 border-slate-800 focus:border-violet-500/50 h-11 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              LIVE CONNECTED
            </div>

            <button className="relative text-slate-400 hover:text-white transition-all p-2.5 bg-slate-900/50 rounded-xl border border-white/5">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-violet-500 border-2 border-slate-950 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-4 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase text-white tracking-widest">{user?.email?.split('@')[0]}</p>
                <p className="text-[9px] text-slate-500 font-bold lowercase italic leading-none">{user?.email}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 p-[1px]">
                <div className="w-full h-full rounded-[15px] bg-slate-950 flex items-center justify-center font-black text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
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
