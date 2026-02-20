import { useState, useEffect } from 'react';
import { Moon, Sun, Zap } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import WorkspacePicker from './WorkspacePicker';

export default function Layout() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('antone_theme') as 'light' | 'dark') ?? 'dark';
    });
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('antone_theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const isPairing = location.pathname === '/pair';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'var(--surface)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--border-2)',
                padding: '0 1rem',
                height: '52px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Logo */}
                <button
                    onClick={() => isAuthenticated && navigate('/')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: 'none', border: 'none', cursor: isAuthenticated ? 'pointer' : 'default', padding: 0 }}
                >
                    <div style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(99,102,241,.4)',
                    }}>
                        <Zap size={15} color="#fff" fill="#fff" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
                        Antone
                    </span>
                </button>

                {/* Workspace pill - center */}
                {isAuthenticated && !isPairing && (
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                        <WorkspacePicker />
                    </div>
                )}

                {/* Right controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: '0.4rem', borderRadius: '8px' }}>
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    {isAuthenticated && !isPairing && (
                        <button onClick={logout} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}>
                            Disconnect
                        </button>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main style={{ flex: 1, width: '100%', maxWidth: '520px', margin: '0 auto', padding: '1.25rem 1rem 1.5rem' }}>
                <Outlet />
            </main>

            {/* Bottom nav - only when authenticated */}
            {isAuthenticated && !isPairing && <BottomNav />}
        </div>
    );
}
