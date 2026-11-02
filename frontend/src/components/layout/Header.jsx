import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, LogOut, Building2 } from 'lucide-react';
import { SearchIcon, ChevronIcon } from './Icons';

function initialsOf(user) {
  const a = (user?.first_name || '').trim()[0] || '';
  const b = (user?.last_name || '').trim()[0] || '';
  return (a + b).toUpperCase() || 'U';
}

/**
 * VeriDex top bar: breadcrumb, search, workspace + company switchers,
 * test-data reset and the account menu.
 */
export default function Header({
  breadcrumbs,
  workspace,
  typeLabel,
  onSwitchWorkspace,
  onClearTestData,
  clearing,
  user,
  roles,
  onLogout
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Account';
  const roleLabel = roles?.join(', ') || 'Staff Member';

  return (
    <header className="app-header" role="banner">
      <div className="header-left-zone">
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <span className="breadcrumb-item">VeriDex</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-item">{breadcrumbs.section}</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-item current">{breadcrumbs.page}</span>
        </nav>
      </div>

      <div className="header-search">
        <SearchIcon />
        <input type="text" placeholder="Global search (Ctrl+K)" aria-label="Search platform data" />
      </div>

      <div className="header-actions">
        <div className="v-entity-switcher-wrap">
          <div
            className="v-entity-switch"
            role="button"
            tabIndex={0}
            onClick={onSwitchWorkspace}
            onKeyDown={e => { if (e.key === 'Enter') onSwitchWorkspace(); }}
            title="Switch active organization"
          >
            <div className="v-entity-avatar"><Building2 size={14} /></div>
            <div>
              <div className="v-entity-label">{workspace?.name || 'Select Workspace'}</div>
              <div className="v-entity-sub">{typeLabel}</div>
            </div>
            <ChevronIcon />
          </div>
        </div>

        <button
          type="button"
          className="header-icon-btn"
          onClick={onClearTestData}
          disabled={clearing}
          title="Reset test transactional data for this workspace"
          aria-label="Clear test data"
        >
          <RotateCcw size={16} className={clearing ? 'animate-spin' : ''} />
        </button>

        <div className="v-user-profile-wrap" ref={menuRef}>
          <button
            type="button"
            className="header-avatar-btn"
            onClick={() => setMenuOpen(o => !o)}
            title={`${fullName} (${roleLabel})`}
            aria-label="User Account Menu"
            aria-expanded={menuOpen}
            style={{ background: 'var(--color-brand)' }}
          >
            {initialsOf(user)}
          </button>

          <div className={`v-user-menu ${menuOpen ? 'open' : ''}`}>
            <div className="v-user-menu-header">
              <div className="v-user-menu-avatar" style={{ background: 'var(--color-brand)' }}>
                {initialsOf(user)}
              </div>
              <div className="v-user-menu-info">
                <div className="v-user-menu-name">{fullName}</div>
                <div className="v-user-menu-email">{user?.email}</div>
                <div className="v-user-menu-role">{roleLabel}</div>
              </div>
            </div>
            <div className="v-user-menu-divider"></div>
            <button
              type="button"
              className="v-user-menu-item v-user-menu-logout"
              onClick={() => { setMenuOpen(false); onLogout(); }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
