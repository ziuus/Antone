import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useAgentSocket() {
    const { token } = useAuth();
    const socketRef = useRef<WebSocket | null>(null);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        const wsUrl = `ws://127.0.0.1:8000/ws/realtime?token=${token}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('WS Connected');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        ws.onclose = () => setIsConnected(false);

        return () => {
            ws.close();
        };
    }, [token]);

    return { lastMessage, isConnected };
}
