
import React from 'react';
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
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const stats = [
    { label: 'Ventas Totales',    value: '$84,200',  change: '+12.5%', icon: TrendingUp, color: '#0072CC' },
    { label: 'Clientes Activos',  value: '1,240',    change: '+8.2%',  icon: Users,      color: '#0ea5e9' },
    { label: 'Maquinaria Stock',  value: '48 Unid.', change: '-2.4%',  icon: Package,    color: '#f59e0b' },
    { label: 'Proformas Mes',     value: '156',      change: '+18.4%', icon: FileText,   color: '#10b981' },
  ];

  const activity = [
    { user: 'Juan Pérez',    action: 'generó nueva proforma',   time: 'hace 2h',  type: 'doc' },
    { user: 'Textiles Lima', action: 'solicitó catálogo',        time: 'hace 5h',  type: 'client' },
    { user: 'Gorra Urban',   action: 'proforma aceptada',        time: 'ayer',     type: 'success' },
  ];

  const funnelSteps = [
    { step: 'Prospecto',    done: true,  active: true  },
    { step: 'Cotizado',     done: true,  active: true  },
    { step: 'Negociación',  done: false, active: true  },
    { step: 'Cerrado',      done: false, active: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
            Business Performance
          </h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Visión estratégica de importaciones y ventas industriales.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Exportar Reporte
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nueva Operación
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card"
            style={{ padding: '20px 22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${stat.color}18`,
                color: stat.color,
              }}>
                <stat.icon size={20} />
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, fontWeight: 600,
                padding: '3px 8px', borderRadius: 20,
                background: stat.change.startsWith('+') ? '#ECFDF5' : '#FFF1F2',
                color:      stat.change.startsWith('+') ? '#059669' : '#E11D48',
              }}>
                {stat.change.startsWith('+') ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {stat.change}
              </span>
            </div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {stat.label}
            </p>
            <h3 style={{ fontSize: 26, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Funnel */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#E8F3FC', color: '#0072CC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Activity size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600 }}>Embudo de Operaciones</h4>
                <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Estado real de las proformas en curso</p>
              </div>
            </div>
            <button style={{ padding: 6, background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--text-secondary))', display: 'flex' }}>
              <MoreVertical size={16} />
            </button>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
            {funnelSteps.map((item, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: `2px solid ${item.done ? '#0072CC' : item.active ? '#0072CC' : 'hsl(var(--border))'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.done ? '#0072CC' : 'hsl(var(--bg-card))',
                    color: item.done ? '#fff' : item.active ? '#0072CC' : 'hsl(var(--text-secondary))',
                    fontSize: 13, fontWeight: 600,
                  }}>
                    {item.done ? <CheckCircle2 size={17} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: item.active ? '#0072CC' : 'hsl(var(--text-secondary))',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.step}
                  </span>
                </div>
                {i < funnelSteps.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 12px', marginBottom: 24,
                    background: item.done ? '#0072CC' : 'hsl(var(--border))',
                    borderRadius: 2,
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Metrics */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
            marginTop: 28, paddingTop: 20,
            borderTop: '1px solid hsl(var(--border))',
          }}>
            {[
              { label: 'Conversión de Leads', value: '72%', color: '#0072CC' },
              { label: 'Meta Mensual',         value: '84%', color: '#0ea5e9' },
            ].map((row, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-secondary))', marginBottom: 6 }}>
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{row.value}</span>
                </div>
                <div style={{ height: 6, background: 'hsl(var(--border))', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: row.value }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ height: '100%', background: row.color, borderRadius: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="card" style={{ padding: '24px 22px' }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'hsl(var(--text-secondary))' }} /> Actividad Reciente
          </h4>

          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 9, top: 8, bottom: 8, width: 1,
              background: 'hsl(var(--border))',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {activity.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 19, height: 19, borderRadius: '50%', flexShrink: 0,
                    zIndex: 1, border: '2px solid hsl(var(--bg-card))',
                    background: item.type === 'success' ? '#10b981' : item.type === 'doc' ? '#0072CC' : '#0ea5e9',
                  }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{item.user}</p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{item.action}</p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 4, opacity: 0.7 }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn-outline"
            style={{ width: '100%', marginTop: 24, fontSize: 12, textAlign: 'center' }}
          >
            Ver toda la actividad
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
