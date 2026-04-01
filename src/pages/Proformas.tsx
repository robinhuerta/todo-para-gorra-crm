
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  PlusCircle
} from 'lucide-react';

import { generateProformaPDF } from '../utils/ProformaPDF';
import { useFirestore } from '../hooks/useFirestore';
import { motion, AnimatePresence } from 'framer-motion';

const Proformas: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: clients } = useFirestore('clients');
  const { data: dbProformas, add: addProforma } = useFirestore('proformas');
  
  const [formData, setFormData] = useState({
    clientId: '',
    items: [{ name: '', description: '', quantity: 1, price: 0 }]
  });

  const allProformas = [...(dbProformas || [])];

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', description: '', quantity: 1, price: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients?.find(c => c.id === formData.clientId);
    const total = calculateTotal(formData.items);
    
    const newProforma = {
      id: `PF-${Date.now().toString().slice(-6)}`,
      client: selectedClient?.name || 'Cliente Genérico',
      company: selectedClient?.company || 'Empresa Cercana',
      date: new Date().toISOString().split('T')[0],
      items: formData.items,
      total,
      status: 'Pendiente'
    };

    try {
      await addProforma(newProforma);
      setIsModalOpen(false);
      generateProformaPDF({
        ...newProforma,
        clientName: newProforma.client,
        clientCompany: newProforma.company,
        expiryDate: '2024-12-31',
        subtotal: total / 1.18,
        tax: total - (total / 1.18),
      });
      setFormData({ clientId: '', items: [{ name: '', description: '', quantity: 1, price: 0 }] });
    } catch (err) {
      console.error('Error saving proforma:', err);
    }
  };

  const handleDownload = (pf: any) => {
    const total = typeof pf.total === 'string' ? parseFloat(pf.total.replace('$', '')) : pf.total;
    generateProformaPDF({
      id: pf.id,
      clientName: pf.client,
      clientCompany: pf.company || 'Empresa',
      date: pf.date,
      expiryDate: '2024-12-31',
      items: pf.items || [],
      subtotal: total / 1.18,
      tax: total - (total / 1.18),
      total: total
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-outfit">Generador de <span className="text-gradient">Proformas</span></h2>
          <p className="text-slate-500 mt-1 sm:text-sm text-xs">Crea y gestiona cotizaciones para maquinaria y repuestos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20"
        >
          <Plus size={18} />
          Nueva Proforma
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 rounded-[2.5rem] border border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold font-outfit">Nueva <span className="text-gradient">Cotización Industrial</span></h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Cliente Receptor</label>
                    <select 
                      required
                      className="w-full bg-slate-900 focus:border-violet-500"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    >
                      <option value="">Selecciona un cliente...</option>
                      {clients?.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Items de Maquinaria / Repuestos</h4>
                    <button type="button" onClick={handleAddItem} className="text-violet-400 hover:text-violet-300 flex items-center gap-2 text-xs font-bold">
                      <PlusCircle size={16} /> Añadir Item
                    </button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="md:col-span-5 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre / Modelo</label>
                        <input 
                          type="text" 
                          required
                          className="w-full text-xs h-10"
                          placeholder="Bordadora X-10..."
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].name = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Cant.</label>
                        <input 
                          type="number" 
                          required
                          className="w-full text-xs h-10"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].quantity = parseInt(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Precio Unit. ($)</label>
                        <input 
                          type="number" 
                          required
                          className="w-full text-xs h-10"
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].price = parseFloat(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="md:col-span-2 pb-1">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg w-full transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-white/5 gap-6">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Inversión Aproximada</p>
                    <p className="text-3xl font-black font-outfit text-violet-400">
                      ${calculateTotal(formData.items).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 w-full md:w-auto">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline flex-1">Cancelar</button>
                    <button type="submit" className="btn-primary flex-1">Generar y Descargar</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Emitido', value: allProformas.length, icon: FileText, color: '#a78bfa' },
          { label: 'Aceptadas', value: allProformas.filter(p => p.status === 'Aceptada').length, icon: CheckCircle2, color: '#10b981' },
          { label: 'Pendientes', value: allProformas.filter(p => p.status === 'Pendiente').length, icon: Clock, color: '#3b82f6' },
          { label: 'Vencidas', value: allProformas.filter(p => p.status === 'Vencida').length, icon: AlertCircle, color: '#f43f5e' },
        ].map((stat, i) => (
          <div key={i} className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center shadow-inner" style={{ color: stat.color }}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{stat.label}</p>
              <h4 className="text-lg font-black font-outfit">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Filtrar por proforma o cliente industrial..." 
            className="w-full pl-12 bg-slate-900 focus:border-violet-500 h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-white/5 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                <th className="px-8 py-5">NRO</th>
                <th className="px-8 py-5">CLIENTE</th>
                <th className="px-8 py-5 text-center">PRODUCTOS</th>
                <th className="px-8 py-5">INVERSIÓN</th>
                <th className="px-8 py-5">ESTADO</th>
                <th className="px-8 py-5 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allProformas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-bold italic">
                    No hay proformas registradas. ¡Comienza creando una nueva!
                  </td>
                </tr>
              ) : (
                allProformas
                  .filter(pf => (pf.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || (pf.client || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((pf) => (
                    <tr key={pf.id} className="hover:bg-violet-600/5 transition-all text-sm group">
                      <td className="px-8 py-5 font-mono text-violet-400 font-black">{pf.id}</td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-200">{pf.client}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{pf.company}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-violet-300">
                          {pf.items?.length || 0} ITEMS
                        </span>
                      </td>
                      <td className="px-8 py-5 font-black text-lg text-white">
                        ${(typeof pf.total === 'number' ? pf.total : 0).toLocaleString()}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${
                          pf.status === 'Aceptada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          pf.status === 'Enviada' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          pf.status === 'Vencida' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {pf.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleDownload(pf)}
                            className="p-3 bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white rounded-xl transition-all" 
                            title="Descargar Cotización"
                          >
                            <Download size={18} />
                          </button>
                          <button className="p-3 bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-all" title="Eliminar">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Proformas;
