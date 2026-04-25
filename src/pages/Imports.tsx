import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, Search, Plus, X, ChevronLeft, AlertCircle, CheckCircle2,
  Clock, Building2, Warehouse, Anchor, DollarSign, Calendar,
  Boxes, Eye, Trash2, ClipboardList, Factory, PackageCheck,
  PartyPopper, Flag, Shield, FileText, Globe,
  User, Package, TrendingUp, RefreshCw, ExternalLink, Download,
} from 'lucide-react';
import { generateImportTrackingPDF } from '../utils/ImportTrackingPDF';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFirestore } from '../hooks/useFirestore';
import type {
  ImportRecord, ImportPhaseRecord, ImportItem,
  ImportIncoterm, ImportTransportType,
} from '../types';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PHASES = [
  { index: 0,  name: 'Solicitud del Cliente',   Icon: ClipboardList, color: '#6366F1', desc: 'Registro de solicitud, especificaciones y aprobación del pedido' },
  { index: 1,  name: 'Orden de Compra',          Icon: FileText,      color: '#8B5CF6', desc: 'Purchase Order emitida al proveedor chino y confirmación' },
  { index: 2,  name: 'En Producción',            Icon: Factory,       color: '#F59E0B', desc: 'Fabricación del producto en China según especificaciones' },
  { index: 3,  name: 'Inspección de Calidad',   Icon: Shield,        color: '#3B82F6', desc: 'Inspección en fábrica, Packing List y Certificado de Inspección' },
  { index: 4,  name: 'Exportación desde China', Icon: Flag,          color: '#EC4899', desc: 'Aduana china, Commercial Invoice, B/L y Certificate of Origin' },
  { index: 5,  name: 'En Tránsito',             Icon: Ship,          color: '#06B6D4', desc: 'Mercancía navegando de China al Puerto del Callao' },
  { index: 6,  name: 'Puerto del Callao',        Icon: Anchor,        color: '#0EA5E9', desc: 'Arribo al Callao, descarga y entrega de documentos al Agente de Aduanas' },
  { index: 7,  name: 'Despacho SUNAT',           Icon: Building2,     color: '#F97316', desc: 'DUA presentada, canal de selectividad y pago de tributos (IGV + Ad Valorem + IPM)' },
  { index: 8,  name: 'En Almacén',              Icon: Warehouse,      color: '#84CC16', desc: 'Mercancía desaduanizada en almacén' },
  { index: 9,  name: 'Listo para Entrega',       Icon: PackageCheck,  color: '#22C55E', desc: 'Coordinación de transporte local y entrega al cliente' },
  { index: 10, name: 'Entregado',               Icon: PartyPopper,   color: '#10B981', desc: 'Importación completada — entregado al cliente' },
] as const;

const DOC_LABELS: Record<string, string> = {
  proforma_invoice:       'Proforma Invoice',
  purchase_order:         'Purchase Order (PO)',
  commercial_invoice:     'Commercial Invoice',
  packing_list:           'Packing List',
  bill_of_lading:         'Bill of Lading (B/L)',
  certificate_of_origin:  'Certificado de Origen',
  inspection_certificate: 'Certificado de Inspección',
  insurance_certificate:  'Póliza de Seguros',
  dua:                    'DUA (Declaración Única de Aduanas)',
  otro:                   'Otro Documento',
};

const INCOTERM_OPTIONS: { value: ImportIncoterm; label: string; desc: string }[] = [
  { value: 'EXW', label: 'EXW', desc: 'Ex Works — recoge en fábrica china' },
  { value: 'FOB', label: 'FOB', desc: 'Free On Board — proveedor paga hasta embarque' },
  { value: 'CIF', label: 'CIF', desc: 'Cost, Insurance & Freight — incluye flete y seguro' },
  { value: 'CFR', label: 'CFR', desc: 'Cost and Freight — flete incluido, sin seguro' },
  { value: 'DDP', label: 'DDP', desc: 'Delivered Duty Paid — proveedor asume todo' },
];

const TRANSPORT_OPTIONS: { value: ImportTransportType; label: string }[] = [
  { value: 'maritimo_fcl_20', label: "Marítimo — FCL 20'" },
  { value: 'maritimo_fcl_40', label: "Marítimo — FCL 40'" },
  { value: 'maritimo_lcl',    label: 'Marítimo — LCL (carga consolidada)' },
  { value: 'aereo',           label: 'Aéreo (Air Freight)' },
];

const SUNAT_CHANNELS = [
  { value: 'verde',    label: 'Canal Verde',    desc: 'Solo revisión documental (24-48h)',    color: '#22C55E' },
  { value: 'amarillo', label: 'Canal Amarillo', desc: 'Inspección parcial 10-20% (3-5 días)', color: '#F59E0B' },
  { value: 'rojo',     label: 'Canal Rojo',     desc: 'Inspección total 100% (5-10 días)',    color: '#EF4444' },
];

const AD_VALOREM_OPTIONS = [
  { value: '0',  label: '0%  — Exonerado' },
  { value: '4',  label: '4%  — Reducido' },
  { value: '6',  label: '6%  — Maquinaria / Repuestos (común)' },
  { value: '11', label: '11% — Estándar' },
  { value: '17', label: '17% — Especial' },
];

