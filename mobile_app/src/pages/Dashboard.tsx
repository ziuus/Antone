import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAgentSocket } from '../api/websocket';
import AgentCard from '../components/AgentCard';
import { RefreshCw, MessageSquare } from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    status: string;
    last_active: string;
    current_task: string | null;
}

export default function Dashboard() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const { lastMessage } = useAgentSocket();

    useEffect(() => { loadAll(); }, []);
    useEffect(() => { if (lastMessage) loadAll(); }, [lastMessage]);

    const loadAll = async () => {
        try {
            const res = await api.get('/agents', { params: { all: true } });
            setAgents(res.data.data.agents);
        } catch (err) {
            console.error('Failed to load agents', err);
        } finally {
            setLoaded(true);
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ padding: '0.25rem 0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.03em' }}>Chats</h2>
                <button onClick={refresh} disabled={refreshing} className="btn btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                    <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} style={{ opacity: 0.7 }} />
                </button>
            </div>

            {/* Chat List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {agents.map((agent, i) => (
                    <div key={agent.id} style={{ animation: `fadeIn 0.3s ${i * 0.05}s both` }}>
                        <AgentCard
                            id={agent.id}
                            name={agent.name}
                            status={agent.status}
                            lastActive={agent.last_active}
                            currentTask={agent.current_task}
                        />
                    </div>
                ))}

                {loaded && agents.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '6rem 1rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                        opacity: 0.5
                    }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'var(--surface-2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <MessageSquare size={32} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>No chats yet</p>
                            <p style={{ fontSize: '0.9rem' }}>Start an agent to begin chatting</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
