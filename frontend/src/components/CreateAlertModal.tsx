import { useState, type FormEvent } from 'react';
import { createAlert } from '../api/alertApi';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '../types';

interface Props {
    coords: { lat: number; lng: number };
    onClose: () => void;
}

export default function CreateAlertModal({ coords, onClose }: Props) {
    const [category, setCategory] = useState<Category>('ROBBERY');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await createAlert({ category, description: description.trim(), lat: coords.lat, lng: coords.lng });
            if (res.merged) {
                setNotice('Se sumó a un reporte existente');
                setTimeout(onClose, 1600);
            } else {
                onClose();
            }
        } catch (err) {
            setError((err as Error).message);
            setSubmitting(false);
        }
    };

    return (
        <div className="overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
                <h3>Nueva alerta</h3>
                <small>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </small>

                <label>
                    Categoría
                    <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {CATEGORY_LABEL[c]}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Descripción
                    <textarea
                        value={description}
                        maxLength={280}
                        rows={4}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="¿Qué pasó?"
                    />
                    <small>{description.length}/280</small>
                </label>

                {error && <div className="error">{error}</div>}
                {notice && <div className="notice">{notice}</div>}

                <div className="actions">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn" disabled={submitting}>
                        {submitting ? 'Enviando...' : 'Reportar'}
                    </button>
                </div>
            </form>
        </div>
    );
}