
import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, FileText, Download, Trash2,
  CheckCircle2, Clock, AlertCircle, X, PlusCircle,
  List, Columns, ChevronRight, ChevronLeft, Edit2, Package,
} from 'lucide-react';
import { generateProformaPDF } from '../utils/ProformaPDF';
import { useFirestore } from '../hooks/useFirestore';
import { motion, AnimatePresence } from 'framer-motion';

type ProformaStatus = 'Pendiente' | 'Enviada' | 'Aceptada' | 'Vencida';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  description: string;
  sku: string;
  brand?: string;
}

interface Client {
  id: string;
  name: string;
  company: string;
  rucOrDni?: string;
}

interface FormItem {
  productId?: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
}

const STATUS_ORDER: ProformaStatus[] = ['Pendiente', 'Enviada', 'Aceptada', 'Vencida'];

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

/* ── Inline status dropdown ─────────────────────────────── */
const StatusDropdown: React.FC<{ current: ProformaStatus; onChange: (s: ProformaStatus) => void }> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ss  = statusStyle(current);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {current}
        <ChevronRight size={10} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
              background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              overflow: 'hidden', minWidth: 130,
            }}
          >
            {STATUS_ORDER.map(s => {
              const sss = statusStyle(s);
              const isActive = s === current;
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 12px',
                    background: isActive ? 'hsl(var(--accent))' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: 12, fontWeight: isActive ? 700 : 500, color: sss.text,
                    borderLeft: isActive ? `3px solid ${sss.text}` : '3px solid transparent',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sss.text, flexShrink: 0 }} />
                  {s}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Main component ─────────────────────────────────────── */
const Proformas: React.FC = () => {
  const [searchTerm, setSearchTerm]       = useState('');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [viewMode, setViewMode]           = useState<'list' | 'kanban'>('list');
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [itemDropdowns, setItemDropdowns] = useState<boolean[]>([false]);
  const [itemSearches, setItemSearches]   = useState<string[]>(['']);

  const { data: clients }  = useFirestore<Client>('clients');
  const { data: products } = useFirestore<Product>('inventory');
  const { data: dbProformas, add: addProforma, update: updateProforma, remove: removeProforma } = useFirestore('proformas');

  const defaultExpiry = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const emptyForm = () => ({
    clientId:   '',
    expiryDate: defaultExpiry(),
    notes:      '',
    items:      [{ productId: '', name: '', description: '', quantity: 1, price: 0, unit: 'Unidad' }] as FormItem[],
  });

  const [formData, setFormData] = useState(emptyForm);

  const allProformas = [...(dbProformas || [])];

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setItemSearches(['']);
    setItemDropdowns([false]);
    setIsModalOpen(true);
  };

  const openEdit = (pf: any) => {
    setEditingId(pf.id);
    const its: FormItem[] = (pf.items || []).map((it: any) => ({
      productId:   it.productId   || '',
      name:        it.name        || '',
      description: it.description || '',
      quantity:    it.quantity    ?? 1,
      price:       it.price       ?? 0,
      unit:        it.unit        || 'Unidad',
    }));
    setFormData({
      clientId:   pf.clientId   || '',
      expiryDate: pf.expiryDate || defaultExpiry(),
      notes:      pf.notes      || '',
      items:      its,
    });
    setItemSearches(its.map(i => i.name));
    setItemDropdowns(its.map(() => false));
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData(f => ({ ...f, items: [...f.items, { productId: '', name: '', description: '', quantity: 1, price: 0, unit: 'Unidad' }] }));
    setItemSearches(s => [...s, '']);
    setItemDropdowns(d => [...d, false]);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
    setItemSearches(s => s.filter((_, i) => i !== index));
    setItemDropdowns(d => d.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, product: Product) => {
    const items = [...formData.items];
    items[index] = { ...items[index], productId: product.id, name: product.name, description: product.description || '', price: product.price, unit: product.unit || 'Unidad' };
    setFormData(f => ({ ...f, items }));
    setItemSearches(s => { const a = [...s]; a[index] = product.name; return a; });
    setItemDropdowns(d => { const a = [...d]; a[index] = false; return a; });
  };

  const calcTotal = (items: FormItem[]) => items.reduce((s, i) => s + i.quantity * i.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients?.find(c => c.id === formData.clientId);
    const total  = calcTotal(formData.items);

    try {
      if (editingId) {
        const existing = allProformas.find(p => p.id === editingId) as any;
        await updateProforma(editingId, {
          clientId:    formData.clientId,
          client:      client?.name    || 'Cliente Genérico',
          company:     client?.company || '',
          expiryDate:  formData.expiryDate,
          items:       formData.items,
          notes:       formData.notes,
          total,
          ...(client?.rucOrDni && { clientRucOrDni: client.rucOrDni }),
        });
        generateProformaPDF({
          id:             existing?.displayId || editingId,
          clientName:     client?.name    || 'Cliente Genérico',
          clientCompany:  client?.company || '',
          clientRucOrDni: client?.rucOrDni,
          date:           existing?.date  || new Date().toISOString().split('T')[0],
          expiryDate:     formData.expiryDate,
          items:          formData.items,
          subtotal:       total / 1.18,
          tax:            total - total / 1.18,
          total,
          notes:          formData.notes || undefined,
        });
      } else {
        const displayId = `PF-${Date.now().toString().slice(-6)}`;
        const date = new Date().toISOString().split('T')[0];
        await addProforma({
          displayId,
          clientId:    formData.clientId,
          client:      client?.name    || 'Cliente Genérico',
          company:     client?.company || '',
          date,
          expiryDate:  formData.expiryDate,
          items:       formData.items,
          notes:       formData.notes,
          total,
          status:      'Pendiente' as ProformaStatus,
          ...(client?.rucOrDni && { clientRucOrDni: client.rucOrDni }),
        });
        generateProformaPDF({
          id:             displayId,
          clientName:     client?.name    || 'Cliente Genérico',
          clientCompany:  client?.company || '',
          clientRucOrDni: client?.rucOrDni,
          date,
          expiryDate:     formData.expiryDate,
          items:          formData.items,
          subtotal:       total / 1.18,
          tax:            total - total / 1.18,
          total,
          notes:          formData.notes || undefined,
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(emptyForm());
      setItemSearches(['']);
      setItemDropdowns([false]);
    } catch (err) {
      console.error('Error saving proforma:', err);
    }
  };

  const handleDownload = (pf: any) => {
    const total = typeof pf.total === 'number' ? pf.total : 0;
    generateProformaPDF({
      id:             pf.displayId || pf.id,
      clientName:     pf.client,
      clientCompany:  pf.company || '',
      clientRucOrDni: pf.clientRucOrDni,
      date:           pf.date,
      expiryDate:     pf.expiryDate || defaultExpiry(),
      items:          pf.items || [],
      subtotal:       total / 1.18,
      tax:            total - total / 1.18,
      total,
      notes:          pf.notes || undefined,
    });
  };

  const handleStatusChange = (id: string, s: ProformaStatus) => updateProforma(id, { status: s });

  const handleDelete = async () => {
    if (!deleteId) return;
    await removeProforma(deleteId);
    setDeleteId(null);
  };

  const moveStatus = (id: string, current: ProformaStatus, dir: 'prev' | 'next') => {
    const idx    = STATUS_ORDER.indexOf(current);
    const newIdx = dir === 'next' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;
    updateProforma(id, { status: STATUS_ORDER[newIdx] });
  };

  const filtered = allProformas.filter(pf =>
    (pf.displayId || pf.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pf.client || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Proformas</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            {allProformas.length} cotizacion{allProformas.length !== 1 ? 'es' : ''} registrada{allProformas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Nueva Proforma
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Emitido', value: allProformas.length,                                       icon: FileText,    color: '#0072CC' },
          { label: 'Aceptadas',     value: allProformas.filter(p => p.status === 'Aceptada').length,  icon: CheckCircle2, color: '#059669' },
          { label: 'Pendientes',    value: allProformas.filter(p => p.status === 'Pendiente').length, icon: Clock,       color: '#D97706' },
          { label: 'Vencidas',      value: allProformas.filter(p => p.status === 'Vencida').length,   icon: AlertCircle, color: '#E11D48' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: `${stat.color}14`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={18} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <h4 style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
          <input type="text" placeholder="Filtrar por NRO o cliente..." style={{ paddingLeft: 30, height: 32, width: '100%', fontSize: 13 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div style={{ display: 'flex', background: 'hsl(var(--bg-main))', border: '1px solid hsl(var(--border))', borderRadius: 6, overflow: 'hidden' }}>
          {[{ mode: 'list', Icon: List }, { mode: 'kanban', Icon: Columns }].map(({ mode, Icon }) => (
            <button key={mode} onClick={() => setViewMode(mode as 'list' | 'kanban')} style={{ padding: '6px 12px', border: 'none', background: viewMode === mode ? '#0072CC' : 'transparent', color: viewMode === mode ? '#fff' : 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'hsl(var(--bg-main))', borderBottom: '1px solid hsl(var(--border))', fontSize: 11, fontWeight: 600, textAlign: 'left', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '10px 18px' }}>NRO</th>
                  <th style={{ padding: '10px 18px' }}>Cliente</th>
                  <th style={{ padding: '10px 18px', textAlign: 'center' }}>Items</th>
                  <th style={{ padding: '10px 18px' }}>Total</th>
                  <th style={{ padding: '10px 18px' }}>Vence</th>
                  <th style={{ padding: '10px 18px' }}>Estado</th>
                  <th style={{ padding: '10px 18px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: 13 }}>No hay proformas registradas.</td></tr>
                ) : filtered.map(pf => (
                  <tr key={pf.id} style={{ borderBottom: '1px solid hsl(var(--border))', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 18px', fontWeight: 600, color: '#0072CC', fontFamily: 'monospace' }}>{pf.displayId || pf.id}</td>
                    <td style={{ padding: '11px 18px' }}>
                      <p style={{ fontWeight: 600 }}>{pf.client}</p>
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{pf.company}</p>
                    </td>
                    <td style={{ padding: '11px 18px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'hsl(var(--bg-main))', color: 'hsl(var(--text-secondary))' }}>{pf.items?.length || 0} items</span>
                    </td>
                    <td style={{ padding: '11px 18px', fontWeight: 700, fontSize: 14 }}>
                      S/ {(typeof pf.total === 'number' ? pf.total : 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '11px 18px' }}>
                      {pf.expiryDate ? (
                        <span style={{ fontSize: 12, color: new Date(pf.expiryDate) < new Date() ? '#E11D48' : 'hsl(var(--text-secondary))', fontWeight: new Date(pf.expiryDate) < new Date() ? 600 : 400 }}>
                          {new Date(pf.expiryDate).toLocaleDateString('es-PE')}
                        </span>
                      ) : <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 18px' }}>
                      <StatusDropdown current={pf.status as ProformaStatus} onChange={s => handleStatusChange(pf.id, s)} />
                    </td>
                    <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(pf)} title="Editar"
                          style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDownload(pf)} title="Descargar PDF"
                          style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid #BFDBFE', background: '#EBF5FF', color: '#0072CC', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <Download size={14} />
                        </button>
                        <button onClick={() => setDeleteId(pf.id)} title="Eliminar"
                          style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid #FECACA', background: '#FFF1F2', color: '#E11D48', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ───────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {kanbanCols.map(col => {
            const colItems = filtered.filter(pf => pf.status === col.id);
            const colIdx   = STATUS_ORDER.indexOf(col.id);
            return (
              <div key={col.id} className="kanban-col" style={{ minWidth: 260, flex: 1 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: col.bg, color: col.color }}>{colItems.length}</span>
                </div>
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                  <AnimatePresence>
                    {colItems.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '16px 0' }}>Sin proformas</p>
                    ) : colItems.map(pf => (
                      <motion.div key={pf.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="kanban-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0072CC', fontFamily: 'monospace' }}>{pf.displayId || pf.id}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => openEdit(pf)} style={{ padding: 4, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', display: 'flex', cursor: 'pointer' }} title="Editar"><Edit2 size={13} /></button>
                            <button onClick={() => handleDownload(pf)} style={{ padding: 4, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', display: 'flex', cursor: 'pointer' }} title="Descargar"><Download size={13} /></button>
                            <button onClick={() => setDeleteId(pf.id)} style={{ padding: 4, background: 'transparent', border: 'none', color: '#E11D48', display: 'flex', cursor: 'pointer' }} title="Eliminar"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{pf.client}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{pf.company}</p>
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>S/ {(typeof pf.total === 'number' ? pf.total : 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                          <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{pf.items?.length || 0} items</span>
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                          {colIdx > 0 && (
                            <button onClick={() => moveStatus(pf.id, pf.status as ProformaStatus, 'prev')}
                              style={{ flex: 1, padding: '4px 6px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 4, cursor: 'pointer', border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--text-secondary))' }}>
                              <ChevronLeft size={11} />{STATUS_ORDER[colIdx - 1]}
                            </button>
                          )}
                          {colIdx < STATUS_ORDER.length - 1 && (
                            <button onClick={() => moveStatus(pf.id, pf.status as ProformaStatus, 'next')}
                              style={{ flex: 1, padding: '4px 6px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 4, cursor: 'pointer', border: `1px solid ${kanbanCols[colIdx + 1].color}44`, background: kanbanCols[colIdx + 1].bg, color: kanbanCols[colIdx + 1].color }}>
                              {STATUS_ORDER[colIdx + 1]}<ChevronRight size={11} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button onClick={openCreate}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 6, border: '1px dashed hsl(var(--border))', background: 'transparent', color: 'hsl(var(--text-secondary))', fontSize: 12, cursor: 'pointer', marginTop: 4, transition: 'all 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0072CC'; (e.currentTarget as HTMLElement).style.color = '#0072CC'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; (e.currentTarget as HTMLElement).style.color = 'hsl(var(--text-secondary))'; }}>
                    <PlusCircle size={13} /> Nueva proforma
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DELETE CONFIRMATION ───────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{ background: 'hsl(var(--bg-card))', borderRadius: 10, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Trash2 size={20} color="#E11D48" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>¿Eliminar proforma?</h3>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', margin: '0 0 20px' }}>Esta acción no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteId(null)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>Cancelar</button>
                <button onClick={handleDelete} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#E11D48', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 28, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{editingId ? 'Editar Proforma' : 'Nueva Cotización'}</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} style={{ padding: 6, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Client + Expiry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>Cliente *</label>
                    <select required value={formData.clientId} onChange={e => setFormData(f => ({ ...f, clientId: e.target.value }))} style={{ height: 36 }}>
                      <option value="">Selecciona un cliente...</option>
                      {clients?.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>Válido hasta *</label>
                    <input type="date" required value={formData.expiryDate} min={new Date().toISOString().split('T')[0]} onChange={e => setFormData(f => ({ ...f, expiryDate: e.target.value }))} style={{ height: 36 }} />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Productos / Servicios</p>
                    <button type="button" onClick={handleAddItem} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#0072CC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      <PlusCircle size={14} /> Añadir item
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formData.items.map((item, index) => {
                      const filteredProducts = (products || []).filter(p =>
                        itemSearches[index] && p.name.toLowerCase().includes((itemSearches[index] || '').toLowerCase())
                      );
                      return (
                        <div key={index} style={{ padding: '12px 14px', borderRadius: 8, background: 'hsl(var(--bg-main))', border: '1px solid hsl(var(--border))' }}>
                          {/* Product search */}
                          <div style={{ position: 'relative', marginBottom: 8 }}>
                            <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', display: 'block', marginBottom: 4 }}>Producto / Servicio *</label>
                            <div style={{ position: 'relative' }}>
                              <Package size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
                              <input
                                type="text" required placeholder="Buscar en inventario o escribir libremente..."
                                value={itemSearches[index] ?? ''}
                                style={{ paddingLeft: 28, height: 34, width: '100%' }}
                                onChange={e => {
                                  const val = e.target.value;
                                  setItemSearches(s => { const a = [...s]; a[index] = val; return a; });
                                  const items = [...formData.items];
                                  items[index] = { ...items[index], name: val, productId: '' };
                                  setFormData(f => ({ ...f, items }));
                                  setItemDropdowns(d => { const a = [...d]; a[index] = true; return a; });
                                }}
                                onBlur={() => setTimeout(() => setItemDropdowns(d => { const a = [...d]; a[index] = false; return a; }), 150)}
                                onFocus={() => { if (itemSearches[index]) setItemDropdowns(d => { const a = [...d]; a[index] = true; return a; }); }}
                              />
                            </div>
                            {itemDropdowns[index] && filteredProducts.length > 0 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto' }}>
                                {filteredProducts.slice(0, 6).map(p => (
                                  <button key={p.id} type="button" onMouseDown={() => selectProduct(index, p)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                  >
                                    <div>
                                      <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{p.name}</p>
                                      <p style={{ fontSize: 10, color: 'hsl(var(--text-secondary))' }}>{p.sku} · Stock: {p.stock} {p.unit}</p>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0072CC', flexShrink: 0, marginLeft: 8 }}>S/ {p.price.toFixed(2)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', display: 'block', marginBottom: 4 }}>Descripción</label>
                            <input type="text" placeholder="Descripción del producto (opcional)" value={item.description} style={{ height: 32, width: '100%', fontSize: 12 }}
                              onChange={e => {
                                const items = [...formData.items];
                                items[index] = { ...items[index], description: e.target.value };
                                setFormData(f => ({ ...f, items }));
                              }}
                            />
                          </div>

                          {/* Qty / Price / Delete */}
                          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 36px', gap: 8, alignItems: 'end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>Cantidad</label>
                              <input type="number" required min={1} value={item.quantity} style={{ height: 32 }}
                                onChange={e => {
                                  const items = [...formData.items];
                                  items[index] = { ...items[index], quantity: parseInt(e.target.value) || 1 };
                                  setFormData(f => ({ ...f, items }));
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <label style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>
                                Precio Unit. (S/)
                                {item.productId && <span style={{ color: '#059669', marginLeft: 6, fontSize: 10 }}>· desde inventario</span>}
                              </label>
                              <input type="number" required min={0} step="0.01" value={item.price} style={{ height: 32 }}
                                onChange={e => {
                                  const items = [...formData.items];
                                  items[index] = { ...items[index], price: parseFloat(e.target.value) || 0 };
                                  setFormData(f => ({ ...f, items }));
                                }}
                              />
                            </div>
                            <button type="button" onClick={() => handleRemoveItem(index)} disabled={formData.items.length === 1}
                              style={{ padding: '7px 8px', background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 4, color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: formData.items.length === 1 ? 0.4 : 1 }}>
                              <X size={14} />
                            </button>
                          </div>

                          <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12, color: 'hsl(var(--text-secondary))' }}>
                            Subtotal: <strong style={{ color: '#0072CC' }}>S/ {(item.quantity * item.price).toFixed(2)}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>Notas / Condiciones</label>
                  <textarea
                    value={formData.notes}
                    placeholder="Ej: Incluye instalación. Entrega en 15 días hábiles. Precio válido por 30 días..."
                    rows={3}
                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                    style={{ resize: 'vertical', padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-main))', color: 'hsl(var(--text-primary))', outline: 'none' }}
                  />
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid hsl(var(--border))', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ padding: '10px 16px', borderRadius: 6, background: 'hsl(var(--bg-main))', border: '1px solid hsl(var(--border))' }}>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginBottom: 4 }}>Total (inc. IGV)</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#0072CC' }}>
                      S/ {calcTotal(formData.items).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="btn-outline">Cancelar</button>
                    <button type="submit" className="btn-primary">{editingId ? 'Guardar cambios' : 'Generar y Descargar'}</button>
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
