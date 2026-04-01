
import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight,
  Truck,
  Globe
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion } from 'framer-motion';

const data = [
  { name: 'Ene', ventas: 4000, proformas: 2400 },
  { name: 'Feb', ventas: 3000, proformas: 1398 },
  { name: 'Mar', ventas: 5000, proformas: 9800 },
  { name: 'Abr', ventas: 2780, proformas: 3908 },
  { name: 'May', ventas: 1890, proformas: 4800 },
  { name: 'Jun', ventas: 2390, proformas: 3800 },
];

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass p-6 rounded-2xl border border-slate-800/50 flex flex-col gap-4 relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 p-8 opacity-5 rounded-full`} style={{ background: color }}></div>
    
    <div className="flex items-center justify-between">
      <div className="p-3 rounded-xl bg-slate-800/50" style={{ color }}>
        <Icon size={24} />
      </div>
      <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {Math.abs(change)}%
      </div>
    </div>
    
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold font-outfit mt-1">{value}</h3>
    </div>
  </motion.div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-outfit">Panel de <span className="text-gradient">Control</span></h2>
          <p className="text-slate-500 mt-1">Resumen general de importaciones y ventas de TODO PARA GORRA.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline flex items-center gap-2">
            <Globe size={18} />
            Estatus Importación
          </button>
          <button className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20">
            <Plus size={18} />
            Nueva Proforma
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ventas Totales" value="$84,200" change={12.5} icon={TrendingUp} color="#a78bfa" />
        <StatCard title="Clientes Activos" value="1,240" change={8.2} icon={Users} color="#22d3ee" />
        <StatCard title="Maquinaria en Stock" value="48 Unid." change={-2.4} icon={Package} color="#f59e0b" />
        <StatCard title="Proformas del Mes" value="156" change={18.4} icon={FileText} color="#10b981" />
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-slate-800/50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold">Rendimiento Comercial</h3>
              <p className="text-sm text-slate-500">Comparativa de ventas reales vs proformas generadas.</p>
            </div>
            <select className="bg-slate-900 border-slate-800 text-xs py-1 px-2">
              <option>Últimos 6 meses</option>
              <option>Este año</option>
            </select>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="ventas" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="proformas" stroke="#22d3ee" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-slate-800/50 flex flex-col">
          <h3 className="text-xl font-bold mb-6">Maquinaria Destacada</h3>
          <div className="space-y-6 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group cursor-pointer flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50">
                <div className="w-16 h-16 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 p-2 flex items-center justify-center">
                   <Truck className="text-slate-600 group-hover:text-amber-500 transition-colors" size={32} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold truncate">Máquina Bordadora X-10 Pro</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Stock: 4 unidades</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20">Importado</span>
                    <span className="text-sm font-bold text-violet-400">$12,400</span>
                  </div>
                </div>
                <button className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all">
                  <ArrowUpRight size={18} />
                </button>
              </div>
            ))}
          </div>
          <button className="mt-8 w-full btn-outline flex items-center justify-center gap-2">
            <Package size={18} />
            Ver Inventario Completo
          </button>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass rounded-3xl border border-slate-800/50 overflow-hidden">
        <div className="p-8 border-bottom border-slate-800/50 flex items-center justify-between">
          <h3 className="text-xl font-bold">Últimas Proformas</h3>
          <button className="text-violet-400 text-sm font-medium hover:underline">Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-8 py-4 font-semibold">Cliente</th>
                <th className="px-8 py-4 font-semibold">Nro Proforma</th>
                <th className="px-8 py-4 font-semibold">Monto</th>
                <th className="px-8 py-4 font-semibold">Estado</th>
                <th className="px-8 py-4 font-semibold">Fecha</th>
                <th className="px-8 py-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {[
                { name: 'Juan Pérez', id: 'PF-2024-001', amount: '$4,200', status: 'Enviada', date: 'Hace 2h' },
                { name: 'Textiles Lima SAC', id: 'PF-2024-002', amount: '$15,800', status: 'Pendiente', date: 'Hace 5h' },
                { name: 'Gorra Urban S.A.', id: 'PF-2024-003', amount: '$1,400', status: 'Aceptada', date: 'Ayer' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-all text-sm group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {row.name.charAt(0)}
                      </div>
                      <span className="font-medium">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400 font-mono">{row.id}</td>
                  <td className="px-8 py-5 font-bold">{row.amount}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs border ${
                      row.status === 'Aceptada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      row.status === 'Enviada' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-500">{row.date}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-white">
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Plus = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default Dashboard;
