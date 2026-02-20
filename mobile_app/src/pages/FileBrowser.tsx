import { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ArrowLeft, RefreshCw, Code, Save, X } from 'lucide-react';
import api from '../api/client';

interface Entry {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number | null;
    extension: string | null;
}

const EXT_COLORS: Record<string, string> = {
    ts: '#3b82f6', tsx: '#3b82f6', js: '#f59e0b', jsx: '#f59e0b',
    py: '#22d3a5', rs: '#f97316', go: '#06b6d4', json: '#a78bfa',
    md: '#94a3b8', css: '#ec4899', html: '#f97316', sh: '#22d3a5',
    yaml: '#a78bfa', yml: '#a78bfa', toml: '#f97316', env: '#fbbf24',
};

function formatSize(bytes: number | null): string {
    if (bytes === null) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function FileBrowser() {
    const [path, setPath] = useState('');
    const [workspace, setWorkspace] = useState('');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [editContent, setEditContent] = useState<string | null>(null);
    const [openFile, setOpenFile] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => { loadDir(''); }, []);

    const loadDir = async (p: string) => {
        setLoading(true);
        setFileContent(null);
        setEditContent(null);
        setOpenFile(null);
        setEditing(false);
        try {
            const res = await api.get('/ide/files', { params: { path: p } });
            setEntries(res.data.data.entries);
            setPath(p);
            if (res.data.data.workspace) setWorkspace(res.data.data.workspace);
        } finally {
            setLoading(false);
        }
    };

    const openFileView = async (entry: Entry) => {
        if (entry.type === 'directory') { loadDir(entry.path); return; }
        setLoading(true);
        try {
            const res = await api.get('/ide/files/read', { params: { path: entry.path } });
            setFileContent(res.data.data.content);
            setEditContent(res.data.data.content);
            setOpenFile(entry.path);
        } catch (e: any) {
            setFileContent(`Error: ${e.response?.data?.detail || 'Could not read file'}`);
            setOpenFile(entry.path);
        } finally {
            setLoading(false);
        }
    };

    const saveFile = async () => {
        if (!openFile || editContent === null) return;
        setSaving(true);
        try {
            await api.post('/ide/files/write', { path: openFile, content: editContent });
            setFileContent(editContent);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const goUp = () => {
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        loadDir(parts.join('/'));
    };


    if (openFile !== null) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', animation: 'fadeUp 0.25s both' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <button onClick={() => { setOpenFile(null); setFileContent(null); setEditing(false); }} className="btn" style={{ padding: '0.45rem', borderRadius: 10 }}>
                        <ArrowLeft size={16} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {openFile.split('/').pop()}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openFile}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {!editing ? (
                            <button onClick={() => setEditing(true)} className="btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', gap: '0.3rem' }}>
                                <Code size={13} /> Edit
                            </button>
                        ) : (
                            <>
                                <button onClick={() => { setEditing(false); setEditContent(fileContent); }} className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}>
                                    <X size={14} />
                                </button>
                                <button onClick={saveFile} disabled={saving} className="btn btn-primary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', gap: '0.3rem' }}>
                                    {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} Save
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                {editing ? (
                    <textarea
                        value={editContent ?? ''}
                        onChange={e => setEditContent(e.target.value)}
                        style={{
                            width: '100%', minHeight: '65vh',
                            background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 12,
                            padding: '1rem', color: 'var(--code-text)',
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: '0.775rem', lineHeight: 1.7,
                            resize: 'vertical', outline: 'none',
                        }}
                        spellCheck={false}
                    />
                ) : (
                    <div style={{
                        background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 12,
                        padding: '1rem', maxHeight: '70vh', overflowY: 'auto',
                    }}>
                        <pre style={{
                            margin: 0, color: 'var(--code-text)',
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: '0.775rem', lineHeight: 1.7,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        }}>{fileContent}</pre>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeUp 0.3s both' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Folder size={16} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Files</h2>
                        <p
                            title={workspace || '/workspace'}
                            style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'monospace', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                            {workspace ? workspace + (path ? '/' + path : '') : '/' + (path || 'workspace')}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {path && (
                        <button onClick={goUp} className="btn btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', gap: '0.3rem' }}>
                            <ArrowLeft size={13} /> Up
                        </button>
                    )}
                    <button onClick={() => loadDir(path)} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            {path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <button onClick={() => loadDir('')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', padding: '0.1rem 0.2rem' }}>~</button>
                    {path.split('/').filter(Boolean).map((seg, i, arr) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ChevronRight size={11} style={{ color: 'var(--text-3)' }} />
                            <button
                                onClick={() => loadDir(arr.slice(0, i + 1).join('/'))}
                                style={{ background: 'none', border: 'none', color: i === arr.length - 1 ? 'var(--text-1)' : 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', padding: '0.1rem 0.2rem', fontWeight: i === arr.length - 1 ? 600 : 400 }}
                            >{seg}</button>
                        </span>
                    ))}
                </div>
            )}

            {/* File list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto' }} />
                    </div>
                )}
                {!loading && entries.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', fontSize: '0.875rem' }}>Empty directory</div>
                )}
                {!loading && entries.map((entry, i) => (
                    <button
                        key={entry.path}
                        onClick={() => openFileView(entry)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.7rem 0.875rem', borderRadius: 10,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            cursor: 'pointer', textAlign: 'left', width: '100%',
                            transition: 'all 0.12s', animation: `fadeUp 0.25s ${i * 0.03}s both`,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
                    >
                        {entry.type === 'directory' ? (
                            <Folder size={17} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        ) : (
                            <File size={17} style={{ color: EXT_COLORS[entry.extension ?? ''] ?? 'var(--text-3)', flexShrink: 0 }} />
                        )}
                        <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)' }}>{entry.name}</span>
                        {entry.size !== null && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', flexShrink: 0 }}>{formatSize(entry.size)}</span>
                        )}
                        <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    </button>
                ))}
            </div>
        </div>
    );
}
