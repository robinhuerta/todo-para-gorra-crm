
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
  ChevronRight,
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
      gridTemplateColumns: isSidebarOpen ? 'var(--sidebar-width) 1fr' : '80px 1fr',
      transition: 'grid-template-columns 0.3s ease'
    }}>
      {/* Sidebar */}
      <aside className="sidebar glass" style={{ position: 'sticky', top: 0, height: '100vh' }}>
        <div className="flex items-center justify-between mb-12">
          {isSidebarOpen ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold font-outfit" style={{ margin: 0 }}>GORRA <span className="text-gradient">CRM</span></h1>
            </motion.div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
              <Zap className="text-white" size={24} />
            </div>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/5' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                title={item.label}
              >
                <Icon size={22} className={isActive ? 'text-violet-400' : 'text-inherit'} />
                {isSidebarOpen && (
                  <span className="font-medium whitespace-nowrap">{item.label}</span>
                )}
                {isSidebarOpen && isActive && (
                  <motion.div layoutId="active" className="ml-auto">
                    <ChevronRight size={14} className="text-violet-400" />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <button 
            className="flex items-center gap-4 p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all w-full group"
            onClick={handleLogout}
          >
            <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="font-bold">Cerrar Sesión</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mt-4 flex items-center justify-center w-full p-2 text-slate-500 hover:text-slate-300 transition-all"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area">
        {/* Topbar */}
        <div className="topbar glass rounded-2xl mb-8 border border-white/5">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="hidden md:block text-sm font-bold text-slate-500 uppercase tracking-widest">{activePageLabel}</h2>
            <div className="h-4 w-px bg-slate-800 hidden md:block mx-2"></div>
            <div className="relative flex-1 max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full pl-10 bg-slate-900/40 border-slate-800 focus:border-violet-500/50 text-sm h-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </div>

            <button className="relative text-slate-400 hover:text-white transition-all p-2 bg-slate-900/50 rounded-lg border border-slate-800/50">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-violet-500 border-2 border-slate-950 rounded-full"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-800"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold uppercase tracking-tight text-white">RH</p>
                <p className="text-[10px] text-slate-500 font-medium lowercase italic">{user?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 p-[1px] shadow-lg shadow-violet-500/10">
                <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center font-bold text-xs">
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
