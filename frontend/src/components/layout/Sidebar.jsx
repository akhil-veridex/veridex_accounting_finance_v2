import React, { useState, useEffect } from 'react';
import { MonogramLogo, ChevronIcon, CollapseIcon } from './Icons';

/**
 * VeriDex primary navigation. Mirrors the prototype's sidebar (navy shell,
 * collapsible groups, 64px collapsed rail) but is driven by the ERP's
 * tab state instead of react-router.
 *
 * Supports drag-to-resize/stretch width with localStorage persistence.
 *
 * groups: [{ id, label, icon, items: [{ id, label, icon }] }]
 */
export default function Sidebar({ groups, activeTab, onSelect, isCollapsed, onToggleCollapse }) {
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    groups.forEach(g => { initial[g.id] = g.items.some(i => i.id === activeTab); });
    return initial;
  });

  // Stretchable sidebar width logic & persistence
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('v_sidebar_width');
      if (savedWidth) {
        document.documentElement.style.setProperty('--vdx-sidebar-width-expanded', savedWidth);
        document.documentElement.style.setProperty('--sidebar-width', savedWidth);
      }
    } catch { /* ignore */ }
  }, []);

  const handleMouseDownResize = (e) => {
    e.preventDefault();
    const onMouseMove = (moveEvent) => {
      const minW = 280;
      const maxW = 560;
      const newWidth = Math.max(minW, Math.min(maxW, moveEvent.clientX));
      const widthStr = `${newWidth}px`;
      document.documentElement.style.setProperty('--vdx-sidebar-width-expanded', widthStr);
      document.documentElement.style.setProperty('--sidebar-width', widthStr);
      try {
        localStorage.setItem('v_sidebar_width', widthStr);
      } catch { /* ignore */ }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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

      {/* Drag-to-stretch resize border handle */}
      {!isCollapsed && (
        <div
          className="sidebar-resizer"
          onMouseDown={handleMouseDownResize}
          title="Drag to stretch or shrink sidebar width"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '6px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 50,
            userSelect: 'none'
          }}
        />
      )}
    </aside>
  );
}
