import { safeLink } from '../integrations/chat-model.js';

export function SourceLink({ url, children }) {
  const href = safeLink(url);
  return href ? <a href={href} target="_blank" rel="noreferrer">{children || url}</a> : <span>{children || 'Source link unavailable'}</span>;
}

export default function PolicyDetails({ policy }) {
  if (!policy) return null;
  return (
    <div className="block">
      {policy.classroom_blockers?.map((b) => <div className="note-box warn" key={b.rule}>
        <strong>{b.message}</strong><ul>{b.options?.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>)}
      {policy.permit && <p className="note-box">Event permit: {policy.permit.required ? 'Required' : 'No triggers identified'}.
        {' '}{policy.permit.triggers?.join('; ')} {policy.permit.order_note}</p>}
      {policy.warnings?.map((w) => <p className="note-box" key={w}>{w}</p>)}
      <details className="plan-extra"><summary>Date checks and copy-ready form answers</summary>
        <pre>{JSON.stringify({
          options: policy.options,
          classroom_form_answers: policy.classroom_form_answers,
          required_statements: policy.required_statements,
        }, null, 2)}</pre>
      </details>
      {policy.data_note && <p className="disclaimer">{policy.data_note}</p>}
      {policy.help && <p className="disclaimer">{policy.help}</p>}
      <p className="disclaimer">Teammate-sourced policy guidance; verify current rules with Campus Activities. Room identities and demand are synthetic. This app cannot reserve a room or submit official forms.</p>
      <ul className="sources">{policy.sources?.map((url) => <li key={url}><SourceLink url={url} /></li>)}</ul>
    </div>
  );
}
