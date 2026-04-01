
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
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

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'proformas', label: 'Proformas', icon: FileText },
    { id: 'store', label: 'Tienda Interna', icon: ShoppingCart },
    { id: 'docs', label: 'Documentación', icon: Info },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

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
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold font-outfit" style={{ margin: 0 }}>GORRA <span className="text-gradient">CRM</span></h1>
            </motion.div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto">
              <Zap className="text-white" size={24} />
            </div>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' 
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
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button 
            className="flex items-center gap-4 p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all w-full"
            onClick={() => console.log('Logout')}
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
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
        <div className="topbar glass rounded-2xl mb-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar clientes, maquinaria, repuestos..." 
                className="w-full pl-10 bg-slate-900/50 border-slate-800 focus:border-violet-500/50 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-white transition-all">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-violet-500 border-2 border-slate-900 rounded-full"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-800"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Empresa Importadora</p>
                <p className="text-xs text-slate-500">Administrador</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`} alt="User" />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Layout;
