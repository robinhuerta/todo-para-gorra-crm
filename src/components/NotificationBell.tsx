
import React, { useRef, useEffect, useState } from 'react';
import { Bell, Package, FileText, Users, ShoppingCart, X, CheckCheck, Ship } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryItem { id: string; name: string; stock: number; category: string; }
interface Proforma      { id: string; clientName?: string; client?: string; status: string; createdAt?: { seconds: number }; }
interface Client        { id: string; name: string; createdAt?: { seconds: number }; }
interface Order         { id: string; clientName?: string; total?: number; createdAt?: { seconds: number }; status?: string; }
interface ImportRow     { id: string; displayId: string; clientName: string; status: string; currentPhaseIndex: number; estimatedArrival?: string; phases?: { phaseIndex: number; startDate?: string }[]; updatedAt?: string; }

interface Notification {
  id:       string;
  type:     'warning' | 'info' | 'success';
  category: 'stock' | 'proforma' | 'client' | 'order' | 'import';
  title:    string;
  body:     string;
  time?:    number;
}

const LOW_STOCK_THRESHOLD = 5;

const TYPE_COLORS = {
  warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '#D97706', text: '#92400E' },
  info:    { bg: 'hsl(207 89% 95%)', border: 'hsl(207 89% 80%)', icon: 'hsl(207 89% 40%)', text: 'hsl(207 89% 30%)' },
  success: { bg: '#ECFDF5', border: '#6EE7B7', icon: '#059669', text: '#064E3B' },
};

