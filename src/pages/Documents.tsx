
import React, { useState, useRef } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  Upload,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Globe,
  BookOpen,
  FileCheck,
  Gavel,
  CloudUpload,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../firebase';
import { useFirestore } from '../hooks/useFirestore';

/* ─── Types ──────────────────────────────────────────────────── */
interface DocRecord {
  id: string;
  title: string;
  category: string;
  fileName: string;
  size: string;
  date: string;
  status: 'Verificado' | 'Pendiente' | 'Expirado';
  url: string;
  storagePath: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'all',        label: 'Todos',           icon: FileText,  color: '#6B7C93' },
  { id: 'manual',     label: 'Manuales',         icon: BookOpen,  color: '#0072CC' },
  { id: 'import',     label: 'Importación',      icon: Globe,     color: '#0ea5e9' },
  { id: 'spec',       label: 'Fichas Técnicas',  icon: FileCheck, color: '#10b981' },
  { id: 'cert',       label: 'Certificados',     icon: ShieldCheck, color: '#f59e0b' },
  { id: 'legal',      label: 'Legal',            icon: Gavel,     color: '#8b5cf6' },
] as const;

const STATUSES = ['Verificado', 'Pendiente', 'Expirado'] as const;

const statusStyle = (s: string) => ({
  'Verificado': { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  'Pendiente':  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  'Expirado':   { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
}[s] ?? { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' });

const formatBytes = (bytes: number) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const catMeta = (id: string) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];

/* ─── Shared UI ──────────────────────────────────────────────── */
const Overlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div
    style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    onClick={onClose}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

const modalBox: React.CSSProperties = {
  background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))',
  borderRadius: 10, width: '100%', maxWidth: 520,
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

/* ═══════════════════════════════════════════════════════════════ */
const Documents: React.FC = () => {
  const { data: docs, loading, add: addDoc, remove: removeDoc } = useFirestore<DocRecord>('documents');

  /* ui state */
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch]       = useState('');
  const [uploadOpen, setUploadOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocRecord | null>(null);

  /* upload form state */
  const [file, setFile]           = useState<File | null>(null);
  const [title, setTitle]         = useState('');
  const [category, setCategory]   = useState('manual');
  const [status, setStatus]       = useState<DocRecord['status']>('Pendiente');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  /* filtered docs */
  const filtered = docs.filter(d =>
    (catFilter === 'all' || d.category === catFilter) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) ||
     d.fileName?.toLowerCase().includes(search.toLowerCase()))
  );

  /* stats */
  const stats = [
    { label: 'Manuales',        count: docs.filter(d => d.category === 'manual').length,  icon: BookOpen,   color: '#0072CC' },
    { label: 'Importación',     count: docs.filter(d => d.category === 'import').length,  icon: Globe,      color: '#0ea5e9' },
    { label: 'Certificados',    count: docs.filter(d => d.category === 'cert').length,    icon: ShieldCheck,color: '#f59e0b' },
    { label: 'Docs Verificados',count: docs.filter(d => d.status === 'Verificado').length,icon: CheckCircle2,color:'#059669' },
  ];

  /* ── upload ── */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file)          { setUploadError('Selecciona un archivo.'); return; }
    if (!title.trim())  { setUploadError('Ingresa un nombre para el documento.'); return; }

    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      const storagePath = `documents/${Date.now()}_${file.name}`;
      const storageRef  = ref(storage, storagePath);
      const uploadTask  = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve,
        );
      });

      const url = await getDownloadURL(uploadTask.snapshot.ref);

      await addDoc({
        title,
        category,
        status,
        fileName:    file.name,
        size:        formatBytes(file.size),
        date:        new Date().toISOString().split('T')[0],
        url,
        storagePath,
      } as Omit<DocRecord, 'id'>);

      /* reset */
      setFile(null); setTitle(''); setCategory('manual'); setStatus('Pendiente');
      setUploadProgress(0); setUploadOpen(false);
    } catch {
      setUploadError('Error al subir el archivo. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.storagePath) {
        await deleteObject(ref(storage, deleteTarget.storagePath));
      }
      await removeDoc(deleteTarget.id);
    } catch { /* silently fail */ }
    finally { setDeleteTarget(null); }
  };

  const resetUpload = () => {
    setUploadOpen(false); setFile(null); setTitle('');
    setCategory('manual'); setStatus('Pendiente');
    setUploadError(''); setUploadProgress(0);
  };

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Documentos</h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            Manuales, certificados, fichas técnicas y registros de importación.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setUploadOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Upload size={15} /> Subir Documento
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: `${s.color}14`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={18} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', fontWeight: 500, marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-secondary))' }} />
          <input type="text" placeholder="Buscar por nombre o archivo..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, height: 32, width: '100%', fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Filter size={13} style={{ color: 'hsl(var(--text-secondary))' }} />
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCatFilter(cat.id)}
              style={{
                padding: '4px 11px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: '1px solid',
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

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'hsl(var(--bg-main))', borderBottom: '1px solid hsl(var(--border))', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px' }}>Nombre del Documento</th>
                <th style={{ padding: '10px 16px' }}>Categoría</th>
                <th style={{ padding: '10px 16px' }}>Tamaño</th>
                <th style={{ padding: '10px 16px' }}>Fecha</th>
                <th style={{ padding: '10px 16px' }}>Estado</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: 13 }}>Cargando documentos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <FileText size={32} style={{ color: 'hsl(var(--border))' }} />
                      <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
                        {search || catFilter !== 'all' ? 'No se encontraron documentos.' : 'Aún no hay documentos. ¡Sube el primero!'}
                      </p>
                      {!search && catFilter === 'all' && (
                        <button className="btn-primary" onClick={() => setUploadOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px' }}>
                          <Upload size={13} /> Subir Documento
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(doc => {
                const meta = catMeta(doc.category);
                const ss   = statusStyle(doc.status);
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid hsl(var(--border))', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {/* Name */}
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 6, flexShrink: 0, background: `${meta.color}14`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={16} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{doc.title}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 1 }}>{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    {/* Category */}
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 4, background: `${meta.color}14`, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    {/* Size */}
                    <td style={{ padding: '11px 16px', color: 'hsl(var(--text-secondary))' }}>{doc.size}</td>
                    {/* Date */}
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(var(--text-secondary))' }}>
                        <Clock size={13} /> {doc.date}
                      </div>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                        {doc.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <a
                          href={doc.url} target="_blank" rel="noreferrer"
                          title="Ver archivo"
                          style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                        >
                          <Eye size={14} />
                        </a>
                        <a
                          href={doc.url} download={doc.fileName}
                          title="Descargar"
                          style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid #BFDBFE', background: '#EBF5FF', color: '#0072CC', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                        >
                          <Download size={14} />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(doc)}
                          title="Eliminar"
                          style={{ padding: '5px 7px', borderRadius: 4, border: '1px solid #FECACA', background: 'transparent', color: '#E11D48', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
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

      {/* ── UPLOAD MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {uploadOpen && (
          <Overlay onClose={resetUpload}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} style={modalBox}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Subir Documento</h3>
                <button onClick={resetUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleUpload} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${file ? '#0072CC' : 'hsl(var(--border))'}`,
                    borderRadius: 8, padding: '28px 20px',
                    textAlign: 'center', cursor: 'pointer',
                    background: file ? '#EBF5FF' : 'hsl(var(--bg-main))',
                    transition: 'all 0.15s',
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); }
                  }}
                >
                  <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); } }} />
                  <CloudUpload size={28} style={{ color: file ? '#0072CC' : 'hsl(var(--text-secondary))', margin: '0 auto 10px' }} />
                  {file ? (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0072CC' }}>{file.name}</p>
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 3 }}>{formatBytes(file.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-primary))' }}>Arrastra un archivo aquí o <span style={{ color: '#0072CC', textDecoration: 'underline' }}>selecciónalo</span></p>
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>PDF, DOC, XLSX, imágenes — máx. 20 MB</p>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>Nombre del documento *</label>
                  <input type="text" placeholder="Ej: Manual Bordadora XL-200" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 36 }} />
                </div>

                {/* Category + Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 500 }}>Categoría</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} style={{ height: 36 }}>
                      {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 500 }}>Estado</label>
                    <select value={status} onChange={e => setStatus(e.target.value as DocRecord['status'])} style={{ height: 36 }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Progress bar */}
                {uploading && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'hsl(var(--text-secondary))', marginBottom: 6 }}>
                      <span>Subiendo archivo...</span>
                      <span style={{ fontWeight: 600, color: '#0072CC' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'hsl(var(--border))', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: `${uploadProgress}%` }}
                        style={{ height: '100%', background: '#0072CC', borderRadius: 4, transition: 'width 0.2s' }}
                      />
                    </div>
                  </div>
                )}

                {/* Error */}
                {uploadError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontSize: 13 }}>
                    <AlertCircle size={14} /> {uploadError}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid hsl(var(--border))', marginTop: 4 }}>
                  <button type="button" className="btn-outline" onClick={resetUpload} disabled={uploading}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={uploading || !file} style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {uploading ? (
                      <><UploadSpinner /> Subiendo {uploadProgress}%</>
                    ) : (
                      <><Upload size={14} /> Subir Documento</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ───────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <Overlay onClose={() => setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} style={{ ...modalBox, maxWidth: 400 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#E11D48' }}>Eliminar Documento</h3>
                <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex' }}><X size={18} /></button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'hsl(var(--text-primary))', lineHeight: 1.6 }}>
                  ¿Eliminar <strong>"{deleteTarget.title}"</strong>? El archivo se borrará permanentemente del servidor.
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

/* ─── Spinner ────────────────────────────────────────────────── */
const UploadSpinner = () => (
  <div style={{
    width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  }} />
);

export default Documents;
