
import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Upload, 
  Terminal, 
  ShieldCheck, 
  Globe,
  Settings,
  MoreVertical,
  Lock,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const documents = [
    { id: 1, title: 'Manual Usuario Bordadora X-10', type: 'Manual', size: '2.4 MB', date: '2024-03-25', status: 'Verificado' },
    { id: 2, title: 'DÜA Importación Lote #442', type: 'Importación', size: '1.2 MB', date: '2024-03-20', status: 'Pendiente' },
    { id: 3, title: 'Ficha Técnica Gorras Premium', type: 'Ficha Técnica', size: '0.8 MB', date: '2024-03-15', status: 'Verificado' },
    { id: 4, title: 'Certificado de Origen China', type: 'Legal', size: '1.5 MB', date: '2024-03-10', status: 'Verificado' },
    { id: 5, title: 'Contrato de Garantía Maquinaria', type: 'Legal', size: '3.1 MB', date: '2024-03-05', status: 'Expirado' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold font-outfit">Gestión de <span className="text-gradient">Documentos</span></h2>
          <p className="text-slate-400 mt-2">Almacenamiento seguro para manuales, certificados y registros de importación.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20 py-3 px-8 rounded-2xl">
          <Upload size={20} />
          Subir Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Manuales Técnicos', count: 124, icon: Terminal, color: '#a78bfa' },
          { label: 'Docs Importación', count: 56, icon: Globe, color: '#22d3ee' },
          { label: 'Certificados', count: 18, icon: ShieldCheck, color: '#10b981' },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-3xl border border-slate-800/50 flex flex-col gap-4 group transition-all hover:bg-slate-800/30">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center" style={{ color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold font-outfit">{stat.count} <span className="text-sm font-normal text-slate-500 font-inter">Archivos</span></h3>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center shadow-xl shadow-black/10">
        <div className="relative flex-1">
          <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar documentos por nombre o tipo..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border-slate-800 focus:border-violet-500/50 rounded-2xl text-lg"
            value={searchTerm}
          />
        </div>
        <div className="flex gap-3">
          <button className="btn-outline flex items-center justify-center gap-2 py-3 px-6 rounded-2xl">
            <Settings size={20} />
            Configurar
          </button>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase tracking-wider">
                <th className="px-8 py-5 font-bold">NOMBRE DEL DOCUMENTO</th>
                <th className="px-8 py-5 font-bold">CATEGORÍA</th>
                <th className="px-8 py-5 font-bold">TAMAÑO</th>
                <th className="px-8 py-5 font-bold">ULT. MODIF.</th>
                <th className="px-8 py-5 font-bold">ESTADO</th>
                <th className="px-8 py-5 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/20 transition-all text-sm group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                        <FileText size={20} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-200 block group-hover:text-white">{doc.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Lock size={10} className="text-slate-500" />
                          <span className="text-[10px] text-slate-500 font-medium">Privado</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-800/50 rounded-full text-[10px] font-bold text-slate-400 border border-slate-700">
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-slate-400">{doc.size}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={14} />
                      {doc.date}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${
                        doc.status === 'Verificado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                        doc.status === 'Pendiente' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                        'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                       }`}></span>
                       <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        doc.status === 'Verificado' ? 'text-emerald-500' : 
                        doc.status === 'Pendiente' ? 'text-amber-500' : 
                        'text-rose-500'
                       }`}>
                          {doc.status}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-lg hover:shadow-violet-500/10">
                        <Download size={18} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-violet-400 transition-all shadow-lg hover:shadow-violet-500/10">
                        <Eye size={18} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all shadow-lg hover:shadow-violet-500/10">
                        <MoreVertical size={18} />
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

export default Documents;
