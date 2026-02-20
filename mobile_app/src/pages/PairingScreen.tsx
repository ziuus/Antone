import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';

export default function PairingScreen() {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, error } = useAuth();
    const navigate = useNavigate();

    const handlePair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;
        setLoading(true);
        try {
            await login(key);
            navigate('/');
        } catch { /* error shown via context */ }
        finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - 56px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem 0',
            animation: 'fadeUp 0.4s both',
        }}>
            {/* Icon */}
            <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(99,102,241,.45)',
                marginBottom: '1.75rem',
            }}>
                <Zap size={34} color="#fff" fill="#fff" />
            </div>

            {/* Title */}
            <h2 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', textAlign: 'center' }}>
                Connect to Antone
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                Enter the pairing key shown in your<br />Antigravity console to get started.
            </p>

            {/* Form */}
            <form onSubmit={handlePair} style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="Paste pairing key…"
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    autoFocus
                    style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em', padding: '0.875rem 1rem' }}
                />

                {error && (
                    <div style={{
                        background: 'var(--error-dim)', border: '1px solid var(--error)',
                        borderRadius: 10, padding: '0.65rem 1rem',
                        color: 'var(--error)', fontSize: '0.85rem', textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !key.trim()}
                    className="btn btn-primary"
                    style={{ padding: '0.875rem', fontSize: '0.9375rem', fontWeight: 600, borderRadius: 12 }}
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>Connect <ArrowRight size={17} /></>
                    )}
                </button>
            </form>

            {/* Hint */}
            <p style={{ marginTop: '2rem', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
                Run <code style={{ background: 'var(--surface-2)', padding: '0.15em 0.4em', borderRadius: 5, fontFamily: 'monospace' }}>python -m mobile_bridge</code> to get your key
            </p>
        </div>
    );
}
