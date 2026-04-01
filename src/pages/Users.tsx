
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, type UserRole } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { UserCog, Shield, ShoppingBag, RefreshCw } from 'lucide-react';

interface UserRecord {
  uid:       string;
  email:     string;
  role:      UserRole;
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

const Users: React.FC = () => {
  const { user: currentUser, role: currentRole } = useAuth();
  const [users,   setUsers]   = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

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
    if (uid === currentUser?.uid) return; // can't demote yourself
    setSaving(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } finally {
      setSaving(null);
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
      </div>

      {/* Role Legend */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
      }}>
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
                const cfg       = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.vendedor;
                const RoleIcon  = cfg.icon;
                const isSelf    = u.uid === currentUser?.uid;
                const isSaving  = saving === u.uid;

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
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'hsl(var(--primary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            {u.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))', margin: 0 }}>
                            {u.email.split('@')[0]}
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
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(207 89% 35%)', margin: '0 0 2px' }}>
            Gestión de roles
          </p>
          <p style={{ fontSize: 12, color: 'hsl(207 89% 40%)', margin: 0 }}>
            Los nuevos usuarios se registran automáticamente con rol <strong>Vendedor</strong> al hacer su primer login.
            Aquí puedes promoverlos a <strong>Administrador</strong> para darles acceso completo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Users;
