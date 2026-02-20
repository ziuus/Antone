type Status = 'running' | 'stopped' | 'error' | 'starting' | 'waiting_approval';

const cfg: Record<Status, { color: string; bg: string; dot: string; label: string }> = {
    running: { color: '#22d3a5', bg: 'rgba(34,211,165,.12)', dot: '#22d3a5', label: 'Running' },
    stopped: { color: '#9090a8', bg: 'rgba(144,144,168,.1)', dot: '#9090a8', label: 'Stopped' },
    error: { color: '#f43f5e', bg: 'rgba(244,63,94,.12)', dot: '#f43f5e', label: 'Error' },
    starting: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)', dot: '#f59e0b', label: 'Starting…' },
    waiting_approval: { color: '#6366f1', bg: 'rgba(99,102,241,.15)', dot: '#6366f1', label: 'Needs Approval' },
};

export default function StatusBadge({ status }: { status: Status }) {
    const c = cfg[status] ?? cfg.stopped;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.65rem', borderRadius: 99,
            background: c.bg, color: c.color,
            fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em',
            border: `1px solid ${c.color}30`,
            whiteSpace: 'nowrap', flexShrink: 0,
        }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%', background: c.dot,
                animation: status === 'running' || status === 'starting' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }} />
            {c.label}
        </span>
    );
}
