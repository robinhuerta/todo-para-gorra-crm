
import React, { useState, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Package,
  Truck,
  Settings,
  ClipboardList,
  AlertCircle,
  Tag,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  ChevronLeft,
  ImagePlus,
  Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '../hooks/useFirestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/* ─── Types ──────────────────────────────────────────────────── */
interface Product {
  id: string;
  name: string;
  category: 'machinery' | 'parts' | 'supplies' | 'caps';
  brand?: string;
  price: number;
  stock: number;
  description?: string;
  unit?: string;
  status?: string;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderRecord {
  id: string;
  items: { name: string; price: number; quantity: number; unit: string }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  clientName: string;
  date: string;
  status: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'all',       label: 'Todos',      icon: Package,  color: '#6B7C93' },
  { id: 'machinery', label: 'Maquinaria', icon: Truck,    color: '#f59e0b' },
  { id: 'parts',     label: 'Repuestos',  icon: Settings, color: '#0ea5e9' },
  { id: 'supplies',  label: 'Insumos',    icon: Tag,      color: '#10b981' },
  { id: 'caps',      label: 'Gorras',     icon: Package,  color: '#0072CC' },
] as const;

const PAYMENT_METHODS = [
  { id: 'cash',     label: 'Efectivo',      icon: Banknote },
  { id: 'card',     label: 'Tarjeta',       icon: CreditCard },
  { id: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
];

const TAX_RATE = 0.18;

const EMPTY_FORM = { name: '', category: 'machinery' as Product['category'], brand: '', price: 0, stock: 0, description: '', unit: 'unidad' };

/* ─── Helpers ────────────────────────────────────────────────── */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-primary))' }}>{label}</label>
    {children}
  </div>
);

const Overlay: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <div
    style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    onClick={onClick}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

const modalBox: React.CSSProperties = {
  background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))',
  borderRadius: 10, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

