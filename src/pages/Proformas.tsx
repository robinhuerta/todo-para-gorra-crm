
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
  PlusCircle,
  List,
  Columns,
} from 'lucide-react';
import { generateProformaPDF } from '../utils/ProformaPDF';
import { useFirestore } from '../hooks/useFirestore';
import { motion, AnimatePresence } from 'framer-motion';

type ProformaStatus = 'Pendiente' | 'Enviada' | 'Aceptada' | 'Vencida';

const kanbanCols: { id: ProformaStatus; label: string; color: string; bg: string }[] = [
  { id: 'Pendiente', label: 'Pendiente', color: '#D97706', bg: '#FFFBEB' },
  { id: 'Enviada',   label: 'Enviada',   color: '#0072CC', bg: '#EBF5FF' },
  { id: 'Aceptada',  label: 'Aceptada',  color: '#059669', bg: '#ECFDF5' },
  { id: 'Vencida',   label: 'Vencida',   color: '#E11D48', bg: '#FFF1F2' },
];

const statusStyle = (status: string) => {
  switch (status) {
    case 'Aceptada': return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    case 'Enviada':  return { bg: '#EBF5FF', text: '#0072CC', border: '#BFDBFE' };
    case 'Vencida':  return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' };
    default:         return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  }
};

const Proformas: React.FC = () => {
  const [searchTerm, setSearchTerm]   = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode]       = useState<'list' | 'kanban'>('list');
  const { data: clients }             = useFirestore('clients');
  const { data: dbProformas, add: addProforma } = useFirestore('proformas');

  const [formData, setFormData] = useState({
    clientId: '',
    items: [{ name: '', description: '', quantity: 1, price: 0 }],
  });

  const allProformas = [...(dbProformas || [])];

  const handleAddItem = () =>
    setFormData(f => ({ ...f, items: [...f.items, { name: '', description: '', quantity: 1, price: 0 }] }));

  const handleRemoveItem = (index: number) =>
    setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const calculateTotal = (items: any[]) =>
    items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients?.find((c: any) => c.id === formData.clientId);
    const total = calculateTotal(formData.items);
    const newProforma = {
      id: `PF-${Date.now().toString().slice(-6)}`,
      client:  selectedClient?.name    || 'Cliente Genérico',
      company: selectedClient?.company || 'Empresa',
      date:    new Date().toISOString().split('T')[0],
      items:   formData.items,
      total,
      status:  'Pendiente',
    };
    try {
      await addProforma(newProforma);
      setIsModalOpen(false);
      generateProformaPDF({
        ...newProforma,
        clientName:    newProforma.client,
        clientCompany: newProforma.company,
        expiryDate:    '2025-12-31',
        subtotal:      total / 1.18,
        tax:           total - total / 1.18,
      });
      setFormData({ clientId: '', items: [{ name: '', description: '', quantity: 1, price: 0 }] });
    } catch (err) {
      console.error('Error saving proforma:', err);
    }
  };

  const handleDownload = (pf: any) => {
    const total = typeof pf.total === 'string' ? parseFloat(pf.total.replace('$', '')) : pf.total;
    generateProformaPDF({
      id:            pf.id,
      clientName:    pf.client,
      clientCompany: pf.company || 'Empresa',
      date:          pf.date,
      expiryDate:    '2025-12-31',
      items:         pf.items || [],
      subtotal:      total / 1.18,
      tax:           total - total / 1.18,
      total,
    });
  };

  const filtered = allProformas.filter(
    pf =>
      (pf.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pf.client || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Proformas</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Crea y gestiona cotizaciones para maquinaria y repuestos.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Nueva Proforma
        </button>
      </div>

      {/* KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Emitido', value: allProformas.length,                                    icon: FileText,   color: '#0072CC' },
          { label: 'Aceptadas',     value: allProformas.filter(p => p.status === 'Aceptada').length, icon: CheckCircle2, color: '#059669' },
          { label: 'Pendientes',    value: allProformas.filter(p => p.status === 'Pendiente').length, icon: Clock,     color: '#D97706' },
          { label: 'Vencidas',      value: allProformas.filter(p => p.status === 'Vencida').length,  icon: AlertCircle, color: '#E11D48' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 6, flexShrink: 0,
              background: `${stat.color}14`, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <stat.icon size={18} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </p>
              <h4 style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{
            position: 'absolute', left: 9, top: '50%',
            transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))',
          }} />
          <input
            type="text"
            placeholder="Filtrar por NRO o cliente..."
            style={{ paddingLeft: 30, height: 32, width: '100%', fontSize: 13 }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {/* View toggle */}
        <div style={{
          display: 'flex', background: 'hsl(var(--bg-main))',
          border: '1px solid hsl(var(--border))', borderRadius: 6, overflow: 'hidden',
        }}>
          {[
            { mode: 'list',   Icon: List },
            { mode: 'kanban', Icon: Columns },
          ].map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as 'list' | 'kanban')}
              style={{
                padding: '6px 12px', border: 'none',
                background: viewMode === mode ? '#0072CC' : 'transparent',
                color: viewMode === mode ? '#fff' : 'hsl(var(--text-secondary))',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ───────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  background: 'hsl(var(--bg-main))',
                  borderBottom: '1px solid hsl(var(--border))',
                  fontSize: 11, fontWeight: 600, textAlign: 'left',
                  color: 'hsl(var(--text-secondary))',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <th style={{ padding: '10px 18px' }}>NRO</th>
                  <th style={{ padding: '10px 18px' }}>Cliente</th>
                  <th style={{ padding: '10px 18px', textAlign: 'center' }}>Items</th>
                  <th style={{ padding: '10px 18px' }}>Total</th>
                  <th style={{ padding: '10px 18px' }}>Estado</th>
                  <th style={{ padding: '10px 18px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                      No hay proformas registradas.
                    </td>
                  </tr>
                ) : filtered.map(pf => {
                  const ss = statusStyle(pf.status);
                  return (
                    <tr
                      key={pf.id}
                      style={{ borderBottom: '1px solid hsl(var(--border))', fontSize: 13 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 18px', fontWeight: 600, color: '#0072CC', fontFamily: 'monospace' }}>{pf.id}</td>
                      <td style={{ padding: '11px 18px' }}>
                        <p style={{ fontWeight: 600 }}>{pf.client}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{pf.company}</p>
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'hsl(var(--bg-main))', color: 'hsl(var(--text-secondary))' }}>
                          {pf.items?.length || 0} items
                        </span>
                      </td>
                      <td style={{ padding: '11px 18px', fontWeight: 700, fontSize: 14 }}>
                        ${(typeof pf.total === 'number' ? pf.total : 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`,
                        }}>
                          {pf.status}
                        </span>
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleDownload(pf)}
                            style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid #BFDBFE', background: '#EBF5FF', color: '#0072CC', display: 'flex', alignItems: 'center' }}
                            title="Descargar"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid #FECACA', background: 'transparent', color: '#E11D48', display: 'flex', alignItems: 'center' }}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ─────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {kanbanCols.map(col => {
            const colItems = filtered.filter(pf => pf.status === col.id);
            return (
              <div key={col.id} className="kanban-col" style={{ minWidth: 260, flex: 1 }}>
                {/* Column header */}
                <div style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid hsl(var(--border))',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: col.color,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: col.bg, color: col.color,
                  }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                  <AnimatePresence>
                    {colItems.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '16px 0' }}>
                        Sin proformas
                      </p>
                    ) : colItems.map(pf => (
                      <motion.div
                        key={pf.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="kanban-card"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0072CC', fontFamily: 'monospace' }}>{pf.id}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleDownload(pf)}
                              style={{ padding: 4, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', display: 'flex', cursor: 'pointer' }}
                              title="Descargar"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              style={{ padding: 4, background: 'transparent', border: 'none', color: '#E11D48', display: 'flex', cursor: 'pointer' }}
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{pf.client}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{pf.company}</p>
                        <div style={{
                          marginTop: 10, paddingTop: 8,
                          borderTop: '1px solid hsl(var(--border))',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            ${(typeof pf.total === 'number' ? pf.total : 0).toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>
                            {pf.items?.length || 0} items
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add to this column */}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px', borderRadius: 6, border: '1px dashed hsl(var(--border))',
                      background: 'transparent', color: 'hsl(var(--text-secondary))',
                      fontSize: 12, cursor: 'pointer', marginTop: 4,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#0072CC';
                      (e.currentTarget as HTMLElement).style.color = '#0072CC';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))';
                      (e.currentTarget as HTMLElement).style.color = 'hsl(var(--text-secondary))';
                    }}
                  >
                    <PlusCircle size={13} /> Nueva proforma
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              style={{
                background: 'hsl(var(--bg-card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 10, padding: 28,
                width: '100%', maxWidth: 680,
                maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Nueva Cotización Industrial</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: 6, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Client */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>
                    Cliente Receptor
                  </label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={e => setFormData(f => ({ ...f, clientId: e.target.value }))}
                    style={{ height: 36 }}
                  >
                    <option value="">Selecciona un cliente...</option>
                    {clients?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                    ))}
                  </select>
                </div>

                {/* Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Items</p>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#0072CC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      <PlusCircle size={14} /> Añadir item
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 80px 120px 36px',
                          gap: 8, alignItems: 'end',
                          padding: '12px 14px', borderRadius: 6,
                          background: 'hsl(var(--bg-main))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>Nombre / Modelo</label>
                          <input
                            type="text" required placeholder="Bordadora X-10..."
                            value={item.name}
                            onChange={e => {
                              const items = [...formData.items];
                              items[index].name = e.target.value;
                              setFormData(f => ({ ...f, items }));
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>Cantidad</label>
                          <input
                            type="number" required min={1}
                            value={item.quantity}
                            onChange={e => {
                              const items = [...formData.items];
                              items[index].quantity = parseInt(e.target.value);
                              setFormData(f => ({ ...f, items }));
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>Precio Unit. ($)</label>
                          <input
                            type="number" required min={0} step="0.01"
                            value={item.price}
                            onChange={e => {
                              const items = [...formData.items];
                              items[index].price = parseFloat(e.target.value);
                              setFormData(f => ({ ...f, items }));
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          style={{ padding: '7px 8px', background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 4, color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 16, borderTop: '1px solid hsl(var(--border))', flexWrap: 'wrap', gap: 12,
                }}>
                  <div style={{ padding: '10px 16px', borderRadius: 6, background: 'hsl(var(--bg-main))', border: '1px solid hsl(var(--border))' }}>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginBottom: 4 }}>Total Aproximado</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#0072CC' }}>
                      ${calculateTotal(formData.items).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary">
                      Generar y Descargar
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Proformas;
