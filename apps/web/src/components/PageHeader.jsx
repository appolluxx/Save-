import React from 'react';

export function PageHeader({ eyebrow, title, description, action, className = '' }) {
  return (
    <header className={['page-header page-enter', className].filter(Boolean).join(' ')}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
