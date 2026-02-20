import { useState, useEffect, useRef } from 'react';
import { Folder, ChevronDown, Check, FolderOpen, RefreshCw } from 'lucide-react';
import api from '../api/client';

interface Workspace {
    name: string;
    path: string;
    is_current: boolean;
}

export default function WorkspacePicker() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [current, setCurrent] = useState<Workspace | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadWorkspaces();
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadWorkspaces = () => {
        api.get('/ide/workspaces').then(res => {
            setWorkspaces(res.data.data.workspaces);
            const cur = res.data.data.workspaces.find((w: any) => w.is_current);
            if (cur) setCurrent(cur);
        }).catch(() => { });
    };

    const switchWs = async (path: string) => {
        if (loading) return;
        setLoading(true);
        try {
            await api.post('/ide/workspaces/switch', { path });
            // Hard reload to refresh all context
            window.location.reload();
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    if (!current) return null;

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                className="btn"
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-1)',
                    maxWidth: 160, cursor: 'pointer', height: '28px'
                }}
            >
                <FolderOpen size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current.name}
                </span>
                <ChevronDown size={12} style={{ color: 'var(--text-3)', opacity: 0.7 }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)',
                    width: '240px', maxHeight: '320px', overflowY: 'auto',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    padding: '0.35rem', zIndex: 100, animation: 'fadeUp 0.15s both'
                }} className="glass-panel">
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', padding: '0.4rem 0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Switch Workspace
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        {workspaces.map(ws => (
                            <button
                                key={ws.path}
                                onClick={() => switchWs(ws.path)}
                                disabled={loading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    width: '100%', padding: '0.5rem 0.6rem',
                                    background: ws.is_current ? 'var(--primary-dim)' : 'transparent',
                                    border: 'none', borderRadius: 6,
                                    cursor: 'pointer', textAlign: 'left',
                                    color: ws.is_current ? 'var(--primary)' : 'var(--text-1)',
                                    transition: 'background 0.1s',
                                    opacity: loading ? 0.5 : 1,
                                }}
                                onMouseEnter={e => !ws.is_current && (e.currentTarget.style.background = 'var(--bg)')}
                                onMouseLeave={e => !ws.is_current && (e.currentTarget.style.background = 'transparent')}
                            >
                                <Folder size={14} style={{ color: ws.is_current ? 'var(--primary)' : 'var(--text-3)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ws.name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
                                        {ws.path}
                                    </div>
                                </div>
                                {ws.is_current ? <Check size={14} style={{ flexShrink: 0 }} /> : null}
                                {loading && ws.path === current.path && <RefreshCw size={14} className="animate-spin" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
