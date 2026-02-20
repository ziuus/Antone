import { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, GitCommit, AlertCircle, CheckCircle, Upload, Download, Play, Loader2 } from 'lucide-react';
import api from '../api/client';

interface GitData {
    branch: string;
    remote: string;
    ahead: number;
    behind: number;
    staged: string[];
    changed: string[];
    untracked: string[];
    is_clean: boolean;
    recent_commits: { hash: string; message: string }[];
}

export default function GitStatus() {
    const [data, setData] = useState<GitData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [runCmd, setRunCmd] = useState('');
    const [running, setRunning] = useState(false);
    const [cmdOutput, setCmdOutput] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/ide/git/status');
            if (res.data.status === 'error') {
                setError(res.data.message);
            } else {
                setData(res.data.data);
            }
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to get git status');
        } finally {
            setLoading(false);
        }
    };

    const runGit = async (cmd: string) => {
        setRunning(true);
        setCmdOutput(null);
        try {
            const res = await api.post('/ide/git/run', { command: cmd });
            const d = res.data.data;
            setCmdOutput((d.output || '') + (d.stderr ? `\n${d.stderr}` : ''));
            await load();
        } catch (e: any) {
            setCmdOutput(`Error: ${e.response?.data?.detail || 'Command failed'}`);
        } finally {
            setRunning(false);
        }
    };

    const quickActions = [
        { label: 'Pull', cmd: 'pull', icon: <Download size={13} /> },
        { label: 'Push', cmd: 'push', icon: <Upload size={13} /> },
        { label: 'Fetch', cmd: 'fetch', icon: <RefreshCw size={13} /> },
        { label: 'Stash', cmd: 'stash', icon: <GitCommit size={13} /> },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeUp 0.3s both' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(163,230,53,.12)', border: '1px solid rgba(163,230,53,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GitBranch size={16} style={{ color: '#a3e635' }} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Git</h2>
                        {data && <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>{data.branch}</p>}
                    </div>
                </div>
                <button onClick={load} disabled={loading} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}><RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}

            {error && (
                <div style={{ background: 'var(--error-dim)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 12, padding: '1rem', color: 'var(--error)', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Branch + sync status */}
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <GitBranch size={14} style={{ color: '#a3e635' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>{data.branch}</span>
                            </div>
                            {data.is_clean ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#22d3a5', fontSize: '0.78rem', fontWeight: 600 }}>
                                    <CheckCircle size={13} /> Clean
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600 }}>
                                    <AlertCircle size={13} /> Changes
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {data.ahead > 0 && (
                                <span style={{ fontSize: '0.78rem', color: '#22d3a5' }}>↑ {data.ahead} ahead</span>
                            )}
                            {data.behind > 0 && (
                                <span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>↓ {data.behind} behind</span>
                            )}
                            {data.ahead === 0 && data.behind === 0 && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Up to date</span>
                            )}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                        {quickActions.map(a => (
                            <button key={a.cmd} onClick={() => runGit(a.cmd)} disabled={running} className="btn" style={{ flexDirection: 'column', gap: '0.3rem', padding: '0.6rem 0.4rem', fontSize: '0.75rem', borderRadius: 10 }}>
                                {running ? <Loader2 size={13} className="animate-spin" /> : a.icon}
                                {a.label}
                            </button>
                        ))}
                    </div>

                    {/* Changed files */}
                    {(data.staged.length > 0 || data.changed.length > 0 || data.untracked.length > 0) && (
                        <div className="card" style={{ padding: '1rem' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Changes</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {data.staged.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#22d3a5', fontWeight: 700, width: 12, flexShrink: 0 }}>S</span>
                                        <span style={{ fontFamily: 'monospace', color: '#22d3a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                                    </div>
                                ))}
                                {data.changed.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 700, width: 12, flexShrink: 0 }}>M</span>
                                        <span style={{ fontFamily: 'monospace', color: '#f59e0b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                                    </div>
                                ))}
                                {data.untracked.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-3)', fontWeight: 700, width: 12, flexShrink: 0 }}>?</span>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent commits */}
                    {data.recent_commits.length > 0 && (
                        <div className="card" style={{ padding: '1rem' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Recent Commits</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {data.recent_commits.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--primary)', flexShrink: 0, marginTop: '0.1rem' }}>{c.hash}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-1)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom git command */}
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Run Git Command</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 0.6rem' }}>
                                <span style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontFamily: 'monospace', flexShrink: 0 }}>git</span>
                                <input
                                    type="text"
                                    value={runCmd}
                                    onChange={e => setRunCmd(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && runGit(runCmd)}
                                    placeholder="pull, push, log…"
                                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.6rem 0' }}
                                />
                            </div>
                            <button onClick={() => runGit(runCmd)} disabled={running || !runCmd.trim()} className="btn btn-primary" style={{ padding: '0.6rem 0.875rem' }}>
                                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            </button>
                        </div>
                        {cmdOutput && (
                            <pre style={{ marginTop: '0.75rem', background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 8, padding: '0.75rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--code-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '150px', overflowY: 'auto' }}>
                                {cmdOutput}
                            </pre>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
