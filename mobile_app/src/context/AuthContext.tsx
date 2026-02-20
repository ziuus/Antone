import { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface AuthContextType {
    token: string | null;
    pairingKey: string | null;
    isAuthenticated: boolean;
    login: (key: string) => Promise<void>;
    logout: () => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('antone_token'));
    const [pairingKey, setPairingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const login = async (key: string) => {
        try {
            setError(null);
            // Determine API URL (default to localhost:8765 if simpler for now, or relative if proxied)
            // For mobile testing, we might need configurable IP.
            // Default: http://127.0.0.1:8765
            const response = await axios.post(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth/pair` : 'http://127.0.0.1:8001/auth/pair', { pairing_key: key });
            const newToken = response.data.data.token;

            localStorage.setItem('antone_token', newToken);
            setToken(newToken);
            setPairingKey(key);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Pairing failed');
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('antone_token');
        setToken(null);
        setPairingKey(null);
    };

    return (
        <AuthContext.Provider value={{ token, pairingKey, isAuthenticated: !!token, login, logout, error }}>
            {children}
        </AuthContext.Provider>
    );
}
