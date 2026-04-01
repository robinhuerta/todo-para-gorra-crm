
import React, { useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  ArrowLeft,
  Calendar,
  Activity,
  PlusCircle,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '../hooks/useFirestore';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  photo?: string;
}

const statusSteps = ['Prospecto', 'Presentación', 'Propuesta', 'Contrato'];

const typeColors: Record<string, { bg: string; text: string }> = {
  Premium:     { bg: '#EFF6FF', text: '#1D4ED8' },
  Corporativo: { bg: '#F0FDF4', text: '#15803D' },
  VIP:         { bg: '#FFF7ED', text: '#C2410C' },
  Frecuente:   { bg: '#F5F3FF', text: '#6D28D9' },
};

const Clients: React.FC = () => {
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab]           = useState('overview');
  const { data: clients, add }              = useFirestore<Client>('clients');

  const handleAddClient = async () => {
    await add({
      name: 'Nuevo Cliente Corporativo',
      company: 'Industrial Tech SAC',
      email: 'contacto@industrial.com',
      phone: '999 888 777',
      type: 'Premium',
      status: 'Prospecto',
    });
  };

  const typeStyle = (type: string) =>
    typeColors[type] ?? { bg: '#F1F5F9', text: '#475569' };

  return (
    <div style={{ paddingBottom: 32 }}>
      <AnimatePresence mode="wait">

        {/* ── LIST VIEW ──────────────────────────────────────── */}
        {!selectedClient && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Directorio de Clientes</h2>
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
                  Gestión avanzada de clientes y socios comerciales.
                </p>
              </div>
              <button onClick={handleAddClient} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserPlus size={15} /> Registrar Cliente
              </button>
            </div>

            {/* Search + filter bar */}
            <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{
                  position: 'absolute', left: 9, top: '50%',
                  transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))',
                }} />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, empresa o RUC..."
                  style={{ paddingLeft: 30, height: 32, width: '100%', fontSize: 13 }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px' }}>
                <Filter size={13} /> Filtros
              </button>
              <button className="btn-outline" style={{ padding: '5px 12px', fontSize: 12 }}>
                Exportar
              </button>
            </div>

            {/* Client grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {clients
                .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(client => {
                  const ts = typeStyle(client.type);
                  return (
                    <motion.div
                      key={client.id}
                      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      onClick={() => setSelectedClient(client)}
                      className="card"
                      style={{ padding: '18px 20px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 8,
                          background: '#E8F3FC',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 700, color: '#0072CC',
                        }}>
                          {client.name.charAt(0)}
                        </div>
                        <button
                          onClick={e => e.stopPropagation()}
                          style={{ padding: 4, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{client.name}</h3>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{client.company}</p>
                      <div style={{
                        marginTop: 14, paddingTop: 12,
                        borderTop: '1px solid hsl(var(--border))',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                          background: ts.bg, color: ts.text,
                        }}>
                          {client.type || 'Corporativo'}
                        </span>
                        <span style={{ fontSize: 11, color: '#0072CC', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Ver detalle <ChevronRight size={11} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              }
            </div>
          </motion.div>
        )}

        {/* ── DETAIL VIEW ────────────────────────────────────── */}
        {selectedClient && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}
          >
            {/* Topbar actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={() => setSelectedClient(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: '#0072CC',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <ArrowLeft size={15} /> Volver al Listado
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} /> Agendar
                </button>
                <button className="btn-primary">Guardar Cambios</button>
              </div>
            </div>

            {/* Record header */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                    background: '#E8F3FC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: '#0072CC',
                  }}>
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700 }}>{selectedClient.name}</h1>
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{selectedClient.company}</p>
                  </div>
                </div>

                {/* Status stepper */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  background: 'hsl(var(--bg-main))', padding: '4px 6px', borderRadius: 6,
                  border: '1px solid hsl(var(--border))',
                }}>
                  {statusSteps.map((step, i) => {
                    const isCurrent = selectedClient.status === step || (i === 0 && !statusSteps.includes(selectedClient.status));
                    return (
                      <React.Fragment key={i}>
                        <div style={{
                          padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: isCurrent ? 600 : 400,
                          background: isCurrent ? '#0072CC' : 'transparent',
                          color: isCurrent ? '#fff' : 'hsl(var(--text-secondary))',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}>
                          {step}
                        </div>
                        {i < statusSteps.length - 1 && (
                          <ChevronRight size={12} style={{ color: 'hsl(var(--border))', flexShrink: 0 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3-column body */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 220px', gap: 14, alignItems: 'start' }}>

              {/* Left: contact */}
              <div className="card" style={{ padding: '18px 20px', position: 'sticky', top: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-secondary))', marginBottom: 14 }}>
                  Información de Contacto
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { icon: Mail,   val: selectedClient.email,  color: '#0072CC' },
                    { icon: Phone,  val: selectedClient.phone,  color: '#0ea5e9' },
                    { icon: MapPin, val: 'Lima, Perú',          color: '#10b981' },
                  ].map(({ icon: Icon, val, color }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: `${color}14`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color,
                      }}>
                        <Icon size={13} />
                      </div>
                      <span style={{ fontSize: 13, color: 'hsl(var(--text-primary))', wordBreak: 'break-all' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle: tabs + content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', gap: 0 }}>
                  {[
                    { id: 'overview',    label: 'General' },
                    { id: 'processing',  label: 'Procesamiento' },
                    { id: 'history',     label: 'Historial' },
                    { id: 'docs',        label: 'Documentos' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '8px 16px',
                        fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                        color: activeTab === tab.id ? '#0072CC' : 'hsl(var(--text-secondary))',
                        background: 'transparent', border: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid #0072CC' : '2px solid transparent',
                        marginBottom: -1,
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Días en Embudo', value: '24', color: '#0ea5e9' },
                    { label: 'Emails Enviados', value: '12', color: '#f59e0b' },
                  ].map((m, i) => (
                    <div key={i} className="card" style={{ padding: '16px 18px' }}>
                      <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-secondary))', marginBottom: 6 }}>{m.label}</p>
                      <h3 style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</h3>
                    </div>
                  ))}
                </div>

                {/* Commercial history */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Activity size={15} style={{ color: '#0072CC' }} /> Historial Comercial
                    </h4>
                    <button style={{ fontSize: 12, color: '#0072CC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      Ver todo
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { icon: FileText, label: 'Proforma PF-0842 validada',       time: 'Hace 2 días' },
                      { icon: Clock,    label: 'Llamada comercial programada',     time: 'Ayer, 3:00 PM' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 6,
                          alignItems: 'flex-start',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                          background: 'hsl(var(--bg-main))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'hsl(var(--text-secondary))',
                        }}>
                          <item.icon size={15} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: next step */}
              <div className="card" style={{ padding: '18px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>Siguiente Paso</h4>
                  <PlusCircle size={16} style={{ color: 'hsl(var(--text-secondary))', cursor: 'pointer' }} />
                </div>
                <div style={{
                  padding: '12px 14px', borderRadius: 6,
                  background: '#EBF5FF', border: '1px solid #BFDBFE',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#0072CC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Asignar Responsable
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#0072CC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                    }}>
                      RP
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Raúl Pacheco</span>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', fontSize: 12, padding: '7px 0' }}>
                    Marcar Completado
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default Clients;
