
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useFirestore } from '../hooks/useFirestore';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  createdAt?: any;
}

const Clients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: clients, loading, add, remove } = useFirestore<Client>('clients');

  const handleAddClient = async () => {
    // Simplified for demonstration, usually a modal/form would be here
    const newClient = {
      name: 'Nuevo Cliente',
      company: 'Empresa Demo',
      email: 'demo@empresa.com',
      phone: '999 000 111',
      type: 'Nuevo',
      status: 'Activo'
    };
    await add(newClient);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-outfit">Gestión de <span className="text-gradient">Clientes</span></h2>
          <p className="text-slate-500 mt-1">Directorio completo de compradores y socios comerciales.</p>
        </div>
        <button 
          onClick={handleAddClient}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20"
        >
          <UserPlus size={18} />
          Registrar Cliente
        </button>
      </div>

      {loading && (
        <div className="flex justify-center p-12">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, empresa o RUC..." 
            className="w-full pl-10 bg-slate-900/30 border-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-outline flex items-center gap-2 py-2 px-4">
            <Filter size={18} />
            Filtros
          </button>
          <button className="btn-outline py-2 px-4">Exportar CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.map((client) => (
          <motion.div 
            key={client.id}
            whileHover={{ y: -5 }}
            className="glass p-6 rounded-3xl border border-slate-800/50 flex flex-col gap-6 group transition-all hover:bg-slate-800/50"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-xl font-bold text-white">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{client.name}</h3>
                  <p className="text-sm text-slate-500">{client.company}</p>
                </div>
              </div>
              <button className="p-2 text-slate-500 hover:text-white">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Mail size={16} className="text-violet-500/70" />
                {client.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Phone size={16} className="text-violet-500/70" />
                {client.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <MapPin size={16} className="text-violet-500/70" />
                Lima, Perú
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                  client.type === 'VIP' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  client.type === 'Frecuente' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {client.type}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
                Ver Perfil
                <ExternalLink size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Clients;
