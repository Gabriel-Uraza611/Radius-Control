import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RegisterPage() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await register({ name, email, password });
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
                <h2>Crear cuenta</h2>
                <label>
                    Nombre
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
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
                    {submitting ? 'Creando...' : 'Registrarme'}
                </button>
                <p>
                    ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
                </p>
            </form>
        </div>
    );
}