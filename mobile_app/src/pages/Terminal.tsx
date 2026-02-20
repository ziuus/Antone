import { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Send, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import api from '../api/client';

interface HistoryEntry {
    command: string;
    stdout: string;
    stderr: string;
    exit_code: number;
    cwd: string;
}

export default function Terminal() {
    const [command, setCommand] = useState('');
    const [cwd, setCwd] = useState('');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [running, setRunning] = useState(false);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [histIdx, setHistIdx] = useState(-1);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const run = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim() || running) return;
        const cmd = command.trim();
        setRunning(true);
        setCommand('');
        setHistIdx(-1);
        setCmdHistory(h => [cmd, ...h.slice(0, 49)]);

        try {
            const res = await api.post('/ide/terminal/run', { command: cmd, cwd });
            const d = res.data.data;
            setHistory(h => [...h, { command: cmd, stdout: d.stdout, stderr: d.stderr, exit_code: d.exit_code, cwd: d.cwd }]);
            setCwd(d.cwd);
        } catch (err: any) {
            setHistory(h => [...h, { command: cmd, stdout: '', stderr: err.response?.data?.detail || 'Request failed', exit_code: 1, cwd }]);
        } finally {
            setRunning(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
            setHistIdx(idx);
            setCommand(cmdHistory[idx] ?? '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const idx = Math.max(histIdx - 1, -1);
            setHistIdx(idx);
            setCommand(idx === -1 ? '' : cmdHistory[idx]);
        }
    };

    const cwdDisplay = cwd || '~';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeUp 0.3s both' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(34,211,165,.15)', border: '1px solid rgba(34,211,165,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TermIcon size={16} style={{ color: '#22d3a5' }} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Terminal</h2>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontFamily: 'monospace' }}>{cwdDisplay}</p>
                    </div>
                </div>
                <button onClick={() => setHistory([])} className="btn btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', gap: '0.3rem' }}>
                    <Trash2 size={13} /> Clear
                </button>
            </div>

            {/* Output — always dark terminal aesthetic, but with a subtle border that adapts */}
            <div style={{
                background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: 14,
                padding: '1rem', minHeight: '55vh', maxHeight: '65vh', overflowY: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: '0.78rem', lineHeight: 1.6,
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
                {history.length === 0 && (
                    <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '4rem' }}>
                        <TermIcon size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                        <p style={{ color: '#9ca3af' }}>Run a command to get started</p>
                        <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#6b7280' }}>Arrow keys for history</p>
                    </div>
                )}
                {history.map((entry, i) => (
                    <div key={i}>
                        {/* Command line */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#818cf8' }}>❯</span>
                            <span style={{ color: '#a5b4fc' }}>{entry.command}</span>
                        </div>
                        {/* stdout */}
                        {entry.stdout && (
                            <pre style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{entry.stdout}</pre>
                        )}
                        {/* stderr */}
                        {entry.stderr && (
                            <pre style={{ margin: 0, color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{entry.stderr}</pre>
                        )}
                        {/* Exit code */}
                        {entry.exit_code !== 0 && (
                            <span style={{ color: '#f87171', fontSize: '0.7rem' }}>exit {entry.exit_code}</span>
                        )}
                    </div>
                ))}
                {running && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af' }}>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Running…</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={run} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 10, padding: '0 0.75rem', transition: 'border-color 0.15s' }}>
                    <ChevronRight size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={command}
                        onChange={e => setCommand(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter command…"
                        disabled={running}
                        style={{
                            flex: 1, background: 'none', border: 'none', outline: 'none',
                            color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.875rem', padding: '0.75rem 0',
                        }}
                        autoFocus
                    />
                </div>
                <button type="submit" disabled={running || !command.trim()} className="btn btn-primary" style={{ padding: '0.75rem 1rem', flexShrink: 0 }}>
                    {running ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
            </form>
        </div>
    );
}
