import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PairingScreen from './pages/PairingScreen';
import AgentDetail from './pages/AgentDetail';
import Terminal from './pages/Terminal';
import FileBrowser from './pages/FileBrowser';
import GitStatus from './pages/GitStatus';
import Playground from './pages/Playground';

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/pair" />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/pair" element={<PairingScreen />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/agent/:id" element={<ProtectedRoute><AgentDetail /></ProtectedRoute>} />
                <Route path="/playground" element={<ProtectedRoute><Playground /></ProtectedRoute>} />
                <Route path="/terminal" element={<ProtectedRoute><Terminal /></ProtectedRoute>} />
                <Route path="/files" element={<ProtectedRoute><FileBrowser /></ProtectedRoute>} />
                <Route path="/git" element={<ProtectedRoute><GitStatus /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
