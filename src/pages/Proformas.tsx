
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Send, 
  Eye, 
  Trash2,
  Calendar,
  User,
  History,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

const Proformas: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const proformas = [
    { id: 'PF-2024-001', client: 'Juan Pérez', total: '$4,200', status: 'Enviada', date: '2024-04-01', items: 3 },
    { id: 'PF-2024-002', client: 'Textiles Lima SAC', total: '$15,800', status: 'Pendiente', date: '2024-03-31', items: 12 },
    { id: 'PF-2024-003', client: 'Gorra Urban S.A.', total: '$1,400', status: 'Aceptada', date: '2024-03-28', items: 2 },
    { id: 'PF-2024-004', client: 'Empresa ABC', total: '$8,500', status: 'Vencida', date: '2024-03-15', items: 5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-outfit">Generador de <span className="text-gradient">Proformas</span></h2>
          <p className="text-slate-500 mt-1">Crea y gestiona cotizaciones para maquinaria y repuestos.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20">
          <Plus size={18} />
          Nueva Proforma
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Emitido', value: '156', icon: FileText, color: '#a78bfa' },
          { label: 'Aceptadas', value: '84', icon: CheckCircle2, color: '#10b981' },
          { label: 'Pendientes', value: '42', icon: Clock, color: '#3b82f6' },
          { label: 'Vencidas', value: '30', icon: AlertCircle, color: '#f43f5e' },
        ].map((stat, i) => (
          <div key={i} className="glass p-4 rounded-2xl border border-slate-800/50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center" style={{ color: stat.color }}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{stat.label}</p>
              <h4 className="text-lg font-bold font-outfit">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por número de proforma o cliente..." 
            className="w-full pl-10 bg-slate-900/30 border-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-outline flex items-center gap-2 py-2 px-4 text-xs">
            <Calendar size={16} />
            Fecha
          </button>
          <button className="btn-outline flex items-center gap-2 py-2 px-4 text-xs">
            <History size={16} />
            Historial
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl border border-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase tracking-wider">
                <th className="px-8 py-4 font-bold">NRO</th>
                <th className="px-8 py-4 font-bold">CLIENTE</th>
                <th className="px-8 py-4 font-bold">FECHA</th>
                <th className="px-8 py-4 font-bold">PRODUCTOS</th>
                <th className="px-8 py-4 font-bold">TOTAL</th>
                <th className="px-8 py-4 font-bold">ESTADO</th>
                <th className="px-8 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {proformas.map((pf) => (
                <tr key={pf.id} className="hover:bg-slate-800/20 transition-all text-sm group">
                  <td className="px-8 py-5 font-mono text-violet-400 font-bold">{pf.id}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-500" />
                      <span className="font-medium">{pf.client}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400">{pf.date}</td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] font-bold text-slate-300">
                      {pf.items} items
                    </span>
                  </td>
                  <td className="px-8 py-5 font-bold text-lg">{pf.total}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      pf.status === 'Aceptada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      pf.status === 'Enviada' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      pf.status === 'Vencida' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {pf.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all" title="Ver">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-all" title="Descargar PDF">
                        <Download size={18} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-all" title="Enviar Email">
                        <Send size={18} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
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

export default Proformas;
