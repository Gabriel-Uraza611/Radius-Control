import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { USE_MOCK } from '../config';

export default function LoginPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState(USE_MOCK ? 'demo@radius.com' : '');
    const [password, setPassword] = useState(USE_MOCK ? '123456' : '');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await login({ email, password });
            navigate('/', { replace: true });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="center-screen">
            <form className="card" onSubmit={submit}>
                <h2>Iniciar sesión</h2>
                <label>
                    Correo
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                    Contraseña
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </label>
                {error && <div className="error">{error}</div>}
                <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                </button>
                <p>
                    ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                </p>
            </form>
        </div>
    );
}