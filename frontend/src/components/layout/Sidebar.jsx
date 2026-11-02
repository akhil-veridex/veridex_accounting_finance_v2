import React, { useState, useEffect } from 'react';
import { MonogramLogo, ChevronIcon, CollapseIcon } from './Icons';

/**
 * VeriDex primary navigation. Mirrors the prototype's sidebar (navy shell,
 * collapsible groups, 64px collapsed rail) but is driven by the ERP's
 * tab state instead of react-router.
 *
 * groups: [{ id, label, icon, items: [{ id, label, icon }] }]
 */
export default function Sidebar({ groups, activeTab, onSelect, isCollapsed, onToggleCollapse }) {
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    groups.forEach(g => { initial[g.id] = g.items.some(i => i.id === activeTab); });
    return initial;
  });

  // Keep the group that owns the current page open
  useEffect(() => {
    groups.forEach(g => {
      if (g.items.some(i => i.id === activeTab)) {
        setExpanded(prev => (prev[g.id] ? prev : { ...prev, [g.id]: true }));
      }
    });
  }, [activeTab, groups]);

  return (
    <aside className="sidebar" aria-label="Primary Navigation">
      <div className="sidebar-logo">
        <button
          type="button"
          className="sidebar-logo-link"
          title="Veridex One Home"
          onClick={() => onSelect('dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <MonogramLogo />
          <div className="logo-wordmark">
            <span className="logo-wordmark-veri">Veri</span>
            <span className="logo-wordmark-dex">Dex</span>
          </div>
        </button>
      </div>

      <nav className="sidebar-nav">
        {groups.map(group => {
          const visibleItems = group.items.filter(i => !i.hidden);
          if (!visibleItems.length) return null;
          const GroupIcon = group.icon;
          const hasActive = group.items.some(i => i.id === activeTab);
          const isOpen = Boolean(expanded[group.id]) || hasActive;

          return (
            <div className="nav-group" key={group.id}>
              <div
                className={`nav-item parent ${isOpen ? 'expanded' : ''}`}
                title={group.label}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpanded(prev => ({ ...prev, [group.id]: !isOpen }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded(prev => ({ ...prev, [group.id]: !isOpen }));
                  }
                }}
              >
                <span className="nav-icon"><GroupIcon size={18} strokeWidth={1.75} /></span>
                <span className="nav-label">{group.label}</span>
                <ChevronIcon />
              </div>

              <div className={`nav-sub ${isOpen ? 'open' : ''}`}>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                      title={item.label}
                      onClick={e => { e.preventDefault(); onSelect(item.id); }}
                    >
                      <span className="nav-icon"><Icon size={16} strokeWidth={1.75} /></span>
                      <span className="nav-label">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        className="nav-collapse-btn"
        onClick={onToggleCollapse}
        aria-label="Collapse navigation sidebar"
      >
        <CollapseIcon />
        <span className="nav-collapse-text">{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
      </button>
    </aside>
  );
}