/* ═══════════════════════════════════════════════════════════════ */
const Store: React.FC = () => {
  /* data */
  const { data: products, loading, add: addProduct, update: updateProduct, remove: removeProduct } = useFirestore<Product>('inventory');
  const { data: orders, add: addOrder } = useFirestore<OrderRecord>('orders');

  /* ui state */
  const [view, setView]           = useState<'store' | 'orders'>('store');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [search, setSearch]       = useState('');
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState('cash');
  const [clientName, setClientName] = useState('');
  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [successOpen, setSuccessOpen]     = useState(false);
  const [productModal, setProductModal]   = useState(false);
  const [editProduct, setEditProduct]     = useState<Product | null>(null);
  const [formData, setFormData]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState('');
  const [confirming, setConfirming]       = useState(false);
  const [imgFile, setImgFile]             = useState<File | null>(null);
  const [imgPreview, setImgPreview]       = useState('');
  const [imgProgress, setImgProgress]     = useState(0);
  const imgInputRef = useRef<HTMLInputElement>(null);

  /* cart calculations */
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const tax      = subtotal * TAX_RATE;
  const total    = subtotal + tax;
  const cartQty  = cart.reduce((s, i) => s + i.quantity, 0);

  /* filtered products — only show items with stock available */
  const filtered = products.filter(p =>
    p.stock > 0 &&
    (catFilter === 'all' || p.category === catFilter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (p.brand ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  /* ── cart actions ── */
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  /* ── confirm sale ── */
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    setConfirming(true);
    try {
      await addOrder({
        items:         cart.map(i => ({ name: i.product.name, price: i.product.price, quantity: i.quantity, unit: i.product.unit })),
        subtotal,
        tax,
        total,
        paymentMethod: payMethod,
        clientName:    clientName || 'Cliente General',
        date:          new Date().toISOString().split('T')[0],
        status:        'Completado',
      } as Omit<OrderRecord, 'id'>);
      setCart([]);
      setClientName('');
      setPayMethod('cash');
      setConfirmOpen(false);
      setSuccessOpen(true);
    } catch {
      /* handle silently */
    } finally {
      setConfirming(false);
    }
  };

  /* ── product form ── */
  const resetImg = () => { setImgFile(null); setImgPreview(''); setImgProgress(0); };

  const openAddProduct = () => {
    setEditProduct(null); setFormData({ ...EMPTY_FORM }); setFormError('');
    resetImg(); setProductModal(true);
  };
  const openEditProduct = (p: Product) => {
    setEditProduct(p);
    setFormData({ name: p.name, category: p.category, brand: p.brand || '', price: p.price, stock: p.stock, description: p.description || '', unit: p.unit || 'unidad' });
    setFormError(''); resetImg(); setImgPreview(p.imageUrl || ''); setProductModal(true);
  };

  const handleImgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFormError('La imagen no debe superar 5 MB.'); return; }
    setImgFile(file); setImgPreview(URL.createObjectURL(file)); setFormError('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (formData.price <= 0)   { setFormError('El precio debe ser mayor a 0.'); return; }
    setSaving(true); setFormError('');
    try {
      let imageUrl = editProduct?.imageUrl || '';
      if (imgFile) {
        const path = `inventory/${Date.now()}_${imgFile.name.replace(/\s/g, '_')}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, imgFile);
        imageUrl = await new Promise<string>((resolve, reject) => {
          task.on('state_changed',
            snap => setImgProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
            reject,
            async () => resolve(await getDownloadURL(task.snapshot.ref))
          );
        });
      }
      const payload = { ...formData, imageUrl };
      if (editProduct) await updateProduct(editProduct.id, payload);
      else             await addProduct(payload);
      setProductModal(false); resetImg();
    } catch { setFormError('Error al guardar. Intenta de nuevo.'); }
    finally  { setSaving(false); setImgProgress(0); }
  };

  const setF = (k: keyof typeof EMPTY_FORM, v: string | number) => setFormData(f => ({ ...f, [k]: v }));

  /* ── category color ── */
  const catColor = (cat: string) => CATEGORIES.find(c => c.id === cat)?.color ?? '#6B7C93';
  const catLabel = (cat: string) => CATEGORIES.find(c => c.id === cat)?.label ?? cat;

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Tienda GORRA</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Venta de máquinas, repuestos e insumos para la confección de gorras.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid hsl(var(--border))', borderRadius: 6, overflow: 'hidden', background: 'hsl(var(--bg-main))' }}>
            {[{ id: 'store', label: 'Tienda', icon: ShoppingCart }, { id: 'orders', label: 'Pedidos', icon: ClipboardList }].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as any)}
                style={{ padding: '7px 14px', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: view === v.id ? '#0072CC' : 'transparent',
                  color:      view === v.id ? '#fff'    : 'hsl(var(--text-secondary))',
                }}
              >
                <v.icon size={14} /> {v.label}
                {v.id === 'orders' && orders.length > 0 && (
                  <span style={{ background: view === v.id ? 'rgba(255,255,255,0.25)' : '#0072CC', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                    {orders.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button onClick={openAddProduct} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Plus size={14} /> Agregar Producto
          </button>
        </div>
      </div>

      {/* ── STORE VIEW ──────────────────────────────────────── */}
      {view === 'store' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

          {/* Left: catalog */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Search + categories */}
            <div className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
                <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, height: 32, width: '100%', fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setCatFilter(cat.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: '1px solid', transition: 'all 0.12s',
                      borderColor: catFilter === cat.id ? cat.color     : 'hsl(var(--border))',
                      background:  catFilter === cat.id ? `${cat.color}14` : 'transparent',
                      color:       catFilter === cat.id ? cat.color     : 'hsl(var(--text-secondary))',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            {loading ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'hsl(var(--text-secondary))', fontSize: 13 }}>Cargando productos...</p>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <Package size={36} style={{ color: 'hsl(var(--border))', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-secondary))' }}>No hay productos en esta categoría.</p>
                <button className="btn-primary" onClick={openAddProduct} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <Plus size={14} /> Agregar producto
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {filtered.map(product => {
                  const inCart = cart.find(i => i.product.id === product.id);
                  const color  = catColor(product.category);
                  return (
                    <motion.div key={product.id} whileHover={{ y: -2 }} className="card" style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Category badge + actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: `${color}14`, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {catLabel(product.category)}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEditProduct(product)} style={{ padding: 4, background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', fontSize: 12 }} title="Editar">✏️</button>
                          <button onClick={() => removeProduct(product.id)} style={{ padding: 4, background: 'transparent', border: 'none', color: '#E11D48', cursor: 'pointer', fontSize: 12 }} title="Eliminar">🗑</button>
                        </div>
                      </div>

                      {/* Image or icon */}
                      <div style={{ width: '100%', height: 110, borderRadius: 8, overflow: 'hidden', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          product.category === 'machinery' ? <Truck size={28} />    :
                          product.category === 'parts'     ? <Settings size={28} /> :
                          <Tag size={28} />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))', lineHeight: 1.3 }}>{product.name}</h4>
                        {product.brand && <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{product.brand}</p>}
                        {product.description && <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 3, lineHeight: 1.4 }}>{product.description}</p>}
                      </div>

                      {/* Price + stock */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                          S/ {product.price.toFixed(2)}
                        </span>
                        <span style={{ fontSize: 11, color: product.stock < 5 ? '#E11D48' : 'hsl(var(--text-secondary))' }}>
                          {product.stock} {product.unit ?? 'unid'}
                        </span>
                      </div>

                      {/* Add to cart */}
                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'hsl(var(--bg-main))', borderRadius: 6, padding: '4px 8px', border: '1px solid hsl(var(--border))' }}>
                          <button onClick={() => updateQty(product.id, -1)} style={{ padding: '3px 6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#0072CC', display: 'flex' }}><Minus size={14} /></button>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{inCart.quantity}</span>
                          <button onClick={() => updateQty(product.id, +1)} style={{ padding: '3px 6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#0072CC', display: 'flex' }}><Plus size={14} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className="btn-primary"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, opacity: product.stock === 0 ? 0.4 : 1 }}
                        >
                          <ShoppingCart size={13} />
                          {product.stock === 0 ? 'Sin stock' : 'Agregar'}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: cart */}
          <div className="card" style={{ position: 'sticky', top: 16 }}>
            {/* Cart header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={16} style={{ color: '#0072CC' }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Carrito</span>
                {cartQty > 0 && (
                  <span style={{ background: '#0072CC', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{cartQty}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{ fontSize: 11, color: '#E11D48', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                  Vaciar
                </button>
              )}
            </div>

            {/* Cart items */}
            <div style={{ padding: '10px 14px', minHeight: 120, maxHeight: 280, overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'hsl(var(--text-secondary))' }}>
                  <ShoppingCart size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: 12 }}>Agrega productos al carrito</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {cart.map(item => (
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{   opacity: 0, height: 0 }}
                        style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 6, background: 'hsl(var(--bg-main))' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>S/ {item.product.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-card))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0072CC' }}><Minus size={11} /></button>
                          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateQty(item.product.id, +1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-card))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0072CC' }}><Plus size={11} /></button>
                          <button onClick={() => removeFromCart(item.product.id)} style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48', marginLeft: 2 }}><Trash2 size={12} /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Totals + checkout */}
            {cart.length > 0 && (
              <>
                {/* Totals */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Subtotal', value: subtotal },
                    { label: 'IGV (18%)', value: tax },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
                      <span>{row.label}</span>
                      <span>S/ {row.value.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-primary))', paddingTop: 6, borderTop: '1px solid hsl(var(--border))' }}>
                    <span>Total</span>
                    <span style={{ color: '#0072CC' }}>S/ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Client */}
                <div style={{ padding: '0 16px 10px' }}>
                  <input
                    type="text"
                    placeholder="Cliente (opcional)"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    style={{ width: '100%', height: 34, fontSize: 13 }}
                  />
                </div>

                {/* Payment method */}
                <div style={{ padding: '0 16px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-secondary))', marginBottom: 8 }}>Método de pago</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          border: '1px solid',
                          borderColor: payMethod === m.id ? '#0072CC' : 'hsl(var(--border))',
                          background:  payMethod === m.id ? '#EBF5FF'  : 'transparent',
                          color:       payMethod === m.id ? '#0072CC'  : 'hsl(var(--text-secondary))',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        }}
                      >
                        <m.icon size={14} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirm button */}
                <div style={{ padding: '0 16px 16px' }}>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600, padding: '10px 0' }}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <CheckCircle2 size={16} /> Confirmar Venta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ORDERS VIEW ─────────────────────────────────────── */}
      {view === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setView('store')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#0072CC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              <ChevronLeft size={15} /> Volver a Tienda
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Pedidos',   value: orders.length },
              { label: 'Ingresos Totales', value: `S/ ${orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}` },
              { label: 'Completados',     value: orders.filter(o => o.status === 'Completado').length },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '14px 18px' }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', fontWeight: 500, marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Orders table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'hsl(var(--bg-main))', borderBottom: '1px solid hsl(var(--border))', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>N° Pedido</th>
                    <th style={{ padding: '10px 16px' }}>Cliente</th>
                    <th style={{ padding: '10px 16px' }}>Fecha</th>
                    <th style={{ padding: '10px 16px' }}>Items</th>
                    <th style={{ padding: '10px 16px' }}>Total</th>
                    <th style={{ padding: '10px 16px' }}>Pago</th>
                    <th style={{ padding: '10px 16px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: 13 }}>No hay pedidos aún.</td></tr>
                  ) : [...orders].reverse().map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid hsl(var(--border))', fontSize: 13 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0072CC', fontFamily: 'monospace' }}>{order.id}</td>
                      <td style={{ padding: '11px 16px', fontWeight: 500 }}>{order.clientName}</td>
                      <td style={{ padding: '11px 16px', color: 'hsl(var(--text-secondary))' }}>{order.date}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'hsl(var(--bg-main))', color: 'hsl(var(--text-secondary))' }}>
                          {order.items?.length || 0} items
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 700, fontSize: 14 }}>S/ {(order.total || 0).toFixed(2)}</td>
                      <td style={{ padding: '11px 16px', color: 'hsl(var(--text-secondary))' }}>
                        {PAYMENT_METHODS.find(m => m.id === order.paymentMethod)?.label ?? order.paymentMethod}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM SALE MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {confirmOpen && (
          <Overlay onClick={() => setConfirmOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} style={{ ...modalBox, maxWidth: 420 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Confirmar Venta</h3>
                <button onClick={() => setConfirmOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex' }}><X size={18} /></button>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Summary */}
                <div style={{ background: 'hsl(var(--bg-main))', borderRadius: 6, padding: '12px 14px' }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{item.product.name} × {item.quantity}</span>
                      <span style={{ fontWeight: 600 }}>S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                    <span>Total</span>
                    <span style={{ color: '#0072CC' }}>S/ {total.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
                  <span>Cliente</span><span style={{ fontWeight: 500 }}>{clientName || 'Cliente General'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
                  <span>Método de pago</span>
                  <span style={{ fontWeight: 500 }}>{PAYMENT_METHODS.find(m => m.id === payMethod)?.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn-outline" style={{ flex: 1 }} onClick={() => setConfirmOpen(false)}>Cancelar</button>
                  <button
                    className="btn-primary"
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 600 }}
                    onClick={handleConfirmSale}
                    disabled={confirming}
                  >
                    {confirming ? 'Procesando...' : <><CheckCircle2 size={15} /> Confirmar y Registrar</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── SUCCESS MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {successOpen && (
          <Overlay onClick={() => setSuccessOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ ...modalBox, maxWidth: 360, textAlign: 'center' }}>
              <div style={{ padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={28} style={{ color: '#059669' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>¡Venta Registrada!</h3>
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                  La venta fue guardada correctamente. Puedes verla en el historial de Pedidos.
                </p>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button className="btn-outline" style={{ flex: 1 }} onClick={() => setSuccessOpen(false)}>Nueva Venta</button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => { setSuccessOpen(false); setView('orders'); }}>Ver Pedidos</button>
                </div>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── ADD / EDIT PRODUCT MODAL ─────────────────────────── */}
      <AnimatePresence>
        {productModal && (
          <Overlay onClick={() => setProductModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} style={modalBox}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex' }}><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveProduct} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Nombre del producto *">
                      <input type="text" placeholder="Ej: Bordadora XL-500" value={formData.name} onChange={e => setF('name', e.target.value)} style={{ height: 36 }} />
                    </Field>
                  </div>
                  <Field label="Categoría">
                    <select value={formData.category} onChange={e => setF('category', e.target.value)} style={{ height: 36 }}>
                      <option value="machinery">Maquinaria</option>
                      <option value="parts">Repuestos</option>
                      <option value="supplies">Insumos</option>
                      <option value="caps">Gorras Imp.</option>
                    </select>
                  </Field>
                  <Field label="Unidad">
                    <select value={formData.unit} onChange={e => setF('unit', e.target.value)} style={{ height: 36 }}>
                      {['unidad', 'par', 'metro', 'rollo', 'caja', 'kit', 'bolsa'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                  <Field label="Precio (S/) *">
                    <input type="number" min={0} step="0.01" placeholder="0.00" value={formData.price || ''} onChange={e => setF('price', parseFloat(e.target.value) || 0)} style={{ height: 36 }} />
                  </Field>
                  <Field label="Stock inicial">
                    <input type="number" min={0} placeholder="0" value={formData.stock || ''} onChange={e => setF('stock', parseInt(e.target.value) || 0)} style={{ height: 36 }} />
                  </Field>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Descripción (opcional)">
                      <textarea rows={2} placeholder="Breve descripción del producto..." value={formData.description} onChange={e => setF('description', e.target.value)} style={{ resize: 'vertical', padding: '6px 10px', fontSize: 13 }} />
                    </Field>
                  </div>

                  {/* Image upload */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Foto del producto">
                      <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImgSelect} style={{ display: 'none' }} />
                      {imgPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img src={imgPreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid hsl(var(--border))', display: 'block' }} />
                          <button type="button" onClick={() => { setImgPreview(''); setImgFile(null); if (imgInputRef.current) imgInputRef.current.value = ''; }}
                            style={{ position: 'absolute', top: 7, right: 7, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} />
                          </button>
                          <button type="button" onClick={() => imgInputRef.current?.click()}
                            style={{ position: 'absolute', bottom: 7, right: 7, padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Camera size={11} /> Cambiar
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => imgInputRef.current?.click()}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '20px 16px', width: '100%', border: '2px dashed hsl(var(--border))', borderRadius: 8, background: 'hsl(var(--bg-main))', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0072CC'; (e.currentTarget as HTMLElement).style.color = '#0072CC'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; (e.currentTarget as HTMLElement).style.color = 'hsl(var(--text-secondary))'; }}>
                          <ImagePlus size={20} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>Subir foto del producto</span>
                          <span style={{ fontSize: 11 }}>JPG, PNG o WEBP · máx 5 MB</span>
                        </button>
                      )}
                      {saving && imgFile && imgProgress > 0 && imgProgress < 100 && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--text-secondary))', marginBottom: 3 }}>
                            <span>Subiendo...</span><span>{imgProgress}%</span>
                          </div>
                          <div style={{ height: 4, background: 'hsl(var(--border))', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${imgProgress}%`, background: '#0072CC', borderRadius: 2, transition: 'width 0.2s' }} />
                          </div>
                        </div>
                      )}
                    </Field>
                  </div>
                </div>

                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontSize: 13 }}>
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid hsl(var(--border))', marginTop: 4 }}>
                  <button type="button" className="btn-outline" onClick={() => setProductModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 120 }}>
                    {saving ? 'Guardando...' : editProduct ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Store;
