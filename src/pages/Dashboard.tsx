
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  TrendingUp,
  Users,
  Package,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoreVertical,
  Activity,
  Clock,
  CheckCircle2,
  Calendar,
  ShoppingCart,
  AlertTriangle,
  Ship,
  Building2,
  Anchor,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFirestore } from '../hooks/useFirestore';

/* ─── helpers ──────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 1000 ? `S/ ${(n / 1000).toFixed(1)}k` : `S/ ${n.toFixed(2)}`;

const thisMonth = new Date().toISOString().slice(0, 7); // "2025-03"

/* ─── skeleton card ─────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="card" style={{ padding: '20px 22px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'hsl(var(--border))', animation: 'pulse 1.5s infinite' }} />
      <div style={{ width: 56, height: 22, borderRadius: 10, background: 'hsl(var(--border))', animation: 'pulse 1.5s infinite' }} />
    </div>
    <div style={{ width: '60%', height: 11, borderRadius: 4, background: 'hsl(var(--border))', marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
    <div style={{ width: '40%', height: 26, borderRadius: 4, background: 'hsl(var(--border))', animation: 'pulse 1.5s infinite' }} />
  </div>
);

/* ═══════════════════════════════════════════════════════════ */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowNewMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* live Firestore data */
  const { data: clients,   loading: lClients   } = useFirestore('clients');
  const { data: inventory, loading: lInventory  } = useFirestore('inventory');
  const { data: proformas, loading: lProformas  } = useFirestore('proformas');
  const { data: orders,    loading: lOrders     } = useFirestore('orders');
  const { data: imports,   loading: lImports    } = useFirestore('imports');

  const loading = lClients || lInventory || lProformas || lOrders || lImports;

  /* ── computed KPIs ── */
  const kpis = useMemo(() => {
    // Ventas totales (órdenes completadas)
    const ventasTotal  = orders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    const ventasMes    = orders.filter((o: any) => (o.date || '').startsWith(thisMonth))
                               .reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    const ventasPrev   = ventasTotal - ventasMes;
    const ventasDelta  = ventasPrev > 0 ? ((ventasMes - ventasPrev) / ventasPrev * 100) : 0;

    // Clientes
    const totalClients = clients.length;
    const newClients   = clients.filter((c: any) => (c.createdAt?.toDate?.()?.toISOString() || '').startsWith(thisMonth)).length;

    // Stock de maquinaria
    const machineryStock = inventory
      .filter((i: any) => i.category === 'machinery')
      .reduce((s: number, i: any) => s + (Number(i.stock) || 0), 0);
    const lowStock = inventory.filter((i: any) => Number(i.stock) < 5).length;

    // Proformas del mes
    const pfMes    = proformas.filter((p: any) => (p.date || '').startsWith(thisMonth)).length;
    const pfAcept  = proformas.filter((p: any) => p.status === 'Aceptada').length;
    const pfTotal  = proformas.length;
    const convRate = pfTotal > 0 ? Math.round((pfAcept / pfTotal) * 100) : 0;

    // Importaciones
    const impActivas    = imports.filter((i: any) => i.status === 'activo').length;
    const impTransito   = imports.filter((i: any) => i.currentPhaseIndex === 5 && i.status === 'activo').length;
    const impAduana     = imports.filter((i: any) => i.currentPhaseIndex === 7 && i.status === 'activo').length;
    const impProblema   = imports.filter((i: any) => i.status === 'con_problema').length;
    const impFOBTotal   = imports.reduce((s: number, i: any) => s + (Number(i.fobValue) || 0), 0);
    const impEntregadas = imports.filter((i: any) => {
      if (i.status !== 'completado') return false;
      const d = new Date(i.updatedAt);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length;

    return { ventasTotal, ventasMes, ventasDelta, totalClients, newClients, machineryStock, lowStock, pfMes, pfAcept, pfTotal, convRate, impActivas, impTransito, impAduana, impProblema, impFOBTotal, impEntregadas };
  }, [clients, inventory, proformas, orders, imports]);

  /* ── funnel data from proformas ── */
  const funnel = useMemo(() => {
    const steps = ['Pendiente', 'Enviada', 'Aceptada', 'Vencida'];
    return steps.map(s => ({
      step:  s,
      count: proformas.filter((p: any) => p.status === s).length,
    }));
  }, [proformas]);

  /* ── activity feed from real data ── */
  const activity = useMemo(() => {
    const events: { label: string; sub: string; time: string; type: string }[] = [];

    // últimas 3 proformas
    proformas.slice(-3).reverse().forEach((p: any) => {
      events.push({ label: p.client || 'Cliente', sub: `Proforma ${p.id} — ${p.status}`, time: p.date || '', type: 'doc' });
    });
    // últimas 2 órdenes
    orders.slice(-2).reverse().forEach((o: any) => {
      events.push({ label: o.clientName || 'Cliente General', sub: `Venta S/ ${(Number(o.total) || 0).toFixed(2)}`, time: o.date || '', type: 'success' });
    });
    // últimas 2 importaciones
    imports.slice(-2).reverse().forEach((i: any) => {
      const phaseNames = ['Solicitud','Orden de Compra','Producción','Inspección','Exportación China','En Tránsito','Puerto Callao','Despacho SUNAT','En Almacén','Listo Entrega','Entregado'];
      events.push({ label: i.clientName || 'Cliente', sub: `Importación ${i.displayId} — ${phaseNames[i.currentPhaseIndex] ?? ''}`, time: i.createdAt ? new Date(i.createdAt).toLocaleDateString('es-PE') : '', type: 'import' });
    });
    // últimos 2 clientes
    clients.slice(-2).reverse().forEach((c: any) => {
      events.push({ label: c.name || 'Nuevo cliente', sub: `Registrado — ${c.company || ''}`, time: '', type: 'client' });
    });

    return events.slice(0, 7);
  }, [proformas, orders, clients, imports]);

  /* ── meta goal: ventas mes vs target (S/10k default) ── */
  const metaTarget = 10000;
  const metaPct    = Math.min(100, Math.round((kpis.ventasMes / metaTarget) * 100));

  /* ── funnel max para barras ── */
  const funnelMax = Math.max(...funnel.map(f => f.count), 1);

  const exportReport = () => {
    const doc = new jsPDF();
    const W = 210;
    const now = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('TODO PARA GORRA', 15, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Business Performance', 15, 21);
    doc.text(`Generado: ${now}`, 15, 27);

    // KPI section
    let y = 46;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMEN GENERAL', 15, y);
    y += 8;

    const kpiRows = [
      ['Ventas Totales',          fmt(kpis.ventasTotal)],
      ['Ventas Este Mes',         fmt(kpis.ventasMes)],
      ['Clientes Registrados',    kpis.totalClients.toString()],
      ['Nuevos Clientes (mes)',   kpis.newClients.toString()],
      ['Proformas Este Mes',      kpis.pfMes.toString()],
      ['Proformas Aceptadas',     `${kpis.pfAcept} (${kpis.convRate}%)`],
      ['Stock Maquinaria',        `${kpis.machineryStock} unidades`],
      ['Productos Stock Bajo',    kpis.lowStock.toString()],
      ['Importaciones Activas',   kpis.impActivas.toString()],
      ['Importaciones En Tránsito', kpis.impTransito.toString()],
      ['Importaciones En Aduana', kpis.impAduana.toString()],
      ['Importaciones Con Problema', kpis.impProblema.toString()],
      ['Valor FOB Total Imports', `$ ${kpis.impFOBTotal.toFixed(2)}`],
      ['Entregadas Este Mes',     kpis.impEntregadas.toString()],
    ];

    kpiRows.forEach(([label, value], i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y, 180, 8, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 18, y + 5.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(value, 190, y + 5.5, { align: 'right' });
      y += 8;
    });

    // Funnel
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('EMBUDO DE PROFORMAS', 15, y);
    y += 8;
    funnel.forEach(({ step, count }, i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y, 180, 8, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(step, 18, y + 5.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(count.toString(), 190, y + 5.5, { align: 'right' });
      y += 8;
    });

    // Footer
    doc.setFillColor(226, 232, 240);
    doc.rect(0, 283, W, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`TODO PARA GORRA  ·  Lima, Perú  ·  ${now}`, W / 2, 289, { align: 'center' });

    doc.save(`Reporte_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const statCards = [
    {
      label: 'Ventas Totales',
      value: fmt(kpis.ventasTotal),
      sub:   `Este mes: ${fmt(kpis.ventasMes)}`,
      delta: kpis.ventasDelta,
      icon:  TrendingUp,
      color: '#0072CC',
    },
    {
      label: 'Clientes Registrados',
      value: kpis.totalClients.toString(),
      sub:   `${kpis.newClients} nuevos este mes`,
      delta: kpis.newClients > 0 ? kpis.newClients * 10 : 0,
      icon:  Users,
      color: '#0ea5e9',
    },
    {
      label: 'Stock Maquinaria',
      value: `${kpis.machineryStock} Unid.`,
      sub:   kpis.lowStock > 0 ? `${kpis.lowStock} con stock bajo` : 'Stock OK',
      delta: kpis.lowStock > 0 ? -kpis.lowStock * 5 : 5,
      icon:  Package,
      color: '#f59e0b',
    },
    {
      label: 'Proformas del Mes',
      value: kpis.pfMes.toString(),
      sub:   `${kpis.pfAcept} aceptadas (${kpis.convRate}%)`,
      delta: kpis.pfMes > 0 ? kpis.convRate : 0,
      icon:  FileText,
      color: '#10b981',
    },
    {
      label: 'Pedidos Tienda',
      value: orders.length.toString(),
      sub:   `${orders.filter((o: any) => (o.date || '').startsWith(thisMonth)).length} este mes`,
      delta: orders.filter((o: any) => (o.date || '').startsWith(thisMonth)).length > 0 ? 10 : 0,
      icon:  ShoppingCart,
      color: '#8b5cf6',
    },
    {
      label: 'Importaciones Activas',
      value: kpis.impActivas.toString(),
      sub:   kpis.impEntregadas > 0 ? `${kpis.impEntregadas} entregadas este mes` : 'China → Perú en curso',
      delta: kpis.impActivas > 0 ? 8 : 0,
      icon:  Ship,
      color: '#0ea5e9',
    },
  ];

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Business Performance</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Datos en tiempo real — Firestore sincronizado.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportReport} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Exportar Reporte
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowNewMenu(v => !v)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Nueva Operación
            </button>
            {showNewMenu && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 200,
                background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: 200, overflow: 'hidden',
              }}>
                {[
                  { label: 'Nueva Importación', icon: Ship,         path: '/imports',   color: '#0ea5e9' },
                  { label: 'Nueva Proforma',     icon: FileText,     path: '/proformas', color: '#10b981' },
                  { label: 'Nuevo Cliente',      icon: Users,        path: '/clients',   color: '#8b5cf6' },
                  { label: 'Nueva Venta',        icon: ShoppingCart, path: '/store',     color: '#f59e0b' },
                ].map(item => (
                  <button key={item.path} onClick={() => { navigate(item.path); setShowNewMenu(false); }}
                    style={{
                      width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      fontSize: 13, color: 'hsl(var(--text-primary))', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-main))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={14} color={item.color} />
                    </div>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card"
              style={{ padding: '18px 20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${stat.color}18`, color: stat.color }}>
                  <stat.icon size={19} />
                </div>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: stat.delta >= 0 ? '#ECFDF5' : '#FFF1F2',
                  color:      stat.delta >= 0 ? '#059669' : '#E11D48',
                }}>
                  {stat.delta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(Math.round(stat.delta))}%
                </span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                {stat.label}
              </p>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>{stat.value}</h3>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 3 }}>{stat.sub}</p>
            </motion.div>
          ))
        }
      </div>

      {/* Alert: low stock */}
      {!loading && kpis.lowStock > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 8,
            background: '#FFFBEB', border: '1px solid #FDE68A',
            color: '#D97706', fontSize: 13,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span><strong>{kpis.lowStock} producto(s)</strong> con stock bajo (menos de 5 unidades). Revisa el inventario.</span>
        </motion.div>
      )}

      {/* Alert: importaciones con problema */}
      {!loading && kpis.impProblema > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span><strong>{kpis.impProblema} importación(es) con problema.</strong> Revisa el módulo de Importaciones para más detalles.</span>
        </motion.div>
      )}

      {/* Import pipeline mini-widget */}
      {!loading && imports.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E0F2FE', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ship size={17} />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600 }}>Importaciones China → Perú</h4>
                <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Estado actual del pipeline</p>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#DBEAFE', color: '#1E40AF' }}>
              {kpis.impActivas} activa{kpis.impActivas !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'En Producción / Tránsito', value: imports.filter((i: any) => [2,3,4,5].includes(i.currentPhaseIndex) && i.status === 'activo').length, color: '#0EA5E9', Icon: Ship },
              { label: 'Puerto Callao', value: imports.filter((i: any) => i.currentPhaseIndex === 6 && i.status === 'activo').length, color: '#6366F1', Icon: Anchor },
              { label: 'Despacho SUNAT', value: kpis.impAduana, color: '#F97316', Icon: Building2 },
              { label: 'En Almacén / Entrega', value: imports.filter((i: any) => [8,9].includes(i.currentPhaseIndex) && i.status === 'activo').length, color: '#22C55E', Icon: CheckCircle2 },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 8, background: s.color + '0D', border: `1px solid ${s.color}30`, textAlign: 'center' }}>
                <s.Icon size={18} style={{ color: s.color, margin: '0 auto 6px' }} />
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'hsl(var(--text-secondary))', marginTop: 4, lineHeight: 1.3 }}>{s.label}</p>
              </div>
            ))}
          </div>
          {kpis.impFOBTotal > 0 && (
            <div style={{ marginTop: 12, padding: '8px 14px', background: 'hsl(var(--accent))', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Valor total FOB en proceso</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>$ {kpis.impFOBTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Left: funnel + metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Proformas funnel */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E8F3FC', color: '#0072CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={17} />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>Embudo de Proformas</h4>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Estado actual de cotizaciones</p>
                </div>
              </div>
              <button style={{ padding: 5, background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--text-secondary))', display: 'flex' }}>
                <MoreVertical size={15} />
              </button>
            </div>

            {/* Funnel steps */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0 20px' }}>
              {funnel.map((item, i) => {
                const colors: Record<string, string> = { Pendiente: '#D97706', Enviada: '#0072CC', Aceptada: '#059669', Vencida: '#E11D48' };
                const c = colors[item.step] ?? '#6B7C93';
                return (
                  <React.Fragment key={i}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: `2px solid ${item.count > 0 ? c : 'hsl(var(--border))'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.count > 0 ? `${c}14` : 'hsl(var(--bg-card))',
                        color: item.count > 0 ? c : 'hsl(var(--text-secondary))',
                        fontWeight: 700, fontSize: 15,
                      }}>
                        {item.count > 0 ? item.count : <CheckCircle2 size={16} style={{ opacity: 0.3 }} />}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: item.count > 0 ? c : 'hsl(var(--text-secondary))', whiteSpace: 'nowrap' }}>
                        {item.step}
                      </span>
                    </div>
                    {i < funnel.length - 1 && (
                      <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: 'hsl(var(--border))', borderRadius: 2 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Metrics bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, paddingTop: 18, borderTop: '1px solid hsl(var(--border))' }}>
              {[
                { label: 'Tasa de Conversión', pct: kpis.convRate, color: '#0072CC' },
                { label: 'Meta Mensual',        pct: metaPct,        color: '#10b981' },
              ].map((row, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-secondary))', marginBottom: 6 }}>
                    <span>{row.label}</span>
                    <span style={{ fontWeight: 700, color: 'hsl(var(--text-primary))' }}>{row.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'hsl(var(--border))', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      style={{ height: '100%', background: row.color, borderRadius: 4 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel bar chart */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Distribución por Estado</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map(item => {
                const colors: Record<string, string> = { Pendiente: '#D97706', Enviada: '#0072CC', Aceptada: '#059669', Vencida: '#E11D48' };
                const c   = colors[item.step] ?? '#6B7C93';
                const pct = funnelMax > 0 ? Math.round((item.count / funnelMax) * 100) : 0;
                return (
                  <div key={item.step}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ fontWeight: 500, color: 'hsl(var(--text-primary))' }}>{item.step}</span>
                      <span style={{ fontWeight: 700, color: c }}>{item.count}</span>
                    </div>
                    <div style={{ height: 8, background: 'hsl(var(--border))', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', background: c, borderRadius: 4 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: activity feed */}
        <div className="card" style={{ padding: '22px 20px' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={15} style={{ color: 'hsl(var(--text-secondary))' }} /> Actividad Reciente
          </h4>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 19, height: 19, borderRadius: '50%', background: 'hsl(var(--border))', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '70%', height: 12, borderRadius: 4, background: 'hsl(var(--border))', marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
                    <div style={{ width: '50%', height: 10, borderRadius: 4, background: 'hsl(var(--border))', animation: 'pulse 1.5s infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '24px 0' }}>
              Sin actividad reciente.
            </p>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 1, background: 'hsl(var(--border))' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activity.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 19, height: 19, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                      border: '2px solid hsl(var(--bg-card))',
                      background: item.type === 'success' ? '#10b981' : item.type === 'doc' ? '#0072CC' : item.type === 'import' ? '#0ea5e9' : '#6366F1',
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{item.sub}</p>
                      {item.time && <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 3, opacity: 0.6 }}>{item.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn-outline" style={{ width: '100%', marginTop: 20, fontSize: 12 }}>
            Ver toda la actividad
          </button>

          {/* Quick stats */}
          {!loading && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Productos',    value: inventory.length,                                        color: '#f59e0b' },
                { label: 'Stock bajo',   value: kpis.lowStock,                                          color: '#E11D48' },
                { label: 'Órdenes',      value: orders.length,                                          color: '#8b5cf6' },
                { label: 'Documentos',   value: '—',                                                    color: '#0072CC' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 6, background: 'hsl(var(--bg-main))', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
