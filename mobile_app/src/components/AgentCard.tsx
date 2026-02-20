import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';

interface AgentCardProps {
    id: string;
    name: string;
    status: any;
    lastActive: string;
    currentTask?: string | null;
}

export default function AgentCard({ id, name, status, lastActive, currentTask }: AgentCardProps) {
    const navigate = useNavigate();

    const isActive = status === 'running' || status === 'starting';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div
            onClick={() => navigate(`/agent/${id}`)}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.85rem 0.5rem',
                margin: '0 -0.5rem', // Bleed to edge of padding container
                borderRadius: 12,
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-2)'
                }}>
                    {initials || <Bot size={20} />}
                </div>
                {/* Status Dot */}
                <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 13, height: 13, borderRadius: '50%',
                    background: isActive ? '#22d3a5' : status === 'waiting_approval' ? '#6366f1' : status === 'error' ? '#ef4444' : '#9ca3af',
                    border: '2px solid var(--bg)',
                    boxShadow: '0 0 0 1px var(--border)'
                }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-1)' }}>{name}</h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFeatureSettings: '"tnum"' }}>
                        {new Date(lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <p style={{
                    fontSize: '0.8rem', color: 'var(--text-2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    opacity: 0.85, lineHeight: 1.3
                }}>
                    {currentTask || "Start a conversation..."}
                </p>
            </div>
        </div>
    );
}