const CATEGORY_ICONS: Record<Notification['category'], React.FC<{ size?: number; color?: string }>> = {
  stock:    Package,
  proforma: FileText,
  client:   Users,
  order:    ShoppingCart,
  import:   Ship,
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Hace un momento';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

const NotificationBell: React.FC = () => {
  const [open,      setOpen]      = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('crm-dismissed-notifs') ?? '[]')); }
    catch { return new Set(); }
  });
  const ref = useRef<HTMLDivElement>(null);

  const { data: inventory } = useFirestore<InventoryItem>('inventory');
  const { data: proformas  } = useFirestore<Proforma>('proformas');
  const { data: clients    } = useFirestore<Client>('clients');
  const { data: orders     } = useFirestore<Order>('orders');
  const { data: imports    } = useFirestore<ImportRow>('imports');

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Persist dismissals
  useEffect(() => {
    localStorage.setItem('crm-dismissed-notifs', JSON.stringify([...dismissed]));
  }, [dismissed]);

  // Build notifications list
  const notifications: Notification[] = [];

  // 1. Low stock items
  inventory
    .filter(item => Number(item.stock) <= LOW_STOCK_THRESHOLD)
    .forEach(item => {
      notifications.push({
        id:       `stock-${item.id}`,
        type:     Number(item.stock) === 0 ? 'warning' : 'warning',
        category: 'stock',
        title:    Number(item.stock) === 0 ? 'Sin stock' : 'Stock bajo',
        body:     `${item.name} — ${Number(item.stock) === 0 ? 'agotado' : `solo ${item.stock} unidades`}`,
      });
    });

  // 2. Pending proformas
  const pending = proformas.filter(p => p.status === 'Pendiente');
  if (pending.length > 0) {
    notifications.push({
      id:       'proformas-pending',
      type:     'info',
      category: 'proforma',
      title:    `${pending.length} proforma${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''}`,
      body:     `Requieren atención: ${pending.slice(0, 2).map(p => p.clientName ?? p.client ?? 'Sin nombre').join(', ')}${pending.length > 2 ? ` y ${pending.length - 2} más` : ''}`,
    });
  }

  // 3. New clients (last 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newClients = clients.filter(c => c.createdAt && c.createdAt.seconds * 1000 > oneWeekAgo);
  if (newClients.length > 0) {
    notifications.push({
      id:       'new-clients',
      type:     'success',
      category: 'client',
      title:    `${newClients.length} cliente${newClients.length > 1 ? 's' : ''} nuevo${newClients.length > 1 ? 's' : ''}`,
      body:     `Esta semana: ${newClients.slice(0, 2).map(c => c.name).join(', ')}${newClients.length > 2 ? ` y ${newClients.length - 2} más` : ''}`,
      time:     Math.max(...newClients.map(c => (c.createdAt?.seconds ?? 0) * 1000)),
    });
  }

  // 4. Recent orders (last 24h)
  const oneDayAgo    = Date.now() - 24 * 60 * 60 * 1000;
  const recentOrders = orders.filter(o => o.createdAt && o.createdAt.seconds * 1000 > oneDayAgo);
  if (recentOrders.length > 0) {
    const total = recentOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    notifications.push({
      id:       'recent-orders',
      type:     'success',
      category: 'order',
      title:    `${recentOrders.length} venta${recentOrders.length > 1 ? 's' : ''} hoy`,
      body:     `Total: S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      time:     Math.max(...recentOrders.map(o => (o.createdAt?.seconds ?? 0) * 1000)),
    });
  }

  // Accepted proformas in last 48h
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  const accepted   = proformas.filter(p => p.status === 'Aceptada' && p.createdAt && p.createdAt.seconds * 1000 > twoDaysAgo);
  if (accepted.length > 0) {
    notifications.push({
      id:       'accepted-proformas',
      type:     'success',
      category: 'proforma',
      title:    `${accepted.length} proforma${accepted.length > 1 ? 's' : ''} aceptada${accepted.length > 1 ? 's' : ''}`,
      body:     `Clientes: ${accepted.slice(0, 2).map(p => p.clientName ?? p.client ?? '—').join(', ')}${accepted.length > 2 ? ` y ${accepted.length - 2} más` : ''}`,
      time:     Math.max(...accepted.map(p => (p.createdAt?.seconds ?? 0) * 1000)),
    });
  }

  // 5. Importaciones con problema
  const impProblema = imports.filter(i => i.status === 'con_problema');
  if (impProblema.length > 0) {
    notifications.push({
      id:       'imp-problema',
      type:     'warning',
      category: 'import',
      title:    `${impProblema.length} importación(es) con problema`,
      body:     impProblema.slice(0, 2).map(i => `${i.displayId} — ${i.clientName}`).join(', '),
    });
  }

  // 6. ETA vencida (llegada estimada ya pasó y aún no está en Callao)
  const today = new Date().toISOString().slice(0, 10);
  const etaVencidas = imports.filter(i =>
    i.status === 'activo' && i.estimatedArrival && i.estimatedArrival < today && i.currentPhaseIndex < 6
  );
  if (etaVencidas.length > 0) {
    notifications.push({
      id:       'imp-eta-vencida',
      type:     'warning',
      category: 'import',
      title:    `${etaVencidas.length} importación(es) con ETA vencida`,
      body:     `${etaVencidas.slice(0, 2).map(i => i.displayId).join(', ')} — fecha de arribo ya pasó`,
    });
  }

  // 7. En aduana SUNAT hace más de 7 días
  const impEnAduana = imports.filter(i => {
    if (i.currentPhaseIndex !== 7 || i.status !== 'activo') return false;
    const phase7 = (i.phases ?? []).find(p => p.phaseIndex === 7);
    if (!phase7?.startDate) return false;
    const diffDays = (Date.now() - new Date(phase7.startDate).getTime()) / 86400000;
    return diffDays > 7;
  });
  if (impEnAduana.length > 0) {
    notifications.push({
      id:       'imp-aduana-lenta',
      type:     'warning',
      category: 'import',
      title:    `${impEnAduana.length} importación(es) en aduana +7 días`,
      body:     `${impEnAduana.slice(0, 2).map(i => i.displayId).join(', ')} — revisar estado con Agente de Aduanas`,
    });
  }

  // 8. Importaciones entregadas recientemente (últimas 48h)
  const twoDaysAgoMs = Date.now() - 48 * 60 * 60 * 1000;
  const impEntregadas = imports.filter(i =>
    i.status === 'completado' && i.updatedAt && new Date(i.updatedAt).getTime() > twoDaysAgoMs
  );
  if (impEntregadas.length > 0) {
    notifications.push({
      id:       'imp-entregadas',
      type:     'success',
      category: 'import',
      title:    `${impEntregadas.length} importación(es) entregada${impEntregadas.length > 1 ? 's' : ''}`,
      body:     impEntregadas.slice(0, 2).map(i => `${i.displayId} — ${i.clientName}`).join(', '),
      time:     Math.max(...impEntregadas.map(i => new Date(i.updatedAt!).getTime())),
    });
  }

  const visible = notifications.filter(n => !dismissed.has(n.id));
  const count   = visible.length;

  const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(notifications.map(n => n.id)));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', padding: 6,
          background: open ? 'hsl(var(--accent))' : 'transparent',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius-sm)',
          color: open ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        title="Notificaciones"
      >
        <Bell size={15} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 99,
            background: count > 0 ? '#E11D48' : 'hsl(var(--primary))',
            color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '2px solid hsl(var(--bg-card))',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 340, zIndex: 200,
              background: 'hsl(var(--bg-card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                  Notificaciones
                </span>
                {count > 0 && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, padding: '1px 7px', borderRadius: 99,
                    background: '#FEE2E2', color: '#DC2626', fontWeight: 600,
                  }}>
                    {count} nueva{count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {count > 0 && (
                <button
                  onClick={dismissAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: 'hsl(var(--text-secondary))',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 6px', borderRadius: 4,
                  }}
                  title="Marcar todo como leído"
                >
                  <CheckCheck size={13} />
                  Leer todo
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }} className="custom-scrollbar">
              {visible.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: 'center',
                  color: 'hsl(var(--text-secondary))',
                }}>
                  <Bell size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
                  <p style={{ fontSize: 13, margin: 0 }}>Sin notificaciones pendientes</p>
                </div>
              ) : (
                visible.map((n, i) => {
                  const colors = TYPE_COLORS[n.type];
                  const Icon   = CATEGORY_ICONS[n.category];
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 16px',
                        borderBottom: i < visible.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                        background: 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-main))')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={15} color={colors.icon} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600,
                          color: 'hsl(var(--text-primary))', margin: '0 0 2px',
                        }}>
                          {n.title}
                        </p>
                        <p style={{
                          fontSize: 12, color: 'hsl(var(--text-secondary))',
                          margin: 0, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.body}
                        </p>
                        {n.time && (
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', margin: '3px 0 0', opacity: 0.7 }}>
                            {timeAgo(n.time)}
                          </p>
                        )}
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => dismiss(n.id)}
                        style={{
                          padding: 3, background: 'transparent', border: 'none',
                          color: 'hsl(var(--text-secondary))', cursor: 'pointer',
                          borderRadius: 4, flexShrink: 0, opacity: 0.5,
                        }}
                        title="Descartar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer — show dismissed count if any */}
            {dismissed.size > 0 && (
              <div style={{
                padding: '8px 16px',
                borderTop: '1px solid hsl(var(--border))',
                display: 'flex', justifyContent: 'center',
              }}>
                <button
                  onClick={() => setDismissed(new Set())}
                  style={{
                    fontSize: 11, color: 'hsl(var(--text-secondary))',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}
                >
                  Restaurar {dismissed.size} descartada{dismissed.size > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
