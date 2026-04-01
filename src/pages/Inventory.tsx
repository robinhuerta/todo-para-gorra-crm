
import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Truck, 
  Settings, 
  Eye, 
  Edit, 
  Trash2
} from 'lucide-react';

import { useFirestore } from '../hooks/useFirestore';

interface InventoryItem {
  id: string;
  name: string;
  category: 'machinery' | 'parts' | 'caps';
  brand: string;
  price: string;
  stock: number;
  status: string;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'machinery' | 'parts' | 'caps'>('machinery');
  const { data: items } = useFirestore<InventoryItem>('inventory');

  const categories = [
    { id: 'machinery', label: 'Maquinaria', icon: Truck, count: items.filter(i => i.category === 'machinery').length, color: '#f59e0b' },
    { id: 'parts', label: 'Repuestos', icon: Settings, count: items.filter(i => i.category === 'parts').length, color: '#22d3ee' },
    { id: 'caps', label: 'Gorras Imp.', icon: Package, count: items.filter(i => i.category === 'caps').length, color: '#a78bfa' },
  ];

  const filteredItems = items.filter(item => activeTab === 'all' || item.category === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-outfit">Inventario de <span className="text-gradient">Importación</span></h2>
          <p className="text-slate-500 mt-1">Gestión de maquinaria pesada, repuestos y productos terminados.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20">
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`glass p-6 rounded-3xl border text-left flex items-center gap-4 transition-all duration-300 ${
              activeTab === cat.id ? 'border-violet-500/30 bg-violet-600/10' : 'border-slate-800/50 hover:bg-slate-800/30'
            }`}
          >
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center p-3 border border-slate-800" style={{ color: cat.color }}>
              <cat.icon size={28} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{cat.label}</p>
              <h3 className="text-2xl font-bold font-outfit">{cat.count} <span className="text-sm font-normal text-slate-500 font-inter">Referencias</span></h3>
            </div>
          </button>
        ))}
      </div>

      <div className="glass rounded-3xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800">
              <button 
                onClick={() => setActiveTab('machinery')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'machinery' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Maquinaria
              </button>
              <button 
                onClick={() => setActiveTab('parts')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'parts' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Repuestos
              </button>
              <button 
                onClick={() => setActiveTab('caps')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'caps' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Gorras
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Filtro rápido..." 
              className="pl-10 py-2 text-sm bg-slate-900 border-slate-800 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/30 text-slate-500 text-xs uppercase tracking-wider text-left">
                <th className="px-8 py-4 font-semibold">Producto</th>
                <th className="px-8 py-4 font-semibold">Código</th>
                <th className="px-8 py-4 font-semibold">Marca</th>
                <th className="px-8 py-4 font-semibold">Precio Unit.</th>
                <th className="px-8 py-4 font-semibold">Stock</th>
                <th className="px-8 py-4 font-semibold">Estado</th>
                <th className="px-8 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredItems.map((item, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-all text-sm group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-2 flex items-center justify-center">
                        {item.category === 'machinery' ? <Truck size={20} className="text-amber-500" /> : 
                         item.category === 'parts' ? <Settings size={20} className="text-cyan-500" /> : 
                         <Package size={20} className="text-violet-500" />}
                      </div>
                      <span className="font-bold group-hover:text-violet-400 transition-colors">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400 font-mono">{item.id}</td>
                  <td className="px-8 py-5 font-medium">{item.brand}</td>
                  <td className="px-8 py-5 text-emerald-400 font-bold">{item.price}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">{item.stock}</span>
                      <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: item.stock > 10 ? '100%' : `${item.stock * 10}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      item.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-blue-400 border border-slate-800">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800">
                        <Trash2 size={16} />
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

export default Inventory;
