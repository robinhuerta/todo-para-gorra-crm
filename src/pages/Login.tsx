
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 480px',
      background: '#F2F4F8',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ── LEFT PANEL: branding ──────────────────────────── */}
      <div style={{
        background: '#0060B0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', bottom: -120, right: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 36, height: 36, background: '#fff', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0060B0' }}>G</span>
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>GORRA CRM</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Industrial</p>
          </div>
        </div>

        {/* Center text */}
        <div style={{ position: 'relative' }}>
          <h1 style={{
            color: '#fff',
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.25,
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}>
            Gestión industrial<br />en un solo lugar
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.7, maxWidth: 360 }}>
            Administra clientes, inventario, proformas y documentos con una plataforma diseñada para la industria.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32 }}>
            {['CRM 360°', 'Proformas PDF', 'Inventario', 'Kanban', 'Documentos'].map(f => (
              <span key={f} style={{
                padding: '5px 12px', borderRadius: 20,
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12, fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, position: 'relative' }}>
          © 2025 GORRA CRM · Plataforma Industrial
        </p>
      </div>

      {/* ── RIGHT PANEL: form ────────────────────────────── */}
      <div style={{
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '56px 48px',
        borderLeft: '1px solid #E2E8F0',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1E2D3D', marginBottom: 6 }}>
              Iniciar sesión
            </h2>
            <p style={{ fontSize: 13, color: '#6B7C93' }}>
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#1E2D3D' }}>
                Correo electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  style={{
                    position: 'absolute', left: 11, top: '50%',
                    transform: 'translateY(-50%)', color: '#6B7C93',
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 34, height: 40,
                    fontSize: 14, borderRadius: 4,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#1E2D3D',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#0060B0';
                    e.target.style.boxShadow   = '0 0 0 3px rgba(0,96,176,0.15)';
                    e.target.style.background   = '#fff';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow   = 'none';
                    e.target.style.background   = '#F8FAFC';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#1E2D3D' }}>
                  Contraseña
                </label>
                <button
                  type="button"
                  style={{ fontSize: 12, color: '#0060B0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute', left: 11, top: '50%',
                    transform: 'translateY(-50%)', color: '#6B7C93',
                  }}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 34, height: 40,
                    fontSize: 14, borderRadius: 4,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#1E2D3D',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#0060B0';
                    e.target.style.boxShadow   = '0 0 0 3px rgba(0,96,176,0.15)';
                    e.target.style.background   = '#fff';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow   = 'none';
                    e.target.style.background   = '#F8FAFC';
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 6,
                  background: '#FFF1F2', border: '1px solid #FECDD3',
                  color: '#E11D48', fontSize: 13,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: 4,
                height: 42,
                background: isLoading ? '#7AB3DC' : '#0060B0',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#004E93'; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#0060B0'; }}
            >
              {isLoading ? (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <>
                  <LogIn size={16} />
                  Iniciar sesión
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p style={{
            marginTop: 28, fontSize: 12, color: '#94A3B8',
            textAlign: 'center', lineHeight: 1.6,
          }}>
            ¿Sin acceso? Contacta al administrador del sistema.
          </p>
        </motion.div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
