import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTemplates, type Template } from '../lib/templatesApi';

export function TemplatesList() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    listTemplates().then(setTemplates);
  }, []);

  return (
    <div className="rounded-md border border-border-default bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-text-heading">Templates</h1>
        <Link
          to="/templates/new"
          className="h-8 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          New template
        </Link>
      </div>
      <ul className="divide-y divide-border-subtle">
        {templates.map((t) => (
          <li key={t.id}>
            <Link to={`/templates/${t.id}`} className="block py-2.5 text-sm text-text-secondary hover:text-text-primary">
              {t.name} <span className="text-text-faint">— {t.subject || 'no subject'}</span>
            </Link>
          </li>
        ))}
        {templates.length === 0 && <li className="py-2.5 text-sm text-text-muted">No templates yet.</li>}
      </ul>
    </div>
  );
}
