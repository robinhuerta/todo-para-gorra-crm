
import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  Truck,
  Settings,
  Eye,
  Edit,
  Trash2,
  Filter,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

type FormData = Omit<InventoryItem, 'id'>;

const EMPTY_FORM: FormData = {
  name: '',
  category: 'machinery',
  brand: '',
  price: '',
  stock: 0,
  status: 'In Stock',
};

const categoryMeta = {
  machinery: { label: 'Maquinaria',  icon: Truck,    color: '#f59e0b' },
  parts:     { label: 'Repuestos',   icon: Settings, color: '#0ea5e9' },
  caps:      { label: 'Gorras Imp.', icon: Package,  color: '#0072CC' },
};

/* ─── small reusable field wrapper ─── */
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: '#1E2D3D' }}>
      {label}{required && <span style={{ color: '#E11D48', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab]   = useState<'machinery' | 'parts' | 'caps'>('machinery');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editItem, setEditItem]     = useState<InventoryItem | null>(null);
  const [viewItem, setViewItem]     = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [formData, setFormData]     = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const { data: items, loading, add, update, remove } = useFirestore<InventoryItem>('inventory');

  const counts = {
    machinery: items.filter(i => i.category === 'machinery').length,
    parts:     items.filter(i => i.category === 'parts').length,
    caps:      items.filter(i => i.category === 'caps').length,
  };

  const filtered = items.filter(
    item =>
      item.category === activeTab &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  /* ── open modal ── */
  const openAdd = () => {
    setEditItem(null);
    setFormData({ ...EMPTY_FORM, category: activeTab });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setFormData({
      name:     item.name,
      category: item.category,
      brand:    item.brand,
      price:    item.price,
      stock:    item.stock,
      status:   item.status,
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditItem(null); };

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.brand.trim() || !formData.price.trim()) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editItem) {
        await update(editItem.id, formData);
      } else {
        await add(formData);
      }
      closeModal();
    } catch {
      setFormError('Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await remove(deleteTarget.id); }
    catch { /* silently fail */ }
    finally { setDeleteTarget(null); }
  };

  const set = (field: keyof FormData, value: string | number) =>
    setFormData(f => ({ ...f, [field]: value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Catálogo Industrial</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Gestión de activos, repuestos y logística de importación.
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Nuevo Activo
        </button>
      </div>

      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {(Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map(key => {
          const meta  = categoryMeta[key];
          const Icon  = meta.icon;
          const isAct = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', textAlign: 'left', cursor: 'pointer',
                border: isAct ? '1.5px solid #0072CC' : undefined,
                background: isAct ? '#EBF5FF' : 'hsl(var(--bg-card))',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isAct ? '#0072CC' : `${meta.color}18`,
                color: isAct ? '#fff' : meta.color,
              }}>
                <Icon size={20} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: isAct ? '#0072CC' : 'hsl(var(--text-secondary))' }}>
                  {meta.label}
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-primary))', lineHeight: 1.2 }}>
                  {counts[key]} <span style={{ fontSize: 12, fontWeight: 400, color: 'hsl(var(--text-secondary))' }}>items</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, padding: '12px 16px',
          borderBottom: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-main))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} style={{ color: 'hsl(var(--text-secondary))' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{categoryMeta[activeTab].label}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E8F3FC', color: '#0072CC', fontWeight: 600 }}>
              {filtered.length} registros
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
            <input
              type="text"
              placeholder="Buscar por modelo o marca..."
              style={{ paddingLeft: 30, height: 32, width: 260, fontSize: 13 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'hsl(var(--bg-main))', borderBottom: '1px solid hsl(var(--border))',
                fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))',
                textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left',
              }}>
                <th style={{ padding: '10px 16px' }}>Producto / Modelo</th>
                <th style={{ padding: '10px 16px' }}>Fabricante</th>
                <th style={{ padding: '10px 16px' }}>Precio</th>
                <th style={{ padding: '10px 16px' }}>Stock</th>
                <th style={{ padding: '10px 16px' }}>Estado</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: 13 }}>Cargando inventario...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Package size={32} style={{ color: 'hsl(var(--border))' }} />
                      <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>No hay activos en esta categoría.</p>
                      <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '6px 14px' }}>
                        <Plus size={13} /> Agregar primero
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((item, i) => {
                const meta    = categoryMeta[item.category];
                const Icon    = meta.icon;
                const inStock = item.status === 'In Stock' || item.status === 'Stock';
                const pct     = Math.min(100, item.stock > 10 ? 100 : item.stock * 10);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid hsl(var(--border))', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 6, flexShrink: 0, background: `${meta.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{item.name}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 1 }}>Importación Directa</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', color: 'hsl(var(--text-primary))', fontWeight: 500 }}>{item.brand}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, color: '#059669', fontSize: 14 }}>{item.price}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ width: 90 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{item.stock}</span>
                          <span style={{ color: 'hsl(var(--text-secondary))' }}>Unid</span>
                        </div>
                        <div style={{ height: 4, background: 'hsl(var(--border))', borderRadius: 2, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: i * 0.03 }}
                            style={{ height: '100%', borderRadius: 2, background: item.stock < 5 ? '#E11D48' : '#0072CC' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: inStock ? '#ECFDF5' : '#FFFBEB',
                        color:      inStock ? '#059669' : '#D97706',
                        border:     `1px solid ${inStock ? '#A7F3D0' : '#FDE68A'}`,
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <button onClick={() => setViewItem(item)} title="Ver detalle" style={btnStyle('default')}><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)}    title="Editar"      style={btnStyle('default')}><Edit size={14} /></button>
                        <button onClick={() => setDeleteTarget(item)} title="Eliminar" style={btnStyle('danger')}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <Overlay>
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{   opacity: 0, scale: 0.97, y: 16 }}
              style={modalStyle}
            >
              {/* Header */}
              <div style={modalHeader}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  {editItem ? 'Editar Activo' : 'Nuevo Activo'}
                </h3>
                <button onClick={closeModal} style={iconBtn}><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Nombre / Modelo" required>
                    <input
                      type="text" placeholder="Ej: Bordadora XL-200"
                      value={formData.name}
                      onChange={e => set('name', e.target.value)}
                      style={{ height: 36 }}
                    />
                  </Field>
                  <Field label="Fabricante / Marca" required>
                    <input
                      type="text" placeholder="Ej: Brother, Tajima..."
                      value={formData.brand}
                      onChange={e => set('brand', e.target.value)}
                      style={{ height: 36 }}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <Field label="Categoría" required>
                    <select value={formData.category} onChange={e => set('category', e.target.value)} style={{ height: 36 }}>
                      <option value="machinery">Maquinaria</option>
                      <option value="parts">Repuestos</option>
                      <option value="caps">Gorras Imp.</option>
                    </select>
                  </Field>
                  <Field label="Precio (ej: $1,200)" required>
                    <input
                      type="text" placeholder="$0.00"
                      value={formData.price}
                      onChange={e => set('price', e.target.value)}
                      style={{ height: 36 }}
                    />
                  </Field>
                  <Field label="Stock (unidades)" required>
                    <input
                      type="number" min={0}
                      value={formData.stock}
                      onChange={e => set('stock', parseInt(e.target.value) || 0)}
                      style={{ height: 36 }}
                    />
                  </Field>
                </div>

                <Field label="Estado">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['In Stock', 'Stock Limitado', 'Sin Stock'].map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => set('status', s)}
                        style={{
                          padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          border: '1px solid',
                          borderColor: formData.status === s ? '#0072CC' : 'hsl(var(--border))',
                          background:  formData.status === s ? '#EBF5FF'  : 'transparent',
                          color:       formData.status === s ? '#0072CC'  : 'hsl(var(--text-secondary))',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Error */}
                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontSize: 13 }}>
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid hsl(var(--border))', marginTop: 4 }}>
                  <button type="button" onClick={closeModal} className="btn-outline">Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={saving}
                    style={{ minWidth: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {saving
                      ? <><Spinner /> Guardando...</>
                      : editItem ? 'Guardar Cambios' : 'Crear Activo'
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── VIEW DETAIL MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {viewItem && (
          <Overlay>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{   opacity: 0, scale: 0.97 }}
              style={{ ...modalStyle, maxWidth: 440 }}
            >
              <div style={modalHeader}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Detalle del Activo</h3>
                <button onClick={() => setViewItem(null)} style={iconBtn}><X size={18} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                    background: `${categoryMeta[viewItem.category].color}14`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: categoryMeta[viewItem.category].color,
                  }}>
                    {React.createElement(categoryMeta[viewItem.category].icon, { size: 26 })}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 17, fontWeight: 700 }}>{viewItem.name}</h4>
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{viewItem.brand} · {categoryMeta[viewItem.category].label}</p>
                  </div>
                </div>

                <div style={{ height: 1, background: 'hsl(var(--border))' }} />

                {/* Fields */}
                {[
                  { label: 'Precio',    value: viewItem.price },
                  { label: 'Stock',     value: `${viewItem.stock} unidades` },
                  { label: 'Estado',    value: viewItem.status },
                  { label: 'Categoría', value: categoryMeta[viewItem.category].label },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn-outline" style={{ flex: 1 }} onClick={() => setViewItem(null)}>Cerrar</button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => { setViewItem(null); openEdit(viewItem); }}>
                    Editar
                  </button>
                </div>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <Overlay>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{   opacity: 0, scale: 0.97 }}
              style={{ ...modalStyle, maxWidth: 400 }}
            >
              <div style={modalHeader}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#E11D48' }}>Eliminar Activo</h3>
                <button onClick={() => setDeleteTarget(null)} style={iconBtn}><X size={18} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'hsl(var(--text-primary))', lineHeight: 1.6 }}>
                  ¿Estás seguro de que deseas eliminar <strong>"{deleteTarget.name}"</strong>?
                  Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-outline" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                  <button
                    onClick={handleDelete}
                    style={{ padding: '7px 18px', borderRadius: 4, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: '#E11D48', color: '#fff', border: 'none' }}
                  >
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

/* ─── shared style helpers ─────────────────────────────────── */
const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
  }}>
    {children}
  </div>
);

const Spinner = () => (
  <div style={{
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  }} />
);

const modalStyle: React.CSSProperties = {
  background: 'hsl(var(--bg-card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 10,
  width: '100%',
  maxWidth: 580,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const modalHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: '1px solid hsl(var(--border))',
};

const iconBtn: React.CSSProperties = {
  padding: 6, background: 'transparent', border: 'none',
  color: 'hsl(var(--text-secondary))', cursor: 'pointer',
  display: 'flex', alignItems: 'center', borderRadius: 4,
};

const btnStyle = (variant: 'default' | 'danger'): React.CSSProperties => ({
  padding: '5px 7px', borderRadius: 4, border: '1px solid',
  borderColor: variant === 'danger' ? '#FECACA' : 'hsl(var(--border))',
  background: 'transparent',
  color: variant === 'danger' ? '#E11D48' : 'hsl(var(--text-secondary))',
  display: 'flex', alignItems: 'center', cursor: 'pointer',
});

export default Inventory;
