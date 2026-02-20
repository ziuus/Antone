import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, CheckCircle, Send, RefreshCw, Terminal, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

interface Agent {
    id: string;
    name: string;
    status: string;
    last_active: string;
    current_task: string | null;
    meta: Record<string, any>;
}

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
}

export default function AgentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showSystemLogs, setShowSystemLogs] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { loadAgent(); loadLogs(); }, [id]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

    // Auto-poll when agent is running
    useEffect(() => {
        if (agent?.status === 'running') {
            pollRef.current = setInterval(() => { loadLogs(); loadAgent(); }, 3000);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [agent?.status]);

    const loadAgent = async () => {
        try {
            const res = await api.get(`/agents/${id}`);
            setAgent(res.data.data.agent);
        } catch { navigate('/'); }
        finally { setLoading(false); }
    };

    const loadLogs = async () => {
        try {
            const res = await api.get(`/agents/${id}/logs`);
            setLogs(res.data.data.logs);
        } catch { /* ignore */ }
    };

    const doAction = async (action: string) => {
        setActionLoading(action);
        try {
            await api.post(`/agents/${id}/${action}`);
            await loadAgent();
            await loadLogs();
        } finally { setActionLoading(null); }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        try {
            await api.post(`/agents/${id}/message`, { message });
            setMessage('');
            await loadLogs();
        } finally { setSending(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-3)' }} />
        </div>
    );
    if (!agent) return null;

    const isStopped = agent.status === 'stopped';
    const isRunning = agent.status === 'running';
    const needsApproval = agent.status === 'waiting_approval';

    // Split logs: chat messages vs system events
    const chatLogs = logs.filter(l => l.level === 'user' || l.level === 'agent');
    const systemLogs = logs.filter(l => l.level !== 'user' && l.level !== 'agent');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeUp 0.3s both' }}>
            {/* Back + header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => navigate('/')} className="btn" style={{ padding: '0.45rem', borderRadius: 10, flexShrink: 0 }}>
                    <ArrowLeft size={17} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.name}
                    </h2>
                    <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.id}
                    </p>
                </div>
                <StatusBadge status={agent.status as any} />
            </div>

            {/* Current task */}
            {agent.current_task && (
                <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--primary)', borderRadius: '0 12px 12px 0',
                    padding: '0.75rem 1rem',
                }}>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                        Current Task
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-1)', lineHeight: 1.5 }}>{agent.current_task}</p>
                </div>
            )}

            {/* Meta */}
            {Object.keys(agent.meta).length > 0 && (
                <div className="card" style={{ padding: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.625rem' }}>
                        <Cpu size={13} style={{ color: 'var(--text-3)' }} />
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Details</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                        {Object.entries(agent.meta).map(([k, v]) => (
                            <div key={k}>
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '0.1rem', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>{String(v)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: needsApproval ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                {isStopped && (
                    <button onClick={() => doAction('start')} disabled={!!actionLoading} className="btn btn-primary" style={{ padding: '0.7rem', fontWeight: 600 }}>
                        {actionLoading === 'start' ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                        Start Agent
                    </button>
                )}
                {isRunning && (
                    <button onClick={() => doAction('stop')} disabled={!!actionLoading} className="btn" style={{ padding: '0.7rem', fontWeight: 600, color: 'var(--error)', borderColor: 'rgba(244,63,94,.3)', background: 'rgba(244,63,94,.08)' }}>
                        {actionLoading === 'stop' ? <RefreshCw size={15} className="animate-spin" /> : <Square size={15} />}
                        Stop
                    </button>
                )}
                {needsApproval && (
                    <button onClick={() => doAction('approve')} disabled={!!actionLoading} className="btn" style={{ padding: '0.875rem', fontWeight: 600, color: 'var(--success)', borderColor: 'rgba(34,211,165,.3)', background: 'rgba(34,211,165,.1)', gridColumn: '1/-1' }}>
                        {actionLoading === 'approve' ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                        Approve & Resume
                    </button>
                )}
                <button onClick={() => { loadAgent(); loadLogs(); }} className="btn" style={{ padding: '0.7rem' }}>
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* ── CHAT VIEW ── */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <Send size={13} style={{ color: 'var(--text-3)' }} />
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conversation</p>
                    {isRunning && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', animation: 'pulse 2s infinite' }} />}
                </div>

                {/* Chat bubbles */}
                <div style={{
                    minHeight: 180, maxHeight: 320, overflowY: 'auto',
                    padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem',
                }}>
                    {chatLogs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)', fontSize: '0.8rem' }}>
                            No messages yet. Send a message to start chatting with this agent.
                        </div>
                    )}
                    {chatLogs.map((log, i) => {
                        const isUser = log.level === 'user';
                        // Clean up message prefix if it exists (backend adds [You]: or [Agent]:)
                        const cleanMessage = log.message.replace(/^\[(You|Agent)\]:\s*/i, '');

                        return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '82%',
                                    background: isUser ? 'var(--primary)' : 'var(--surface-2)',
                                    color: isUser ? '#fff' : 'var(--text-1)',
                                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    padding: '0.55rem 0.875rem',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.5,
                                    border: isUser ? 'none' : '1px solid var(--border)',
                                }}>
                                    {cleanMessage}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '0.2rem', padding: '0 0.25rem' }}>
                                    {isUser ? 'You' : agent.name} · {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem' }}>
                    <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder={`Message ${agent.name}…`}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            style={{ flex: 1, fontSize: '0.875rem' }}
                        />
                        <button type="submit" disabled={sending || !message.trim()} className="btn btn-primary" style={{ padding: '0.65rem 1rem', flexShrink: 0 }}>
                            {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                    </form>
                </div>
            </div>

            {/* ── SYSTEM LOG (collapsible) ── */}
            {systemLogs.length > 0 && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <button
                        onClick={() => setShowSystemLogs(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1rem', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: showSystemLogs ? '1px solid var(--border)' : 'none' }}
                    >
                        <Terminal size={13} style={{ color: 'var(--text-3)' }} />
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            System Log <span style={{ fontWeight: 400 }}>({systemLogs.length})</span>
                        </p>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
                            {showSystemLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                    </button>
                    {showSystemLogs && (
                        <div style={{
                            background: 'var(--code-bg)', padding: '0.75rem',
                            maxHeight: '180px', overflowY: 'auto',
                            fontFamily: 'monospace', fontSize: '0.72rem',
                            display: 'flex', flexDirection: 'column', gap: '0.25rem',
                        }}>
                            {systemLogs.map((log, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.6rem', lineHeight: 1.5 }}>
                                    <span style={{ color: '#6b7280', flexShrink: 0 }}>
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span style={{ color: log.level === 'error' ? '#fca5a5' : '#9ca3af' }}>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
