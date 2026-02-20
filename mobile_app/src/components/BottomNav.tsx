import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Terminal, Folder, GitBranch, Sparkles } from 'lucide-react';

const tabs = [
    { path: '/', icon: MessageSquare, label: 'Chats' },
    { path: '/playground', icon: Sparkles, label: 'Playground' },
    { path: '/files', icon: Folder, label: 'Files' },
    { path: '/terminal', icon: Terminal, label: 'Terminal' },
    { path: '/git', icon: GitBranch, label: 'Git' },
];

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav style={{
            position: 'sticky', bottom: 0, zIndex: 40,
            background: 'var(--surface)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border-2)',
            display: 'grid',
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            padding: '0.5rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom))',
        }}>
            {tabs.map(tab => {
                const Icon = tab.icon;
                const active = location.pathname === tab.path ||
                    (tab.path !== '/' && location.pathname.startsWith(tab.path));
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                            padding: '0.5rem 0.25rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderRadius: 10,
                            transition: 'all 0.15s',
                        }}
                    >
                        <div style={{
                            width: 36, height: 28, borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: active ? 'var(--primary-dim)' : 'transparent',
                            transition: 'background 0.15s',
                        }}>
                            <Icon
                                size={18}
                                style={{
                                    color: active ? 'var(--primary)' : 'var(--text-2)',
                                    transition: 'color 0.15s',
                                }}
                            />
                        </div>
                        <span style={{
                            fontSize: '0.65rem', fontWeight: active ? 600 : 400,
                            color: active ? 'var(--primary)' : 'var(--text-2)',
                            transition: 'color 0.15s',
                        }}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
