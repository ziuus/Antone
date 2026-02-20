import { useState } from 'react';
import { Send, Sparkles, Settings2, Trash2, RefreshCw } from 'lucide-react';
import api from '../api/client';

export default function Playground() {
    const [prompt, setPrompt] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [model, setModel] = useState('gemini-2.0-flash');

    const run = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setResponse('');
        try {
            const res = await api.post('/playground/run', {
                user_prompt: prompt,
                system_prompt: systemPrompt,
                model
            });
            setResponse(res.data.data.response);
        } catch (e) {
            setResponse('Error: ' + (e as any).message);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => {
        setPrompt('');
        setResponse('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}>
                        <Sparkles size={16} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Playground</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {response && (
                        <button onClick={clear} className="btn btn-ghost" style={{ padding: '0.5rem' }} title="Clear">
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`btn btn-ghost ${showSettings ? 'active' : ''}`}
                        style={{ padding: '0.5rem', color: showSettings ? 'var(--primary)' : 'inherit' }}
                    >
                        <Settings2 size={18} />
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="card" style={{ padding: '1rem', animation: 'fadeUp 0.2s ease-out' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Prompt</label>
                    <textarea
                        value={systemPrompt}
                        onChange={e => setSystemPrompt(e.target.value)}
                        placeholder="You are a helpful AI assistant..."
                        className="input"
                        style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                className="input"
                                style={{ width: '100%', appearance: 'none', background: 'var(--surface-2)' }}
                            >
                                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gpt-4o">GPT-4o (Simulated)</option>
                            </select>
                            <Settings2 size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                {response && (
                    <div className="card" style={{ background: 'var(--surface-2)', border: 'none', animation: 'fadeIn 0.3s' }}>
                        <div style={{ padding: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
                            {response}
                        </div>
                    </div>
                )}

                {!response && !loading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={24} />
                        </div>
                        <p style={{ fontSize: '0.9rem' }}>Enter a prompt to start experimenting</p>
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.75rem', color: 'var(--text-2)' }}>
                        <RefreshCw size={20} className="animate-spin" />
                        <span style={{ fontSize: '0.9rem' }}>Generating response...</span>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--primary-dim)', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Enter your prompt here..."
                    style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--text-1)', fontSize: '0.95rem', resize: 'none', height: '24px',
                        minHeight: '24px', maxHeight: '120px', fontFamily: 'inherit', padding: '0.25rem 0'
                    }}
                    onInput={(e) => {
                        e.currentTarget.style.height = 'auto'; // Reset height
                        e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            run();
                        }
                    }}
                />
                <button
                    onClick={run}
                    disabled={loading || !prompt.trim()}
                    className="btn btn-primary"
                    style={{
                        width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, opacity: (!prompt.trim() || loading) ? 0.5 : 1
                    }}
                >
                    <Send size={18} />
                </button>
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
