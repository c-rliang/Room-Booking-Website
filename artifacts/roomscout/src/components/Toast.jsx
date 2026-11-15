import { useEffect, useRef } from 'react';
import { IconCheck, IconAlert, IconClose } from './Icons.jsx';

export default function Toast({ toast, onDismiss }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => dismissRef.current(), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {toast && (
        <div className={'toast toast-' + (toast.type || 'success')} key={toast.id} data-testid="toast">
          <span className="toast-icon">{toast.type === 'error' ? <IconAlert /> : <IconCheck />}</span>
          <div>
            <p className="toast-title">{toast.title}</p>
            {toast.message && <p className="toast-msg">{toast.message}</p>}
          </div>
          <button className="icon-btn" aria-label="Dismiss notification" onClick={onDismiss}><IconClose width="16" height="16" /></button>
        </div>
      )}
    </div>
  );
}
