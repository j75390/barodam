import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface DialogSpec {
  title: string;
  body?: ReactNode;
  ok?: string;
  cancel?: string | null;
  /** custom content; receives close(result) */
  render?: (close: (v: boolean) => void) => ReactNode;
}

interface UI {
  toast(msg: string): void;
  confirm(title: string, body: ReactNode, ok?: string, cancel?: string): Promise<boolean>;
  info(title: string, body: ReactNode): Promise<boolean>;
  open(spec: DialogSpec): Promise<boolean>;
  close(): void;
}

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToast] = useState<string | null>(null);
  const [dlg, setDlg] = useState<(DialogSpec & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<number>();
  const boxRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 1900);
  }, []);
  const open = useCallback((spec: DialogSpec) => new Promise<boolean>((resolve) => setDlg({ ...spec, resolve })), []);
  const finish = useCallback((v: boolean) => {
    setDlg((d) => {
      d?.resolve(v);
      return null;
    });
  }, []);
  const ui: UI = {
    toast,
    open,
    close: () => finish(false),
    confirm: (title, body, ok = '확인', cancel = '취소') => open({ title, body, ok, cancel }),
    info: (title, body) => open({ title, body, ok: '확인', cancel: null }),
  };

  useEffect(() => {
    if (!dlg) return;
    const prev = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLElement>('input,textarea,select,button.primary,button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [dlg, finish]);

  return (
    <Ctx.Provider value={ui}>
      {children}
      {dlg && (
        <div id="dlg">
          <div className="scrim" onClick={(e) => e.target === e.currentTarget && finish(false)}>
            <div className="dbox" role="dialog" aria-modal="true" aria-label={dlg.title} ref={boxRef}>
              {dlg.render ? (
                dlg.render(finish)
              ) : (
                <>
                  <h3>{dlg.title}</h3>
                  {typeof dlg.body === 'string' ? <p>{dlg.body}</p> : dlg.body}
                  <div className="ctas" style={dlg.cancel === null ? { gridTemplateColumns: '1fr' } : undefined}>
                    {dlg.cancel !== null && (
                      <button className="btn" onClick={() => finish(false)}>
                        {dlg.cancel ?? '취소'}
                      </button>
                    )}
                    <button className="btn primary" onClick={() => finish(true)}>
                      {dlg.ok ?? '확인'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useUI(): UI {
  const u = useContext(Ctx);
  if (!u) throw new Error('useUI must be used inside UIProvider');
  return u;
}
