
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { db, secondaryAuth } from '../firebase';
import { useAuth, type UserRole } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCog, Shield, ShoppingBag, RefreshCw, UserPlus, X, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserRecord {
  uid:       string;
  email:     string;
  role:      UserRole;
  displayName?: string;
  createdAt: { seconds: number } | null;
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: React.FC<{ size?: number }> }> = {
  admin: {
    label: 'Administrador',
    color: 'hsl(207 89% 35%)',
    bg:    'hsl(207 89% 93%)',
    icon:  Shield,
  },
  vendedor: {
    label: 'Vendedor',
    color: 'hsl(142 60% 28%)',
    bg:    'hsl(142 60% 92%)',
    icon:  ShoppingBag,
  },
};

const EMPTY_FORM = { displayName: '', email: '', password: '', confirmPassword: '', role: 'vendedor' as UserRole };

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
      {label}{required && <span style={{ color: '#E11D48', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const Users: React.FC = () => {
  const { user: currentUser, role: currentRole } = useAuth();
  const [users,      setUsers]      = useState<UserRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState<string | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [showPwd,    setShowPwd]    = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [formError,  setFormError]  = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRecord));
      setUsers(list.sort((a, b) => a.email.localeCompare(b.email)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (uid: string, newRole: UserRole) => {
    if (uid === currentUser?.uid) return;
    setSaving(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } finally {
      setSaving(null);
    }
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const createUser = async () => {
    setFormError('');
    if (!form.displayName.trim()) return setFormError('El nombre es obligatorio.');
    if (!form.email.trim())       return setFormError('El email es obligatorio.');
    if (form.password.length < 6) return setFormError('La contraseña debe tener al menos 6 caracteres.');
    if (form.password !== form.confirmPassword) return setFormError('Las contraseñas no coinciden.');

    setCreating(true);
    try {
      // Create in Firebase Auth using the secondary instance (admin stays logged in)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), form.password);
      await updateProfile(cred.user, { displayName: form.displayName.trim() });

      // Create Firestore user doc
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid:         cred.user.uid,
        email:       form.email.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        role:        form.role,
        createdAt:   serverTimestamp(),
      });

      // Sign out from secondary app so it doesn't hold a session
      await signOut(secondaryAuth);

      setSuccessMsg(`Usuario "${form.displayName.trim()}" creado correctamente como ${ROLE_CONFIG[form.role].label}.`);
      setForm(EMPTY_FORM);
      await fetchUsers();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/email-already-in-use') setFormError('Este email ya está registrado.');
      else if (code === 'auth/invalid-email')   setFormError('El formato del email no es válido.');
      else setFormError('Error al crear el usuario. Intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  if (currentRole !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Acceso restringido a administradores.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            Gestión de Usuarios
          </h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 4 }}>
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchUsers}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 13, fontWeight: 500,
              background: 'transparent',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius-sm)',
              color: 'hsl(var(--text-secondary))',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button
            onClick={openModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              background: 'hsl(var(--primary))', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            <UserPlus size={15} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Role Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px',
              background: cfg.bg, borderRadius: 8,
              border: `1px solid ${cfg.color}22`,
            }}>
              <Icon size={14} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: cfg.color, margin: 0 }}>{cfg.label}</p>
                <p style={{ fontSize: 11, color: cfg.color, opacity: 0.75, margin: 0 }}>
                  {key === 'admin' ? 'Acceso completo al CRM' : 'Solo Tienda y Clientes'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
            Cargando usuarios...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Usuario', 'Email', 'Rol', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    fontSize: 12, fontWeight: 600,
                    color: 'hsl(var(--text-secondary))',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: 'hsl(var(--bg-main))',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const cfg      = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.vendedor;
                const RoleIcon = cfg.icon;
                const isSelf   = u.uid === currentUser?.uid;
                const isSaving = saving === u.uid;
                const name     = u.displayName || u.email.split('@')[0];

                return (
                  <motion.tr
                    key={u.uid}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      borderBottom: '1px solid hsl(var(--border))',
                      background: isSelf ? 'hsl(var(--accent))' : 'transparent',
                    }}
                  >
                    {/* Avatar + name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: 'hsl(var(--primary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            {name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))', margin: 0 }}>
                            {name}
                            {isSelf && (
                              <span style={{
                                marginLeft: 6, fontSize: 10, padding: '1px 5px',
                                borderRadius: 99, background: 'hsl(var(--primary))', color: '#fff',
                              }}>Tú</span>
                            )}
                          </p>
                          {u.createdAt && (
                            <p style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', margin: 0 }}>
                              Registrado: {new Date(u.createdAt.seconds * 1000).toLocaleDateString('es-PE')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
                      {u.email}
                    </td>

                    {/* Role badge */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 99,
                        background: cfg.bg, color: cfg.color,
                        fontSize: 12, fontWeight: 600,
                      }}>
                        <RoleIcon size={12} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }}>
                      {isSelf ? (
                        <span style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['admin', 'vendedor'] as UserRole[]).map(r => {
                            const rCfg     = ROLE_CONFIG[r];
                            const isActive = u.role === r;
                            return (
                              <button
                                key={r}
                                onClick={() => changeRole(u.uid, r)}
                                disabled={isActive || isSaving}
                                style={{
                                  padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                  borderRadius: 6, cursor: isActive ? 'default' : 'pointer',
                                  border: `1px solid ${isActive ? rCfg.color : 'hsl(var(--border))'}`,
                                  background: isActive ? rCfg.bg : 'transparent',
                                  color: isActive ? rCfg.color : 'hsl(var(--text-secondary))',
                                  opacity: isSaving ? 0.5 : 1,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {isSaving && !isActive ? '...' : rCfg.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 16, padding: '12px 16px',
        background: 'hsl(207 89% 96%)', borderRadius: 8,
        border: '1px solid hsl(207 89% 85%)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <UserCog size={16} style={{ color: 'hsl(207 89% 40%)', marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'hsl(207 89% 40%)', margin: 0 }}>
          Los nuevos usuarios creados desde aquí reciben sus credenciales por el admin.
          Puedes cambiar su rol en cualquier momento. No puedes cambiar tu propio rol.
        </p>
      </div>

      {/* ── CREATE USER MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{   opacity: 0, scale: 0.96, y: 12 }}
              style={{
                background: 'hsl(var(--bg-card))',
                borderRadius: 12, width: '100%', maxWidth: 440,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                overflow: 'hidden',
              }}
            >
              {/* Modal header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid hsl(var(--border))',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'hsl(207 89% 93%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <UserPlus size={16} color="hsl(207 89% 35%)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>Nuevo Usuario</p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-secondary))', margin: 0 }}>Crear cuenta de acceso al CRM</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Success message */}
                {successMsg && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '10px 14px', borderRadius: 8,
                    background: '#ECFDF5', border: '1px solid #6EE7B7',
                  }}>
                    <CheckCircle2 size={16} color="#059669" style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#065F46', margin: 0 }}>{successMsg}</p>
                  </div>
                )}

                {/* Error message */}
                {formError && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '10px 14px', borderRadius: 8,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                  }}>
                    <AlertCircle size={16} color="#DC2626" style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#991B1B', margin: 0 }}>{formError}</p>
                  </div>
                )}

                <Field label="Nombre completo" required>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    style={{ height: 38, fontSize: 13, padding: '0 12px' }}
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{ height: 38, fontSize: 13, padding: '0 12px' }}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Contraseña" required>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        style={{ height: 38, fontSize: 13, padding: '0 36px 0 12px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'hsl(var(--text-secondary))', padding: 2,
                        }}
                      >
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirmar contraseña" required>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Repetir contraseña"
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      style={{ height: 38, fontSize: 13, padding: '0 12px' }}
                    />
                  </Field>
                </div>

                <Field label="Rol">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['vendedor', 'admin'] as UserRole[]).map(r => {
                      const cfg      = ROLE_CONFIG[r];
                      const isActive = form.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, role: r }))}
                          style={{
                            flex: 1, padding: '8px 12px',
                            borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${isActive ? cfg.color : 'hsl(var(--border))'}`,
                            background: isActive ? cfg.bg : 'transparent',
                            color: isActive ? cfg.color : 'hsl(var(--text-secondary))',
                            fontSize: 13, fontWeight: 600,
                            transition: 'all 0.15s',
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>

              {/* Modal footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid hsl(var(--border))',
                display: 'flex', gap: 8, justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '8px 18px', fontSize: 13, fontWeight: 500,
                    background: 'transparent',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    color: 'hsl(var(--text-secondary))',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={createUser}
                  disabled={creating}
                  style={{
                    padding: '8px 20px', fontSize: 13, fontWeight: 600,
                    background: creating ? 'hsl(207 89% 60%)' : 'hsl(var(--primary))',
                    color: '#fff', border: 'none',
                    borderRadius: 'var(--radius-sm)', cursor: creating ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {creating ? 'Creando...' : <><UserPlus size={14} /> Crear Usuario</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
