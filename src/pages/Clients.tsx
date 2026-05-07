
import React, { useState } from 'react';
import {
  Search, Filter, Mail, Phone, MapPin,
  UserPlus, ArrowLeft, Calendar, Activity, PlusCircle,
  FileText, ChevronRight, X, AlertCircle, Edit, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '../hooks/useFirestore';

/* ─── Types ──────────────────────────────────────────────────── */
interface Client {
  id: string;
  name: string;
  rucOrDni?: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  type: string;
  status: string;
}

type FormData = Omit<Client, 'id'>;

const EMPTY_FORM: FormData = {
  name: '', rucOrDni: '', company: '', email: '', phone: '',
  address: '', type: 'Corporativo', status: 'Prospecto',
};

/* ─── Constants ──────────────────────────────────────────────── */
const STATUS_STEPS = ['Prospecto', 'Presentación', 'Propuesta', 'Contrato'];

const TYPE_OPTS = ['Corporativo', 'Premium', 'VIP', 'Frecuente', 'Nuevo'];

const typeStyle = (t: string): { bg: string; text: string } => ({
  Premium:     { bg: '#EFF6FF', text: '#1D4ED8' },
  Corporativo: { bg: '#F0FDF4', text: '#15803D' },
  VIP:         { bg: '#FFF7ED', text: '#C2410C' },
  Frecuente:   { bg: '#F5F3FF', text: '#6D28D9' },
  Nuevo:       { bg: '#F0FDF4', text: '#047857' },
}[t] ?? { bg: '#F1F5F9', text: '#475569' });

/* ─── Shared UI ──────────────────────────────────────────────── */
const Overlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    onClick={onClose}>
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

const modalBox: React.CSSProperties = {
  background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))',
  borderRadius: 10, width: '100%', maxWidth: 540,
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-primary))' }}>
      {label}{required && <span style={{ color: '#E11D48', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
const Clients: React.FC = () => {
  const { data: clients, add, update, remove } = useFirestore<Client>('clients');
  const { data: allOrders } = useFirestore<{ id: string; clientId?: string; clientName: string; total: number; date: string; status: string; items: { name: string; quantity: number; price: number }[] }>('orders');

  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab]           = useState('overview');
  const [modalOpen, setModalOpen]           = useState(false);
  const [editClient, setEditClient]         = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<Client | null>(null);
  const [formData, setFormData]             = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState('');

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ── open modal ── */
  const openAdd = () => {
    setEditClient(null);
    setFormData({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditClient(c);
    setFormData({ name: c.name, rucOrDni: c.rucOrDni || '', company: c.company, email: c.email, phone: c.phone, address: c.address || '', type: c.type, status: c.status });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditClient(null); };

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim())  { setFormError('El nombre es obligatorio.'); return; }
    if (!formData.email.trim()) { setFormError('El correo es obligatorio.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editClient) {
        await update(editClient.id, formData);
        if (selectedClient?.id === editClient.id) setSelectedClient({ ...editClient, ...formData });
      } else {
        await add(formData);
      }
      closeModal();
    } catch { setFormError('Error al guardar. Intenta nuevamente.'); }
    finally  { setSaving(false); }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await remove(deleteTarget.id); if (selectedClient?.id === deleteTarget.id) setSelectedClient(null); }
    catch { /* silently fail */ }
    finally { setDeleteTarget(null); }
  };

  const set = (k: keyof FormData, v: string) => setFormData(f => ({ ...f, [k]: v }));

  /* ── client orders ── */
  const clientOrders = selectedClient
    ? allOrders.filter(o => o.clientId === selectedClient.id || o.clientName === selectedClient.name)
    : [];
  const totalGastado = clientOrders.filter(o => o.status === 'Completado').reduce((s, o) => s + (o.total || 0), 0);

  /* ── status stepper (update on click) ── */
  const handleStatusChange = async (client: Client, newStatus: string) => {
    await update(client.id, { status: newStatus } as Partial<Client>);
    setSelectedClient(c => c ? { ...c, status: newStatus } : c);
  };

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ paddingBottom: 32 }}>
      <AnimatePresence mode="wait">

        {/* ── LIST VIEW ──────────────────────────────────────── */}
        {!selectedClient && (
          <motion.div key="list" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Directorio de Clientes</h2>
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
                  {clients.length} clientes registrados
                </p>
              </div>
              <button onClick={openAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserPlus size={15} /> Registrar Cliente
              </button>
            </div>

            {/* Search bar */}
            <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
                <input type="text" placeholder="Buscar por nombre o empresa..." style={{ paddingLeft: 30, height: 32, width: '100%', fontSize: 13 }}
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px' }}>
                <Filter size={13} /> Filtros
              </button>
              <button className="btn-outline" style={{ padding: '5px 12px', fontSize: 12 }}>Exportar</button>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <UserPlus size={32} style={{ color: 'hsl(var(--border))', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-secondary))', marginBottom: 14 }}>
                  {searchTerm ? 'No se encontraron clientes.' : 'Aún no hay clientes. ¡Registra el primero!'}
                </p>
                {!searchTerm && <button className="btn-primary" onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><UserPlus size={14} /> Registrar Cliente</button>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {filtered.map(client => {
                  const ts = typeStyle(client.type);
                  return (
                    <motion.div key={client.id} whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      onClick={() => setSelectedClient(client)}
                      className="card" style={{ padding: '18px 20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#E8F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#0072CC' }}>
                          {client.name?.charAt(0) ?? '?'}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={e => openEdit(client, e)} title="Editar"
                            style={{ padding: '4px 6px', background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 4, color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Edit size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(client); }} title="Eliminar"
                            style={{ padding: '4px 6px', background: 'transparent', border: '1px solid #FECACA', borderRadius: 4, color: '#E11D48', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 600 }}>{client.name}</h3>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{client.company}</p>
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: ts.bg, color: ts.text }}>
                          {client.type || 'Corporativo'}
                        </span>
                        <span style={{ fontSize: 11, color: '#0072CC', display: 'flex', alignItems: 'center', gap: 3 }}>
                          Ver detalle <ChevronRight size={11} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── DETAIL VIEW ────────────────────────────────────── */}
        {selectedClient && (
          <motion.div key="detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

            {/* Topbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <button onClick={() => setSelectedClient(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0072CC', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                <ArrowLeft size={15} /> Volver al Listado
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} /> Agendar
                </button>
                <button className="btn-primary" onClick={() => openEdit(selectedClient)}>Editar Cliente</button>
              </div>
            </div>

            {/* Record header */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, flexShrink: 0, background: '#E8F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#0072CC' }}>
                    {selectedClient.name?.charAt(0)}
                  </div>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700 }}>{selectedClient.name}</h1>
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{selectedClient.company}</p>
                  </div>
                </div>

                {/* Clickable stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'hsl(var(--bg-main))', padding: '4px 6px', borderRadius: 6, border: '1px solid hsl(var(--border))', flexWrap: 'wrap' }}>
                  {STATUS_STEPS.map((step, i) => {
                    const isCurrent = selectedClient.status === step;
                    return (
                      <React.Fragment key={i}>
                        <button
                          onClick={() => handleStatusChange(selectedClient, step)}
                          style={{ padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: isCurrent ? 600 : 400, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: isCurrent ? '#0072CC' : 'transparent', color: isCurrent ? '#fff' : 'hsl(var(--text-secondary))', transition: 'all 0.12s' }}
                        >
                          {step}
                        </button>
                        {i < STATUS_STEPS.length - 1 && <ChevronRight size={12} style={{ color: 'hsl(var(--border))', flexShrink: 0 }} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3-column body */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 210px', gap: 14, alignItems: 'start' }}>

              {/* Contact card */}
              <div className="card" style={{ padding: '18px 20px', position: 'sticky', top: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-secondary))', marginBottom: 14 }}>Contacto</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { icon: Mail,   val: selectedClient.email   || '—', color: '#0072CC' },
                    { icon: Phone,  val: selectedClient.phone   || '—', color: '#0ea5e9' },
                    { icon: MapPin, val: selectedClient.address || 'Lima, Perú', color: '#10b981' },
                  ].map(({ icon: Icon, val, color }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        <Icon size={13} />
                      </div>
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-primary))', wordBreak: 'break-all', marginTop: 4 }}>{val}</span>
                    </div>
                  ))}
                </div>

                {selectedClient.rucOrDni && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid hsl(var(--border))' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>RUC / DNI</p>
                    <p style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{selectedClient.rucOrDni}</p>
                  </div>
                )}

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid hsl(var(--border))' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tipo</p>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 4, ...typeStyle(selectedClient.type) }}>
                    {selectedClient.type}
                  </span>
                </div>
              </div>

              {/* Middle: tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))' }}>
                  {[{ id: 'overview', label: 'General' }, { id: 'history', label: 'Historial' }, { id: 'docs', label: 'Documentos' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{ padding: '8px 16px', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? '#0072CC' : 'hsl(var(--text-secondary))', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #0072CC' : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="card" style={{ padding: '14px 16px' }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-secondary))', marginBottom: 4 }}>Total Compras</p>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: '#0072CC' }}>{clientOrders.filter(o => o.status === 'Completado').length}</h3>
                  </div>
                  <div className="card" style={{ padding: '14px 16px' }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-secondary))', marginBottom: 4 }}>Total Gastado</p>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>S/ {totalGastado.toFixed(2)}</h3>
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Activity size={14} style={{ color: '#0072CC' }} /> Historial de Compras
                  </h4>
                  {clientOrders.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '20px 0' }}>Sin compras registradas aún.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[...clientOrders].reverse().slice(0, 8).map(order => (
                        <div key={order.id} style={{ display: 'flex', gap: 10, padding: '9px 10px', borderRadius: 6, alignItems: 'center', justifyContent: 'space-between' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ width: 30, height: 30, borderRadius: 6, background: order.status === 'Completado' ? '#ECFDF5' : '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={14} style={{ color: order.status === 'Completado' ? '#059669' : '#EA580C' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 500 }}>{order.items?.length || 0} producto{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
                              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{order.date} · {order.status}</p>
                            </div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0072CC' }}>S/ {(order.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: next step */}
              <div className="card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>Siguiente Paso</h4>
                  <PlusCircle size={16} style={{ color: 'hsl(var(--text-secondary))', cursor: 'pointer' }} />
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 6, background: '#EBF5FF', border: '1px solid #BFDBFE' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#0072CC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Asignar Responsable</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0072CC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>RP</div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Raúl Pacheco</span>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', fontSize: 12, padding: '7px 0' }}>Marcar Completado</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <Overlay onClose={closeModal}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} style={modalBox}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{editClient ? 'Editar Cliente' : 'Registrar Cliente'}</h3>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Nombre completo" required>
                    <input type="text" placeholder="Ej: Carlos Méndez" value={formData.name} onChange={e => set('name', e.target.value)} style={{ height: 36 }} />
                  </Field>
                  <Field label="Empresa">
                    <input type="text" placeholder="Ej: Textiles Lima SAC" value={formData.company} onChange={e => set('company', e.target.value)} style={{ height: 36 }} />
                  </Field>
                  <Field label="RUC / DNI">
                    <input type="text" placeholder="Ej: 20123456789 o 12345678" value={formData.rucOrDni || ''} onChange={e => set('rucOrDni', e.target.value)} style={{ height: 36 }} />
                  </Field>
                  <Field label="Correo electrónico" required>
                    <input type="email" placeholder="correo@empresa.com" value={formData.email} onChange={e => set('email', e.target.value)} style={{ height: 36 }} />
                  </Field>
                  <Field label="Teléfono">
                    <input type="tel" placeholder="999 888 777" value={formData.phone} onChange={e => set('phone', e.target.value)} style={{ height: 36 }} />
                  </Field>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Dirección">
                      <input type="text" placeholder="Ej: Av. Industrial 234, Lima" value={formData.address} onChange={e => set('address', e.target.value)} style={{ height: 36 }} />
                    </Field>
                  </div>
                  <Field label="Tipo de cliente">
                    <select value={formData.type} onChange={e => set('type', e.target.value)} style={{ height: 36 }}>
                      {TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select value={formData.status} onChange={e => set('status', e.target.value)} style={{ height: 36 }}>
                      {STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>

                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontSize: 13 }}>
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid hsl(var(--border))', marginTop: 4 }}>
                  <button type="button" className="btn-outline" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {saving ? 'Guardando...' : editClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <Overlay onClose={() => setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} style={{ ...modalBox, maxWidth: 400 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#E11D48' }}>Eliminar Cliente</h3>
                <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex' }}><X size={18} /></button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                  ¿Eliminar a <strong>"{deleteTarget.name}"</strong> de {deleteTarget.company}? Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-outline" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                  <button onClick={handleDelete} style={{ padding: '7px 18px', borderRadius: 4, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: '#E11D48', color: '#fff', border: 'none' }}>
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