const CHINESE_CITIES = [
  'Shanghai','Shenzhen','Guangzhou','Ningbo',
  'Tianjin','Xiamen','Qingdao','Wenzhou','Hangzhou','Otra ciudad',
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt2 = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSD = (n: number) => `$ ${fmt2(n)}`;

const calcFin = (fob: number, freight: number, ins: number, adPct: number, agent: number, warehouse: number, localT: number) => {
  const cif = fob + freight + ins;
  const adValorem = cif * adPct / 100;
  const igv = (cif + adValorem) * 0.18;
  const ipm = (cif + adValorem + igv) * 0.02;
  const totalTributes = adValorem + igv + ipm;
  const totalImportCost = cif + totalTributes + agent + warehouse + localT;
  return { cif, adValorem, igv, ipm, totalTributes, totalImportCost };
};

const phaseStatusInfo = (s: string) => {
  switch (s) {
    case 'completado':   return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'Completado' };
    case 'en_progreso':  return { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD', label: 'En Progreso' };
    case 'con_problema': return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Con Problema' };
    default:             return { bg: 'hsl(var(--accent))', text: 'hsl(var(--text-secondary))', border: 'hsl(var(--border))', label: 'Pendiente' };
  }
};

const importStatusInfo = (s: string) => {
  switch (s) {
    case 'completado':   return { bg: '#D1FAE5', text: '#065F46', label: 'Completado' };
    case 'con_problema': return { bg: '#FEE2E2', text: '#991B1B', label: 'Con Problema' };
    case 'cancelado':    return { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelado' };
    default:             return { bg: '#DBEAFE', text: '#1E3A8A', label: 'Activo' };
  }
};

const transportLabel = (t: ImportTransportType) =>
  TRANSPORT_OPTIONS.find(o => o.value === t)?.label ?? t;

const genDisplayId = (count: number) =>
  `IMP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

const initPhases = (): ImportPhaseRecord[] =>
  PHASES.map(p => ({ phaseIndex: p.index, status: 'pendiente' as const, notes: '', documents: [] }));

// ─── LOCAL FORM TYPES ─────────────────────────────────────────────────────────

interface NewForm {
  clientName: string; clientCompany: string; clientPhone: string; clientEmail: string;
  supplierName: string; supplierCity: string; supplierContact: string;
  incoterm: ImportIncoterm; transportType: ImportTransportType;
  freightForwarder: string; customsAgent: string;
  estimatedDeparture: string; estimatedArrival: string; expectedDelivery: string;
  fobValue: string; freightCost: string; insuranceCost: string;
  adValoremPct: string; customsAgentFee: string; warehouseCost: string; localTransportCost: string;
  notes: string;
}

interface PhaseForm {
  status: 'en_progreso' | 'completado' | 'con_problema';
  notes: string; startDate: string; completedDate: string;
  docName: string; docType: string; docUrl: string;
  blNumber: string; trackingNumber: string; duaNumber: string;
  sunatChannel: string; actualArrival: string;
}

const emptyNew = (): NewForm => ({
  clientName: '', clientCompany: '', clientPhone: '', clientEmail: '',
  supplierName: '', supplierCity: 'Shanghai', supplierContact: '',
  incoterm: 'FOB', transportType: 'maritimo_fcl_20',
  freightForwarder: '', customsAgent: '',
  estimatedDeparture: '', estimatedArrival: '', expectedDelivery: '',
  fobValue: '', freightCost: '', insuranceCost: '',
  adValoremPct: '6', customsAgentFee: '', warehouseCost: '', localTransportCost: '',
  notes: '',
});

const emptyPhaseForm = (): PhaseForm => ({
  status: 'en_progreso', notes: '',
  startDate: new Date().toISOString().slice(0, 10), completedDate: '',
  docName: '', docType: 'otro', docUrl: '',
  blNumber: '', trackingNumber: '', duaNumber: '',
  sunatChannel: '', actualArrival: '',
});

// ─── SHARED STYLE ATOMS ───────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius-md)', fontSize: 13, background: 'hsl(var(--bg-card))',
  color: 'hsl(var(--text-primary))', boxSizing: 'border-box',
};

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-secondary))', display: 'block', marginBottom: 5 }}>
      {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const FinRow: React.FC<{ label: string; value: string; indent?: boolean; bold?: boolean; highlight?: boolean; color?: string; large?: boolean }> =
  ({ label, value, indent, bold, highlight, color, large }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, padding: highlight ? '4px 8px' : '0 2px', background: highlight ? 'hsl(var(--accent))' : 'transparent', borderRadius: 4 }}>
      <span style={{ fontSize: large ? 13 : 12, color: 'hsl(var(--text-secondary))', paddingLeft: indent ? 12 : 0, fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: large ? 14 : 12, fontWeight: bold ? 700 : 500, color: color ?? 'hsl(var(--text-primary))' }}>{value}</span>
    </div>
  );

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean; highlight?: boolean }> = ({ label, value, mono, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
    <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: highlight ? '#0EA5E9' : 'hsl(var(--text-primary))', fontFamily: mono ? 'monospace' : undefined, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

// ─── MODAL OVERLAY ────────────────────────────────────────────────────────────

const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode; zIndex?: number }> = ({ onClose, children, zIndex = 50 }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
    style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </motion.div>
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
  <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 21, fontWeight: 700, color: 'hsl(var(--text-primary))', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{label}</div>
    </div>
  </motion.div>
);

// ─── IMPORT CARD (list item) ──────────────────────────────────────────────────

const ImportCard: React.FC<{
  imp: ImportRecord;
  onClick: () => void;
  onExhibit: () => void;
  onDelete: () => void;
}> = ({ imp, onClick, onExhibit, onDelete }) => {
  const phase = PHASES[imp.currentPhaseIndex];
  const PhaseIcon = phase.Icon;
  const si = importStatusInfo(imp.status);
  const pct = Math.round((imp.currentPhaseIndex / 10) * 100);
  const barColor = imp.status === 'con_problema' ? '#EF4444' : imp.status === 'completado' ? '#10B981' : '#0EA5E9';

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="card" whileHover={{ borderColor: 'hsl(var(--primary))' }}
      style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'hsl(var(--text-primary))' }}>{imp.displayId}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: si.bg, color: si.text }}>{si.label}</span>
            <span style={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>— {imp.clientName}</span>
            {imp.clientCompany && <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>({imp.clientCompany})</span>}
          </div>
          {/* Phase */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: phase.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhaseIcon size={13} style={{ color: phase.color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: phase.color }}>{phase.name}</span>
            <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>· {imp.supplierName}, {imp.supplierCity}</span>
          </div>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'hsl(var(--border))', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{pct}% · Fase {imp.currentPhaseIndex + 1}/11</span>
          </div>
          {/* Meta */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: 3 }}>
              <DollarSign size={11} /> FOB: {fmtUSD(imp.fobValue)}
            </span>
            {imp.estimatedArrival && (
              <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Calendar size={11} /> ETA Callao: {imp.estimatedArrival}
              </span>
            )}
            {imp.expectedDelivery && (
              <span style={{ fontSize: 11, color: '#0EA5E9', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Calendar size={11} /> Entrega estimada: {imp.expectedDelivery}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Package size={11} /> {imp.items.length} {imp.items.length === 1 ? 'producto' : 'productos'} · {imp.incoterm}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={onExhibit} style={{ padding: '6px 12px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Eye size={12} /> Exhibición
          </button>
          <button onClick={onClick} style={{ padding: '6px 12px', background: 'transparent', color: 'hsl(var(--text-primary))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', fontSize: 12, cursor: 'pointer' }}>
            Ver detalle
          </button>
          <button onClick={onDelete} style={{ padding: '6px 12px', background: 'transparent', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', fontSize: 12, cursor: 'pointer' }}>
            <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} />Eliminar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── PHASE TIMELINE (horizontal) ─────────────────────────────────────────────

const PhaseTimeline: React.FC<{ imp: ImportRecord }> = ({ imp }) => (
  <div className="card" style={{ padding: '18px 22px', marginBottom: 18, overflowX: 'auto' }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Progreso de la importación</p>
    <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 880 }}>
      {PHASES.map((p, i) => {
        const ph = imp.phases?.[i];
        const st = ph?.status ?? 'pendiente';
        const isCurrent = imp.currentPhaseIndex === i;
        const PIcon = p.Icon;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 70 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: st === 'completado' ? p.color + '20' : st === 'en_progreso' ? p.color + '15' : 'hsl(var(--accent))',
                border: `2px solid ${st !== 'pendiente' ? p.color : 'hsl(var(--border))'}`,
                boxShadow: isCurrent ? `0 0 0 3px ${p.color}35` : 'none',
                transition: 'all 0.2s',
              }}>
                {st === 'completado'
                  ? <CheckCircle2 size={15} style={{ color: p.color }} />
                  : <PIcon size={13} style={{ color: st !== 'pendiente' ? p.color : 'hsl(var(--text-secondary))' }} />}
              </div>
              <p style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? p.color : 'hsl(var(--text-secondary))', textAlign: 'center', maxWidth: 65, marginTop: 5, lineHeight: 1.3 }}>
                {p.name}
              </p>
              {isCurrent && (
                <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: p.color + '20', color: p.color, marginTop: 2 }}>ACTUAL</span>
              )}
              {st === 'con_problema' && (
                <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: '#FEE2E2', color: '#991B1B', marginTop: 2 }}>PROBLEMA</span>
              )}
            </div>
            {i < PHASES.length - 1 && (
              <div style={{ flex: 'none', width: 20, height: 2, background: st === 'completado' ? p.color : 'hsl(var(--border))', marginTop: 16, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

// ─── DETAIL VIEW ──────────────────────────────────────────────────────────────

const DetailView: React.FC<{
  imp: ImportRecord;
  onBack: () => void;
  onUpdatePhase: () => void;
  onExhibit: () => void;
  onDelete: () => void;
}> = ({ imp, onBack, onUpdatePhase, onExhibit, onDelete }) => {
  const phase = PHASES[imp.currentPhaseIndex];
  const PhaseIcon = phase.Icon;
  const si = importStatusInfo(imp.status);
  const curPhaseData = imp.phases?.[imp.currentPhaseIndex];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'hsl(var(--text-secondary))', cursor: 'pointer' }}>
            <ChevronLeft size={14} /> Volver
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {imp.displayId}
              <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: si.bg, color: si.text }}>{si.label}</span>
            </h1>
            <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 3 }}>
              Cliente: <strong style={{ color: 'hsl(var(--text-primary))' }}>{imp.clientName}</strong>
              {imp.clientCompany && ` · ${imp.clientCompany}`}
              {' · '}Proveedor: <strong style={{ color: 'hsl(var(--text-primary))' }}>{imp.supplierName}</strong>, {imp.supplierCity}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {imp.status === 'activo' && (
            <button onClick={onUpdatePhase} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} /> Actualizar Fase
            </button>
          )}
          <button onClick={onExhibit} style={{ padding: '7px 14px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={13} /> Vista Exhibición
          </button>
          <button onClick={() => generateImportTrackingPDF(imp)}
            style={{ padding: '7px 14px', background: 'transparent', color: 'hsl(var(--text-primary))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={13} /> PDF
          </button>
          <button onClick={onDelete} style={{ padding: '7px 14px', background: 'transparent', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      </div>

      {/* Timeline */}
      <PhaseTimeline imp={imp} />

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 14 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Current phase */}
          <div className="card" style={{ padding: 20, borderLeft: `4px solid ${phase.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: phase.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhaseIcon size={18} style={{ color: phase.color }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'hsl(var(--text-primary))' }}>Fase actual: {phase.name}</p>
                <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>{phase.desc}</p>
              </div>
            </div>
            {curPhaseData && (
              <div>
                {(() => { const psi = phaseStatusInfo(curPhaseData.status); return (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: psi.bg, color: psi.text, border: `1px solid ${psi.border}` }}>{psi.label}</span>
                    {curPhaseData.startDate && <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Inicio: {curPhaseData.startDate}</span>}
                    {curPhaseData.completedDate && <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Completado: {curPhaseData.completedDate}</span>}
                  </div>
                ); })()}
                {curPhaseData.notes && (
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-primary))', background: 'hsl(var(--accent))', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>{curPhaseData.notes}</p>
                )}
                {imp.currentPhaseIndex === 7 && imp.sunatChannel && (
                  <div style={{ padding: '6px 10px', background: '#FEF3C7', borderRadius: 6, fontSize: 12, color: '#92400E', marginBottom: 8 }}>
                    Canal SUNAT: <strong>{SUNAT_CHANNELS.find(c => c.value === imp.sunatChannel)?.label}</strong> — {SUNAT_CHANNELS.find(c => c.value === imp.sunatChannel)?.desc}
                  </div>
                )}
                {(curPhaseData.documents ?? []).length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 5 }}>Documentos:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {curPhaseData.documents!.map(doc => (
                        <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#EEF2FF', color: '#4338CA', borderRadius: 4, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                          <FileText size={11} /> {doc.name} <ExternalLink size={9} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phase history */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 14 }}>Historial de Fases</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PHASES.map((p, i) => {
                const ph = imp.phases?.[i];
                if (!ph || ph.status === 'pendiente') return null;
                const psi = phaseStatusInfo(ph.status);
                const PIcon = p.Icon;
                return (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: 'hsl(var(--accent))', border: `1px solid ${psi.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: (ph.notes || (ph.documents ?? []).length > 0) ? 6 : 0 }}>
                      <PIcon size={13} style={{ color: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))', flex: 1 }}>{p.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: psi.bg, color: psi.text }}>{psi.label}</span>
                    </div>
                    {ph.notes && <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginLeft: 21, marginBottom: 4 }}>{ph.notes}</p>}
                    {(ph.documents ?? []).length > 0 && (
                      <div style={{ marginLeft: 21, display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
                        {ph.documents!.map(doc => (
                          <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: '#EEF2FF', color: '#4338CA', borderRadius: 4, fontSize: 11, textDecoration: 'none', fontWeight: 500 }}>
                            <FileText size={9} /> {DOC_LABELS[doc.type] ?? doc.type}: {doc.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div style={{ marginLeft: 21, display: 'flex', gap: 12 }}>
                      {ph.startDate && <span style={{ fontSize: 10, color: 'hsl(var(--text-secondary))' }}>Inicio: {ph.startDate}</span>}
                      {ph.completedDate && <span style={{ fontSize: 10, color: 'hsl(var(--text-secondary))' }}>Completado: {ph.completedDate}</span>}
                    </div>
                  </div>
                );
              })}
              {(imp.phases ?? []).filter(p => p.status !== 'pendiente').length === 0 && (
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '20px 0' }}>Aún no hay fases completadas</p>
              )}
            </div>
          </div>

          {/* Products table */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 14 }}>Productos Importados</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Producto / Descripción', 'Tipo', 'Cant.', 'P. Unit.', 'Total', 'HS Code'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {imp.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{it.name}</div>
                        {it.description && <div style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{it.description}</div>}
                        {it.brand && <div style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>Marca: {it.brand}{it.model ? ` · ${it.model}` : ''}</div>}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: it.type === 'maquinaria' ? '#EEF2FF' : '#F0FDF4', color: it.type === 'maquinaria' ? '#4338CA' : '#15803D' }}>
                          {it.type === 'maquinaria' ? 'Maquinaria' : 'Repuesto'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: 'hsl(var(--text-secondary))' }}>{it.quantity} {it.unit}</td>
                      <td style={{ padding: '8px', color: 'hsl(var(--text-secondary))' }}>{fmtUSD(it.unitPrice)}</td>
                      <td style={{ padding: '8px', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>{fmtUSD(it.quantity * it.unitPrice)}</td>
                      <td style={{ padding: '8px', color: 'hsl(var(--text-secondary))', fontFamily: 'monospace', fontSize: 11 }}>{it.hsCode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Financial */}
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarSign size={14} style={{ color: '#8B5CF6' }} /> Resumen Financiero (USD)
            </p>
            <FinRow label="Valor FOB" value={fmtUSD(imp.fobValue)} />
            <FinRow label="Flete Internacional" value={fmtUSD(imp.freightCost)} />
            <FinRow label="Seguro de Transporte" value={fmtUSD(imp.insuranceCost)} />
            <FinRow label="Valor CIF (Callao)" value={fmtUSD(imp.cifValue)} bold highlight />
            <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '8px 0' }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tributos SUNAT</p>
            <FinRow label={`Ad Valorem (${imp.adValoremPct}%)`} value={fmtUSD(imp.adValorem)} indent />
            <FinRow label="IGV (18%)" value={fmtUSD(imp.igv)} indent />
            <FinRow label="IPM (2%)" value={fmtUSD(imp.ipm)} indent />
            <FinRow label="Total Tributos" value={fmtUSD(imp.totalTributes)} bold color="#F97316" />
            <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '8px 0' }} />
            <FinRow label="Agente de Aduanas" value={fmtUSD(imp.customsAgentFee)} />
            <FinRow label="Almacenaje" value={fmtUSD(imp.warehouseCost)} />
            <FinRow label="Transporte Local" value={fmtUSD(imp.localTransportCost)} />
            <div style={{ borderTop: '2px solid hsl(var(--border))', margin: '10px 0' }} />
            <FinRow label="COSTO TOTAL IMPORTACIÓN" value={fmtUSD(imp.totalImportCost)} bold highlight large color="#10B981" />
          </div>

          {/* Logistics */}
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} style={{ color: '#0EA5E9' }} /> Logística
            </p>
            <InfoRow label="Incoterm" value={imp.incoterm} />
            <InfoRow label="Transporte" value={transportLabel(imp.transportType)} />
            {imp.freightForwarder && <InfoRow label="Freight Forwarder" value={imp.freightForwarder} />}
            {imp.customsAgent && <InfoRow label="Agente de Aduanas" value={imp.customsAgent} />}
            {imp.trackingNumber && <InfoRow label="Tracking No." value={imp.trackingNumber} mono />}
            {imp.blNumber && <InfoRow label="B/L No." value={imp.blNumber} mono />}
            {imp.duaNumber && <InfoRow label="DUA No." value={imp.duaNumber} mono />}
            {imp.sunatChannel && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Canal SUNAT</span>
                {(() => {
                  const ch = SUNAT_CHANNELS.find(c => c.value === imp.sunatChannel);
                  return <span style={{ fontSize: 12, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: imp.sunatChannel === 'verde' ? '#D1FAE5' : imp.sunatChannel === 'amarillo' ? '#FEF3C7' : '#FEE2E2', color: imp.sunatChannel === 'verde' ? '#065F46' : imp.sunatChannel === 'amarillo' ? '#92400E' : '#991B1B' }}>{ch?.label ?? imp.sunatChannel}</span>;
                })()}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: '#F59E0B' }} /> Fechas Clave
            </p>
            {imp.estimatedDeparture && <InfoRow label="Zarpe estimado (China)" value={imp.estimatedDeparture} />}
            {imp.estimatedArrival && <InfoRow label="ETA Puerto Callao" value={imp.estimatedArrival} />}
            {imp.actualArrival && <InfoRow label="Arribo real Callao" value={imp.actualArrival} />}
            {imp.expectedDelivery && <InfoRow label="Entrega estimada" value={imp.expectedDelivery} highlight />}
            <InfoRow label="Creado" value={new Date(imp.createdAt).toLocaleDateString('es-PE')} />
          </div>

          {/* Client */}
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} style={{ color: '#6366F1' }} /> Cliente
            </p>
            <InfoRow label="Nombre" value={imp.clientName} />
            {imp.clientCompany && <InfoRow label="Empresa" value={imp.clientCompany} />}
            {imp.clientPhone && <InfoRow label="Teléfono" value={imp.clientPhone} />}
            {imp.clientEmail && <InfoRow label="Email" value={imp.clientEmail} />}
          </div>

          {/* Supplier */}
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} style={{ color: '#EC4899' }} /> Proveedor (China)
            </p>
            <InfoRow label="Empresa" value={imp.supplierName} />
            <InfoRow label="Ciudad" value={imp.supplierCity} />
            {imp.supplierContact && <InfoRow label="Contacto" value={imp.supplierContact} />}
          </div>

          {imp.notes && (
            <div className="card" style={{ padding: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 6 }}>Notas</p>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{imp.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── NEW IMPORT MODAL ─────────────────────────────────────────────────────────

const TABS = ['Cliente & Proveedor', 'Productos', 'Logística', 'Finanzas'];

const NewImportModal: React.FC<{
  form: NewForm;
  setForm: React.Dispatch<React.SetStateAction<NewForm>>;
  items: ImportItem[];
  addItem: () => void;
  updateItem: (i: number, f: keyof ImportItem, v: any) => void;
  removeItem: (i: number) => void;
  liveFinancials: ReturnType<typeof calcFin>;
  tab: number;
  setTab: (n: number) => void;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ form, setForm, items, addItem, updateItem, removeItem, liveFinancials, tab, setTab, saving, error, onClose, onSubmit }) => {
  const set = (k: keyof NewForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Overlay onClose={onClose}>
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
        style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 12, width: '90vw', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Modal header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Nueva Importación China → Perú</h2>
            <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>Completa los datos del proceso de importación</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', padding: '0 24px' }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === i ? 'hsl(var(--primary))' : 'transparent'}`, fontSize: 13, fontWeight: tab === i ? 600 : 400, color: tab === i ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))', cursor: 'pointer', transition: 'all 0.12s' }}>
              {i + 1}. {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Tab 0: Cliente & Proveedor */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Datos del Cliente</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nombre del cliente" required>
                  <input style={inputSt} value={form.clientName} onChange={set('clientName')} placeholder="Ej: Juan Pérez" />
                </Field>
                <Field label="Empresa / RUC">
                  <input style={inputSt} value={form.clientCompany} onChange={set('clientCompany')} placeholder="Ej: Industrias SAC" />
                </Field>
                <Field label="Teléfono">
                  <input style={inputSt} value={form.clientPhone} onChange={set('clientPhone')} placeholder="+51 999 888 777" />
                </Field>
                <Field label="Email">
                  <input style={inputSt} value={form.clientEmail} onChange={set('clientEmail')} placeholder="cliente@empresa.com" type="email" />
                </Field>
              </div>
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Proveedor Chino</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Nombre de la empresa" required>
                    <input style={inputSt} value={form.supplierName} onChange={set('supplierName')} placeholder="Ej: Shenzhen Tech Co., Ltd." />
                  </Field>
                  <Field label="Ciudad de origen">
                    <select style={inputSt} value={form.supplierCity} onChange={set('supplierCity')}>
                      {CHINESE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Contacto (nombre / WeChat / email)">
                    <input style={inputSt} value={form.supplierContact} onChange={set('supplierContact')} placeholder="Ej: Linda Wang — wechat: lindaw88" />
                  </Field>
                </div>
              </div>
              <Field label="Notas generales de la importación">
                <textarea style={{ ...inputSt, height: 70, resize: 'none' }} value={form.notes} onChange={set('notes')} placeholder="Observaciones, condiciones especiales, etc." />
              </Field>
            </div>
          )}

          {/* Tab 1: Productos */}
          {tab === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                  Productos a importar <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', fontWeight: 400 }}>(máquinas, repuestos, etc.)</span>
                </p>
                <button onClick={addItem} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '6px 12px' }}>
                  <Plus size={13} /> Agregar producto
                </button>
              </div>
              {items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-secondary))' }}>
                  <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>Agrega al menos un producto</p>
                </div>
              )}
              {items.map((it, i) => (
                <div key={i} className="card" style={{ padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>Producto #{i + 1}</span>
                    <button onClick={() => removeItem(i)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Nombre del producto" required>
                      <input style={inputSt} value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Ej: Compresor de tornillo 7.5 kW" />
                    </Field>
                    <Field label="Tipo">
                      <select style={inputSt} value={it.type} onChange={e => updateItem(i, 'type', e.target.value)}>
                        <option value="maquinaria">Maquinaria</option>
                        <option value="repuesto">Repuesto</option>
                      </select>
                    </Field>
                    <Field label="Descripción / Especificaciones">
                      <input style={inputSt} value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Ej: 7.5kW, 220V, 8 bar, 1.1 m³/min" />
                    </Field>
                    <Field label="Marca / Modelo">
                      <input style={inputSt} value={it.brand ?? ''} onChange={e => updateItem(i, 'brand', e.target.value)} placeholder="Ej: Atlas Copco / GA7+" />
                    </Field>
                    <Field label="Cantidad">
                      <input style={inputSt} type="number" min="1" value={it.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                    </Field>
                    <Field label="Unidad">
                      <select style={inputSt} value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                        {['Unidad', 'Set', 'Par', 'Juego', 'Kit', 'Rollo', 'Caja', 'Pallet'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </Field>
                    <Field label="Precio unitario (USD)">
                      <input style={inputSt} type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                    </Field>
                    <Field label="Código HS (Partida Arancelaria)">
                      <input style={inputSt} value={it.hsCode ?? ''} onChange={e => updateItem(i, 'hsCode', e.target.value)} placeholder="Ej: 8414.40.00 — Compresores" />
                    </Field>
                  </div>
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'hsl(var(--accent))', borderRadius: 6, fontSize: 12, color: 'hsl(var(--text-secondary))', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal producto:</span>
                    <strong style={{ color: 'hsl(var(--text-primary))' }}>{fmtUSD(it.quantity * it.unitPrice)}</strong>
                  </div>
                </div>
              ))}
              {items.length > 0 && (
                <div style={{ textAlign: 'right', padding: '10px 0', fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                  Total productos: {fmtUSD(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Logística */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Incoterm">
                  <select style={inputSt} value={form.incoterm} onChange={set('incoterm')}>
                    {INCOTERM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>)}
                  </select>
                </Field>
                <Field label="Tipo de transporte">
                  <select style={inputSt} value={form.transportType} onChange={set('transportType')}>
                    {TRANSPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Freight Forwarder (agente de carga)">
                  <input style={inputSt} value={form.freightForwarder} onChange={set('freightForwarder')} placeholder="Ej: DHL Global Forwarding" />
                </Field>
                <Field label="Agente de Aduanas (SUNAT)">
                  <input style={inputSt} value={form.customsAgent} onChange={set('customsAgent')} placeholder="Ej: Aduanas Perú SAC" />
                </Field>
              </div>
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Fechas Estimadas</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label="Zarpe desde China">
                    <input style={inputSt} type="date" value={form.estimatedDeparture} onChange={set('estimatedDeparture')} />
                  </Field>
                  <Field label="ETA Puerto del Callao">
                    <input style={inputSt} type="date" value={form.estimatedArrival} onChange={set('estimatedArrival')} />
                  </Field>
                  <Field label="Entrega estimada al cliente">
                    <input style={inputSt} type="date" value={form.expectedDelivery} onChange={set('expectedDelivery')} />
                  </Field>
                </div>
              </div>
              {/* Incoterm info box */}
              {form.incoterm && (
                <div style={{ padding: '10px 14px', background: '#EEF2FF', borderRadius: 8, fontSize: 12, color: '#4338CA' }}>
                  <strong>{INCOTERM_OPTIONS.find(o => o.value === form.incoterm)?.label}:</strong>{' '}
                  {INCOTERM_OPTIONS.find(o => o.value === form.incoterm)?.desc}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Finanzas */}
          {tab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Valor FOB (USD)" required>
                  <input style={inputSt} type="number" min="0" step="0.01" value={form.fobValue} onChange={set('fobValue')} placeholder="0.00" />
                </Field>
                <Field label="Flete Internacional (USD)">
                  <input style={inputSt} type="number" min="0" step="0.01" value={form.freightCost} onChange={set('freightCost')} placeholder="0.00" />
                </Field>
                <Field label="Seguro de Transporte (USD)">
                  <input style={inputSt} type="number" min="0" step="0.01" value={form.insuranceCost} onChange={set('insuranceCost')} placeholder="0.00 (aprox. 0.5% del FOB)" />
                </Field>
                <Field label="Ad Valorem (%)">
                  <select style={inputSt} value={form.adValoremPct} onChange={set('adValoremPct')}>
                    {AD_VALOREM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Honorarios Agente de Aduanas (USD)">
                  <input style={inputSt} type="number" min="0" step="0.01" value={form.customsAgentFee} onChange={set('customsAgentFee')} placeholder="0.00" />
                </Field>
                <Field label="Costo de Almacenaje (USD)">
                  <input style={inputSt} type="number" min="0" step="0.01" value={form.warehouseCost} onChange={set('warehouseCost')} placeholder="0.00" />
                </Field>
                <Field label="Transporte Local Lima (USD)">
                  <input style={inputSt} type="number" min="0" step="0.01" value={form.localTransportCost} onChange={set('localTransportCost')} placeholder="0.00" />
                </Field>
              </div>

              {/* Live calculation */}
              {(parseFloat(form.fobValue) > 0) && (
                <div style={{ background: 'hsl(var(--accent))', borderRadius: 10, padding: '16px 20px', border: '1px solid hsl(var(--border))' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Cálculo automático en tiempo real</p>
                  <FinRow label="Valor FOB" value={fmtUSD(parseFloat(form.fobValue) || 0)} />
                  <FinRow label="+ Flete" value={fmtUSD(parseFloat(form.freightCost) || 0)} />
                  <FinRow label="+ Seguro" value={fmtUSD(parseFloat(form.insuranceCost) || 0)} />
                  <FinRow label="= Valor CIF (base imponible)" value={fmtUSD(liveFinancials.cif)} bold highlight />
                  <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '8px 0' }} />
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 6 }}>TRIBUTOS SUNAT</p>
                  <FinRow label={`Ad Valorem (${form.adValoremPct}%)`} value={fmtUSD(liveFinancials.adValorem)} indent />
                  <FinRow label="IGV (18%)" value={fmtUSD(liveFinancials.igv)} indent />
                  <FinRow label="IPM (2%)" value={fmtUSD(liveFinancials.ipm)} indent />
                  <FinRow label="Total Tributos" value={fmtUSD(liveFinancials.totalTributes)} bold color="#F97316" />
                  <div style={{ borderTop: '2px solid hsl(var(--border))', margin: '10px 0' }} />
                  <FinRow label="COSTO TOTAL IMPORTACIÓN" value={fmtUSD(liveFinancials.totalImportCost)} bold highlight large color="#10B981" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontSize: 12 }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab > 0 && <button className="btn-outline" onClick={() => setTab(tab - 1)}>← Anterior</button>}
            {tab < 3
              ? <button className="btn-primary" onClick={() => setTab(tab + 1)}>Siguiente →</button>
              : <button className="btn-primary" onClick={onSubmit} disabled={saving}>{saving ? 'Creando...' : 'Crear Importación'}</button>
            }
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
};

// ─── PHASE UPDATE MODAL ───────────────────────────────────────────────────────

const PhaseUpdateModal: React.FC<{
  imp: ImportRecord;
  form: PhaseForm;
  setForm: React.Dispatch<React.SetStateAction<PhaseForm>>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ imp, form, setForm, saving, error, onClose, onSubmit }) => {
  const phaseIdx = imp.currentPhaseIndex;
  const phase = PHASES[phaseIdx];
  const PhaseIcon = phase.Icon;
  const set = (k: keyof PhaseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Overlay onClose={onClose}>
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
        style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 12, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: phase.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhaseIcon size={16} style={{ color: phase.color }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Actualizar: {phase.name}</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{imp.displayId} · Fase {phaseIdx + 1} de 11</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Estado de esta fase">
            <select style={inputSt} value={form.status} onChange={set('status')}>
              <option value="en_progreso">En Progreso</option>
              <option value="completado">Completado — avanzar a siguiente fase</option>
              <option value="con_problema">Con Problema</option>
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Fecha de inicio">
              <input style={inputSt} type="date" value={form.startDate} onChange={set('startDate')} />
            </Field>
            {form.status === 'completado' && (
              <Field label="Fecha de completado">
                <input style={inputSt} type="date" value={form.completedDate} onChange={set('completedDate')} />
              </Field>
            )}
          </div>

          <Field label="Notas / Observaciones">
            <textarea style={{ ...inputSt, height: 80, resize: 'none' }} value={form.notes} onChange={set('notes')} placeholder="Describe lo que ocurrió en esta fase..." />
          </Field>

          {/* Phase-specific extra fields */}
          {(phaseIdx === 4 || phaseIdx === 5) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Bill of Lading No. (B/L)">
                <input style={inputSt} value={form.blNumber} onChange={set('blNumber')} placeholder="Ej: ONEYPERU123456" />
              </Field>
              <Field label="Tracking / Contenedor No.">
                <input style={inputSt} value={form.trackingNumber} onChange={set('trackingNumber')} placeholder="Ej: TEMU1234567" />
              </Field>
            </div>
          )}

          {phaseIdx === 6 && (
            <Field label="Fecha real de arribo al Callao">
              <input style={inputSt} type="date" value={form.actualArrival} onChange={set('actualArrival')} />
            </Field>
          )}

          {phaseIdx === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Canal de Selectividad SUNAT">
                <select style={inputSt} value={form.sunatChannel} onChange={set('sunatChannel')}>
                  <option value="">— Seleccionar canal —</option>
                  {SUNAT_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label} — {c.desc}</option>)}
                </select>
              </Field>
              <Field label="DUA No. (Declaración Única de Aduanas)">
                <input style={inputSt} value={form.duaNumber} onChange={set('duaNumber')} placeholder="Ej: 118-2024-10-001234" />
              </Field>
            </div>
          )}

          {/* Document attach */}
          <div style={{ padding: '12px 14px', background: 'hsl(var(--accent))', borderRadius: 8, border: '1px solid hsl(var(--border))' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-primary))', marginBottom: 10 }}>Adjuntar Documento (opcional)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Nombre del documento">
                <input style={inputSt} value={form.docName} onChange={set('docName')} placeholder="Ej: BL-ONEYPERU123456" />
              </Field>
              <Field label="Tipo de documento">
                <select style={inputSt} value={form.docType} onChange={set('docType')}>
                  {Object.entries(DOC_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="URL / Link (Google Drive, Dropbox, etc.)">
                <input style={inputSt} value={form.docUrl} onChange={set('docUrl')} placeholder="https://drive.google.com/..." />
              </Field>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontSize: 12, padding: '8px 12px', background: '#FEF2F2', borderRadius: 6 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {form.status === 'completado' && phaseIdx < 10 && (
            <div style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: 8, fontSize: 12, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> Al guardar, avanzará automáticamente a: <strong>{PHASES[phaseIdx + 1].name}</strong>
            </div>
          )}
          {form.status === 'completado' && phaseIdx === 10 && (
            <div style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: 8, fontSize: 12, color: '#065F46' }}>
              🎉 Esta es la última fase. La importación quedará marcada como <strong>Completada</strong>.
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar actualización'}</button>
        </div>
      </motion.div>
    </Overlay>
  );
};

// ─── EXHIBITION MODAL (vista para el cliente) ─────────────────────────────────

const ExhibitionModal: React.FC<{ imp: ImportRecord; onClose: () => void }> = ({ imp, onClose }) => {
  const phase = PHASES[imp.currentPhaseIndex];
  const PhaseIcon = phase.Icon;
  const pct = Math.round((imp.currentPhaseIndex / 10) * 100);

  return (
    <Overlay onClose={onClose} zIndex={60}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 16, width: '92vw', maxWidth: 860, maxHeight: '92vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ background: 'hsl(var(--primary))', padding: '20px 30px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>G</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>GORRA CRM · Seguimiento de Importación</span>
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{imp.displayId}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
              Cliente: <strong style={{ color: '#fff' }}>{imp.clientName}</strong>
              {imp.clientCompany && ` · ${imp.clientCompany}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => generateImportTrackingPDF(imp)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> Descargar PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ padding: '24px 30px' }}>
          {/* Current status hero */}
          <div style={{ textAlign: 'center', padding: '24px 0', marginBottom: 24, border: `2px solid ${phase.color}30`, borderRadius: 12, background: phase.color + '08' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: phase.color + '20', border: `3px solid ${phase.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <PhaseIcon size={26} style={{ color: phase.color }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: phase.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Estado actual</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'hsl(var(--text-primary))' }}>{phase.name}</h2>
            <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 6, maxWidth: 500, margin: '6px auto 0' }}>{phase.desc}</p>
            {/* Progress */}
            <div style={{ maxWidth: 400, margin: '16px auto 0' }}>
              <div style={{ height: 8, background: 'hsl(var(--border))', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: phase.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', marginTop: 6 }}>{pct}% completado · Paso {imp.currentPhaseIndex + 1} de 11</p>
            </div>
          </div>

          {/* Timeline grid */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Proceso de importación China → Perú</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {PHASES.map((p, i) => {
                const ph = imp.phases?.[i];
                const st = ph?.status ?? 'pendiente';
                const isCurrent = imp.currentPhaseIndex === i;
                const PIcon = p.Icon;
                return (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${isCurrent ? p.color : st === 'completado' ? p.color + '50' : 'hsl(var(--border))'}`, background: isCurrent ? p.color + '10' : st === 'completado' ? p.color + '08' : 'transparent', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {st === 'completado' ? <CheckCircle2 size={14} style={{ color: p.color }} /> : <PIcon size={14} style={{ color: isCurrent ? p.color : 'hsl(var(--text-secondary))' }} />}
                      <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? p.color : st === 'completado' ? p.color : 'hsl(var(--text-secondary))', textTransform: 'uppercase' }}>
                        {isCurrent ? '● ACTUAL' : st === 'completado' ? '✓ Listo' : 'Pendiente'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? p.color : 'hsl(var(--text-primary))', lineHeight: 1.3 }}>{p.name}</p>
                    {ph?.completedDate && <p style={{ fontSize: 10, color: 'hsl(var(--text-secondary))', marginTop: 3 }}>{ph.completedDate}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key dates + items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} style={{ color: '#F59E0B' }} /> Fechas Clave
              </p>
              {imp.estimatedDeparture && <InfoRow label="Zarpe desde China" value={imp.estimatedDeparture} />}
              {imp.estimatedArrival && <InfoRow label="ETA Puerto Callao" value={imp.estimatedArrival} />}
              {imp.actualArrival && <InfoRow label="Arribo real" value={imp.actualArrival} />}
              {imp.expectedDelivery
                ? <InfoRow label="Entrega estimada al cliente" value={imp.expectedDelivery} highlight />
                : <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Fecha de entrega por confirmar</p>}
            </div>
            <div className="card" style={{ padding: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={14} style={{ color: '#8B5CF6' }} /> Productos
              </p>
              {imp.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, paddingBottom: 8, borderBottom: i < imp.items.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{it.name}</p>
                    {it.description && <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{it.description}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: it.type === 'maquinaria' ? '#EEF2FF' : '#F0FDF4', color: it.type === 'maquinaria' ? '#4338CA' : '#15803D' }}>
                      {it.type === 'maquinaria' ? 'Maquinaria' : 'Repuesto'}
                    </span>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 2 }}>{it.quantity} {it.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
};

// ─── STATS VIEW ───────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366F1','#0EA5E9','#F59E0B','#22C55E','#EC4899','#F97316','#8B5CF6','#06B6D4','#84CC16','#10B981','#EF4444'];

const StatsView: React.FC<{ imports: ImportRecord[] }> = ({ imports }) => {
  const stats = useMemo(() => {
    // Por estado
    const byStatus = [
      { name: 'Activo',       value: imports.filter(i => i.status === 'activo').length,       color: '#0EA5E9' },
      { name: 'Completado',   value: imports.filter(i => i.status === 'completado').length,   color: '#22C55E' },
      { name: 'Con Problema', value: imports.filter(i => i.status === 'con_problema').length, color: '#EF4444' },
      { name: 'Cancelado',    value: imports.filter(i => i.status === 'cancelado').length,    color: '#9CA3AF' },
    ].filter(s => s.value > 0);

    // Por fase actual (solo activos)
    const byPhase = PHASES.map(p => ({
      name: p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name,
      fullName: p.name,
      count: imports.filter(i => i.currentPhaseIndex === p.index && i.status === 'activo').length,
      color: p.color,
    })).filter(p => p.count > 0);

    // Por Incoterm
    const incotermMap: Record<string, number> = {};
    imports.forEach(i => { incotermMap[i.incoterm] = (incotermMap[i.incoterm] ?? 0) + 1; });
    const byIncoterm = Object.entries(incotermMap).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i] }));

    // Por tipo de transporte
    const transMap: Record<string, number> = {};
    imports.forEach(i => {
      const label = TRANSPORT_OPTIONS.find(o => o.value === i.transportType)?.label ?? i.transportType;
      transMap[label] = (transMap[label] ?? 0) + 1;
    });
    const byTransport = Object.entries(transMap).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i + 3] }));

    // FOB por mes (últimos 6 meses)
    const fobByMonth: Record<string, number> = {};
    imports.forEach(i => {
      const m = i.createdAt ? i.createdAt.slice(0, 7) : null;
      if (m) fobByMonth[m] = (fobByMonth[m] ?? 0) + (i.fobValue || 0);
    });
    const fobMonths = Object.entries(fobByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, fob]) => ({
        month: new Date(month + '-01').toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
        fob: Math.round(fob),
      }));

    // Top proveedores
    const suppMap: Record<string, number> = {};
    imports.forEach(i => { suppMap[i.supplierCity] = (suppMap[i.supplierCity] ?? 0) + 1; });
    const topSuppliers = Object.entries(suppMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([city, count], i) => ({ city, count, color: CHART_COLORS[i] }));

    // Totales financieros
    const totalFOB   = imports.reduce((s, i) => s + (i.fobValue || 0), 0);
    const totalCIF   = imports.reduce((s, i) => s + (i.cifValue || 0), 0);
    const totalTrib  = imports.reduce((s, i) => s + (i.totalTributes || 0), 0);
    const totalCosto = imports.reduce((s, i) => s + (i.totalImportCost || 0), 0);

    return { byStatus, byPhase, byIncoterm, byTransport, fobMonths, topSuppliers, totalFOB, totalCIF, totalTrib, totalCosto };
  }, [imports]);

  if (imports.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center' }}>
        <TrendingUp size={40} style={{ color: 'hsl(var(--border))', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>Sin datos suficientes</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>Crea importaciones para ver las estadísticas</p>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = { padding: '18px 20px' };
  const titleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: 16 };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Totales financieros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total FOB acumulado',      value: fmtUSD(stats.totalFOB),   color: '#6366F1' },
          { label: 'Total CIF (base imponible)', value: fmtUSD(stats.totalCIF),  color: '#0EA5E9' },
          { label: 'Tributos SUNAT pagados',    value: fmtUSD(stats.totalTrib),  color: '#F97316' },
          { label: 'Costo total importaciones', value: fmtUSD(stats.totalCosto), color: '#10B981' },
        ].map((s, i) => (
          <motion.div key={i} className="card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 3 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* FOB por mes */}
        <div className="card" style={cardStyle}>
          <p style={titleStyle}>Valor FOB por Mes (USD)</p>
          {stats.fobMonths.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.fobMonths} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`$ ${Number(v).toLocaleString()}`, 'FOB']} />
                <Bar dataKey="fob" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Sin datos por mes aún</p>}
        </div>

        {/* Por estado - pie */}
        <div className="card" style={cardStyle}>
          <p style={titleStyle}>Distribución por Estado</p>
          {stats.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {stats.byStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Sin datos</p>}
        </div>

        {/* Fases activas */}
        <div className="card" style={cardStyle}>
          <p style={titleStyle}>Importaciones Activas por Fase</p>
          {stats.byPhase.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byPhase} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: any) => [v, 'Importaciones']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.byPhase.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>Ninguna activa en fases intermedias</p>}
        </div>

        {/* Incoterm + Transporte */}
        <div className="card" style={cardStyle}>
          <p style={titleStyle}>Por Incoterm y Tipo de Transporte</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Incoterm */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 10, textTransform: 'uppercase' }}>Incoterm</p>
              {stats.byIncoterm.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-primary))' }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            {/* Transporte */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: 10, textTransform: 'uppercase' }}>Transporte</p>
              {stats.byTransport.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-primary))', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top ciudades proveedoras */}
        {stats.topSuppliers.length > 0 && (
          <div className="card" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <p style={titleStyle}>Top Ciudades Proveedoras (China)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.topSuppliers.map(s => ({ name: s.city, count: s.count, color: s.color }))} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'Importaciones']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.topSuppliers.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const Imports: React.FC = () => {
  const { data: imports, loading, add: addImport, update: updateImport, remove: removeImport } = useFirestore<ImportRecord>('imports');

  const [selected, setSelected] = useState<ImportRecord | null>(null);
  const [pageView, setPageView] = useState<'lista' | 'stats'>('lista');
  const [showNew, setShowNew] = useState(false);
  const [showPhase, setShowPhase] = useState(false);
  const [showExhibition, setShowExhibition] = useState<ImportRecord | null>(null);
  const [showDelete, setShowDelete] = useState<ImportRecord | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [newForm, setNewForm] = useState<NewForm>(emptyNew());
  const [phaseForm, setPhaseForm] = useState<PhaseForm>(emptyPhaseForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync selected with live Firestore data
  useEffect(() => {
    if (selected) {
      const fresh = imports.find(i => i.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [imports]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    return {
      total: imports.length,
      active: imports.filter(i => i.status === 'activo').length,
      inTransit: imports.filter(i => i.currentPhaseIndex === 5 && i.status === 'activo').length,
      inCustoms: imports.filter(i => i.currentPhaseIndex === 7 && i.status === 'activo').length,
      deliveredMonth: imports.filter(i => {
        if (i.status !== 'completado') return false;
        const d = new Date(i.updatedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      totalFOB: imports.reduce((s, i) => s + (i.fobValue || 0), 0),
    };
  }, [imports]);

  // Filtered list
  const filtered = useMemo(() => {
    return imports
      .filter(i => {
        const q = search.toLowerCase();
        const matchSearch = !q
          || i.clientName.toLowerCase().includes(q)
          || i.displayId.toLowerCase().includes(q)
          || (i.clientCompany ?? '').toLowerCase().includes(q)
          || i.supplierName.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'todos' || i.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [imports, search, statusFilter]);

  // Live financials for new form
  const liveFinancials = useMemo(() => calcFin(
    parseFloat(newForm.fobValue) || 0,
    parseFloat(newForm.freightCost) || 0,
    parseFloat(newForm.insuranceCost) || 0,
    parseFloat(newForm.adValoremPct) || 0,
    parseFloat(newForm.customsAgentFee) || 0,
    parseFloat(newForm.warehouseCost) || 0,
    parseFloat(newForm.localTransportCost) || 0,
  ), [newForm]);

  // ── Create import
  const handleCreate = async () => {
    setFormError('');
    if (!newForm.clientName.trim()) { setFormError('El nombre del cliente es requerido'); setTab(0); return; }
    if (!newForm.supplierName.trim()) { setFormError('El nombre del proveedor es requerido'); setTab(0); return; }
    if (items.length === 0) { setFormError('Agrega al menos un producto'); setTab(1); return; }
    const fob = parseFloat(newForm.fobValue);
    if (!fob || fob <= 0) { setFormError('El valor FOB debe ser mayor a 0'); setTab(3); return; }

    setSaving(true);
    try {
      const phases = initPhases();
      phases[0] = { ...phases[0], status: 'en_progreso', startDate: new Date().toISOString().slice(0, 10) };
      const freight = parseFloat(newForm.freightCost) || 0;
      const ins = parseFloat(newForm.insuranceCost) || 0;
      const adPct = parseFloat(newForm.adValoremPct) || 6;
      const agent = parseFloat(newForm.customsAgentFee) || 0;
      const warehouse = parseFloat(newForm.warehouseCost) || 0;
      const localT = parseFloat(newForm.localTransportCost) || 0;
      const fin = calcFin(fob, freight, ins, adPct, agent, warehouse, localT);

      await addImport({
        displayId: genDisplayId(imports.length),
        clientName: newForm.clientName.trim(),
        clientCompany: newForm.clientCompany.trim() || undefined,
        clientPhone: newForm.clientPhone.trim() || undefined,
        clientEmail: newForm.clientEmail.trim() || undefined,
        supplierName: newForm.supplierName.trim(),
        supplierCity: newForm.supplierCity,
        supplierContact: newForm.supplierContact.trim() || undefined,
        items,
        incoterm: newForm.incoterm,
        transportType: newForm.transportType,
        freightForwarder: newForm.freightForwarder.trim() || undefined,
        customsAgent: newForm.customsAgent.trim() || undefined,
        trackingNumber: undefined,
        blNumber: undefined,
        duaNumber: undefined,
        sunatChannel: undefined,
        fobValue: fob,
        freightCost: freight,
        insuranceCost: ins,
        cifValue: fin.cif,
        adValoremPct: adPct,
        adValorem: fin.adValorem,
        igv: fin.igv,
        ipm: fin.ipm,
        totalTributes: fin.totalTributes,
        customsAgentFee: agent,
        warehouseCost: warehouse,
        localTransportCost: localT,
        totalImportCost: fin.totalImportCost,
        estimatedDeparture: newForm.estimatedDeparture || undefined,
        estimatedArrival: newForm.estimatedArrival || undefined,
        actualArrival: undefined,
        expectedDelivery: newForm.expectedDelivery || undefined,
        currentPhaseIndex: 0,
        status: 'activo',
        phases,
        notes: newForm.notes.trim() || undefined,
      } as Omit<ImportRecord, 'id'>);

      setShowNew(false);
      setNewForm(emptyNew());
      setItems([]);
      setTab(0);
      setFormError('');
    } catch (e) {
      console.error(e);
      setFormError('Error al crear la importación. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Update phase
  const handlePhaseUpdate = async () => {
    if (!selected) return;
    setFormError('');
    setSaving(true);
    try {
      const updatedPhases: ImportPhaseRecord[] = (selected.phases ?? initPhases()).map((p) => {
        if (p.phaseIndex !== selected.currentPhaseIndex) return p;
        const newDocs = phaseForm.docName && phaseForm.docUrl
          ? [...(p.documents ?? []), { id: Date.now().toString(), name: phaseForm.docName, type: phaseForm.docType as any, url: phaseForm.docUrl, uploadedAt: new Date().toISOString() }]
          : (p.documents ?? []);
        return {
          ...p,
          status: phaseForm.status,
          notes: phaseForm.notes || p.notes,
          startDate: phaseForm.startDate || p.startDate,
          completedDate: phaseForm.status === 'completado' ? (phaseForm.completedDate || new Date().toISOString().slice(0, 10)) : p.completedDate,
          documents: newDocs,
        };
      });

      let nextPhase = selected.currentPhaseIndex;
      let newStatus: ImportRecord['status'] = selected.status;

      if (phaseForm.status === 'completado') {
        if (selected.currentPhaseIndex < 10) {
          nextPhase = selected.currentPhaseIndex + 1;
          updatedPhases[nextPhase] = { ...updatedPhases[nextPhase], status: 'en_progreso', startDate: new Date().toISOString().slice(0, 10) };
          newStatus = 'activo';
        } else {
          newStatus = 'completado';
        }
      } else if (phaseForm.status === 'con_problema') {
        newStatus = 'con_problema';
      } else {
        newStatus = 'activo';
      }

      const extra: Partial<ImportRecord> = {};
      if (phaseForm.blNumber) extra.blNumber = phaseForm.blNumber;
      if (phaseForm.trackingNumber) extra.trackingNumber = phaseForm.trackingNumber;
      if (phaseForm.duaNumber) extra.duaNumber = phaseForm.duaNumber;
      if (phaseForm.actualArrival) extra.actualArrival = phaseForm.actualArrival;
      if (phaseForm.sunatChannel) extra.sunatChannel = phaseForm.sunatChannel as any;

      await updateImport(selected.id, { phases: updatedPhases, currentPhaseIndex: nextPhase, status: newStatus, ...extra });
      setShowPhase(false);
      setPhaseForm(emptyPhaseForm());
    } catch (e) {
      console.error(e);
      setFormError('Error al actualizar la fase.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete
  const handleDelete = async () => {
    if (!showDelete) return;
    setDeletingId(showDelete.id);
    try {
      await removeImport(showDelete.id);
      if (selected?.id === showDelete.id) setSelected(null);
      setShowDelete(null);
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  // Item helpers
  const addItem = () => setItems(p => [...p, { name: '', description: '', quantity: 1, unit: 'Unidad', unitPrice: 0, type: 'maquinaria' }]);
  const updateItem = (i: number, f: keyof ImportItem, v: any) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));

  // ── RENDER

  if (selected) {
    return (
      <>
        <DetailView
          imp={selected}
          onBack={() => setSelected(null)}
          onUpdatePhase={() => { setPhaseForm(emptyPhaseForm()); setShowPhase(true); }}
          onExhibit={() => setShowExhibition(selected)}
          onDelete={() => setShowDelete(selected)}
        />
        <AnimatePresence>
          {showPhase && (
            <PhaseUpdateModal
              imp={selected}
              form={phaseForm}
              setForm={setPhaseForm}
              saving={saving}
              error={formError}
              onClose={() => { setShowPhase(false); setFormError(''); }}
              onSubmit={handlePhaseUpdate}
            />
          )}
          {showExhibition && <ExhibitionModal imp={showExhibition} onClose={() => setShowExhibition(null)} />}
          {showDelete && (
            <Overlay onClose={() => setShowDelete(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 28, width: 400 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Eliminar Importación</h3>
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginBottom: 20 }}>
                  ¿Eliminar <strong>{showDelete.displayId}</strong>? Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-outline" onClick={() => setShowDelete(null)}>Cancelar</button>
                  <button onClick={handleDelete} disabled={!!deletingId}
                    style={{ padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {deletingId ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </motion.div>
            </Overlay>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ship size={22} style={{ color: '#0EA5E9' }} /> Importaciones China → Perú
          </h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Seguimiento completo del proceso de importación — desde la solicitud del cliente hasta la entrega
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Vista toggle */}
          <div style={{ display: 'flex', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {(['lista', 'stats'] as const).map(v => (
              <button key={v} onClick={() => setPageView(v)}
                style={{ padding: '7px 14px', background: pageView === v ? 'hsl(var(--primary))' : 'transparent', color: pageView === v ? '#fff' : 'hsl(var(--text-secondary))', border: 'none', fontSize: 13, fontWeight: pageView === v ? 600 : 400, cursor: 'pointer', transition: 'all 0.12s' }}>
                {v === 'lista' ? 'Lista' : 'Estadísticas'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => { setShowNew(true); setTab(0); setNewForm(emptyNew()); setItems([]); setFormError(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nueva Importación
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Importaciones" value={kpis.total} color="#6366F1" icon={<Boxes size={20} />} />
        <StatCard label="Activas en proceso" value={kpis.active} color="#F59E0B" icon={<Clock size={20} />} />
        <StatCard label="En Tránsito (mar/aire)" value={kpis.inTransit} color="#0EA5E9" icon={<Ship size={20} />} />
        <StatCard label="En Aduana SUNAT" value={kpis.inCustoms} color="#F97316" icon={<Building2 size={20} />} />
        <StatCard label="Entregadas (este mes)" value={kpis.deliveredMonth} color="#22C55E" icon={<CheckCircle2 size={20} />} />
        <StatCard label="Valor Total FOB" value={fmtUSD(kpis.totalFOB)} color="#8B5CF6" icon={<TrendingUp size={20} />} />
      </div>

      {/* Stats view */}
      {pageView === 'stats' && <StatsView imports={imports} />}

      {/* Filters + List — only in list view */}
      {pageView === 'lista' && <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, código, proveedor..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'hsl(var(--bg-card))', color: 'hsl(var(--text-primary))', boxSizing: 'border-box' }} />
        </div>
        {(['todos', 'activo', 'con_problema', 'completado', 'cancelado'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500, border: '1px solid', borderColor: statusFilter === s ? 'hsl(var(--primary))' : 'hsl(var(--border))', background: statusFilter === s ? 'hsl(var(--primary))' : 'transparent', color: statusFilter === s ? '#fff' : 'hsl(var(--text-secondary))', cursor: 'pointer', transition: 'all 0.12s' }}>
            {s === 'todos' ? 'Todos' : s === 'activo' ? 'Activos' : s === 'con_problema' ? 'Con Problema' : s === 'completado' ? 'Completados' : 'Cancelados'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'hsl(var(--text-secondary))' }}>
          <Ship size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p>Cargando importaciones...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <Ship size={40} style={{ color: 'hsl(var(--border))', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
            {search || statusFilter !== 'todos' ? 'Sin resultados para tu búsqueda' : 'No hay importaciones registradas'}
          </p>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            {search || statusFilter !== 'todos' ? 'Prueba con otros filtros' : 'Crea la primera importación con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {filtered.map(imp => (
              <ImportCard key={imp.id} imp={imp}
                onClick={() => setSelected(imp)}
                onExhibit={() => setShowExhibition(imp)}
                onDelete={() => setShowDelete(imp)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      </>}

      {/* Modals */}
      <AnimatePresence>
        {showNew && (
          <NewImportModal
            form={newForm} setForm={setNewForm}
            items={items} addItem={addItem} updateItem={updateItem} removeItem={removeItem}
            liveFinancials={liveFinancials}
            tab={tab} setTab={setTab}
            saving={saving} error={formError}
            onClose={() => { setShowNew(false); setFormError(''); }}
            onSubmit={handleCreate}
          />
        )}
        {showExhibition && <ExhibitionModal imp={showExhibition} onClose={() => setShowExhibition(null)} />}
        {showDelete && (
          <Overlay onClose={() => setShowDelete(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 28, width: 400 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Eliminar Importación</h3>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginBottom: 20 }}>
                ¿Eliminar <strong>{showDelete.displayId}</strong>? Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-outline" onClick={() => setShowDelete(null)}>Cancelar</button>
                <button onClick={handleDelete} disabled={!!deletingId}
                  style={{ padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {deletingId ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Imports;
