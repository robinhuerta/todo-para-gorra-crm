import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Users, Package, FileText, X } from 'lucide-react';

interface Result {
  id: string;
  label: string;
  sub: string;
  category: 'Clientes' | 'Inventario' | 'Proformas';
  path: string;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Clientes:   <Users size={13} />,
  Inventario: <Package size={13} />,
  Proformas:  <FileText size={13} />,
};

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const GlobalSearch: React.FC = () => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const q = normalize(term);

    const [clientSnap, invSnap, profSnap] = await Promise.all([
      getDocs(collection(db, 'clients')),
      getDocs(collection(db, 'inventory')),
      getDocs(collection(db, 'proformas')),
    ]);

    const found: Result[] = [];

    clientSnap.forEach(d => {
      const data = d.data();
      const name = data.name || data.nombre || '';
      const company = data.company || data.empresa || '';
      const email = data.email || '';
      if ([name, company, email].some(f => normalize(f).includes(q))) {
        found.push({
          id: d.id,
          label: name || email,
          sub: company || email,
          category: 'Clientes',
          path: '/clients',
        });
      }
    });

    invSnap.forEach(d => {
      const data = d.data();
      const name = data.name || data.nombre || '';
      const code = data.code || data.codigo || '';
      const category = data.category || '';
      if ([name, code, category].some(f => normalize(f).includes(q))) {
        found.push({
          id: d.id,
          label: name,
          sub: code ? `${code} · ${category}` : category,
          category: 'Inventario',
          path: '/inventory',
        });
      }
    });

    profSnap.forEach(d => {
      const data = d.data();
      const displayId = data.displayId || '';
      const clientName = data.clientName || data.client || '';
      const status = data.status || '';
      if ([displayId, clientName, status].some(f => normalize(f).includes(q))) {
        found.push({
          id: d.id,
          label: displayId || d.id,
          sub: clientName || status,
          category: 'Proformas',
          path: '/proformas',
        });
      }
    });

    setResults(found.slice(0, 12));
    setOpen(true);
    setLoading(false);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    acc[r.category] = [...(acc[r.category] || []), r];
    return acc;
  }, {});

  const handleSelect = (r: Result) => {
    navigate(r.path);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className="topbar-search" style={{ position: 'relative' }}>
      <Search
        size={14}
        style={{
          position: 'absolute', left: 9, top: '50%',
          transform: 'translateY(-50%)',
          color: 'hsl(var(--text-secondary))',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        placeholder="Buscar clientes, productos..."
        style={{ paddingLeft: 30, paddingRight: query ? 28 : 12, height: 32, width: 220, fontSize: 13 }}
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
          style={{
            position: 'absolute', right: 6, top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent', border: 'none',
            padding: 2, color: 'hsl(var(--text-secondary))',
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={13} />
        </button>
      )}

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 300, maxHeight: 360, overflowY: 'auto',
          background: 'hsl(var(--bg-card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 200,
        }}>
          {loading && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
              Buscando...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
              Sin resultados para "{query}"
            </div>
          )}

          {!loading && Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={{
                padding: '6px 12px 4px',
                fontSize: 11, fontWeight: 600,
                color: 'hsl(var(--text-secondary))',
                display: 'flex', alignItems: 'center', gap: 5,
                borderTop: '1px solid hsl(var(--border))',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {CATEGORY_ICON[cat]} {cat}
              </div>
              {items.slice(0, 4).map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 14px',
                    background: 'transparent', border: 'none',
                    borderRadius: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--accent))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-primary))' }}>{r.label}</p>
                  {r.sub && <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{r.sub}</p>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
