import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data.email, data.password);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Credenciais inválidas');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Wallet size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>FinançasPro</h1>
          <p className="text-muted" style={{ marginTop: 4, fontSize: '0.875rem' }}>
            Gerencie suas finanças com inteligência
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
              <input
                {...register('email')}
                type="email"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="seu@email.com"
                id="login-email"
              />
            </div>
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
              <input
                {...register('password')}
                type="password"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="••••••••"
                id="login-password"
              />
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isSubmitting} id="btn-login">
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={18} />}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-muted mt-6" style={{ fontSize: '0.875rem' }}>
          Não tem conta?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            Cadastre-se
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
