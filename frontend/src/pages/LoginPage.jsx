import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Building2, Briefcase } from 'lucide-react';

export default function LoginPage({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('alex.controller@harbor-mga.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
    setTimeout(() => {
      login(roleEmail, 'password123');
    }, 50);
  };

  return (
    <div className="auth-wrap">
      {errorMsg && <div className="veridex-toast veridex-toast-error">{errorMsg}</div>}

      <div className="auth-panel">
        {/* Left brand panel */}
        <div className="auth-left">
          <div className="auth-left-content">
            <svg width="68" height="68" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="authVdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#1e232b" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <path d="M7 10L13 22L17 14" stroke="url(#authVdGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 10H21C23.76 10 26 12.24 26 15C26 17.76 23.76 20 21 20H17V10Z" stroke="url(#authVdGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#FFFFFF' }}>Veridex</span>
                <span style={{ color: 'var(--color-brand)', marginLeft: '8px' }}>One</span>
              </div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', letterSpacing: '2px', marginTop: '4px' }}>
                FINANCE &amp; ACCOUNTING PROTOTYPE (LOCAL STORAGE)
              </div>
            </div>
            <div className="auth-left-tagline" style={{ fontSize: '12px', lineHeight: 1.5 }}>
              General Ledger · Billing · Treasury · Commissions · Finance Close
            </div>
          </div>
        </div>

        {/* Right sign-in form */}
        <div className="auth-right">
          <div className="auth-title" style={{ textAlign: 'left', fontSize: '24px', marginBottom: '4px' }}>
            Sign in to your Workspace
          </div>
          <div className="auth-subtitle" style={{ textAlign: 'left', fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>
            100% Offline LocalStorage Prototype — No DB or server required.
          </div>

          {/* Quick 1-Click Role Login Shortcuts */}
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick 1-Click Persona Sign-In:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('alex.controller@harbor-mga.com')}
                style={{ padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '11px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              >
                <ShieldCheck size={14} color="#f97316" />
                <span>Harbor MGA</span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>Controller</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('carrier@summit-mutual.com')}
                style={{ padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '11px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              >
                <Building2 size={14} color="#3b82f6" />
                <span>Summit Mutual</span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>Carrier</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('broker@brightline.com')}
                style={{ padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '11px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              >
                <Briefcase size={14} color="#a855f7" />
                <span>Brightline</span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>Broker</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="email">Work Email *</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="controller@yourcompany.com"
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label" htmlFor="password">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--color-muted)',
                    display: 'flex'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={submitting} style={{ marginTop: '16px' }}>
              {submitting ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>

          <button type="button" className="auth-link" onClick={onSwitchToRegister}>
            Need a new organization? Onboard New Tenant
          </button>
        </div>
      </div>
    </div>
  );
}
