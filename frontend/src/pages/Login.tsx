import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';

type LoginForm = {
  email: string;
  password: string;
};

export function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginForm>();
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(values: LoginForm) {
    try {
      await login(values.email.trim(), values.password);
      navigate('/', { replace: true });
    } catch (error: any) {
      setError('root', {
        message: error?.response?.data?.detail ?? 'Não foi possível entrar. Confira o e-mail e a senha.',
      });
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Acesso ao PrinterMonit">
        <div className="login-brand">
          <img className="login-brand-mark" src="/printermonit-mark.svg" alt="" />
          <span>PrinterMonit</span>
        </div>

        <h1>Acessar sistema</h1>
        <p className="login-subtitle">Monitoramento inteligente. Gestão completa das suas impressoras.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
          <div className="form-field">
            <label htmlFor="email">Usuário</label>
            <input
              id="email"
              {...register('email', { required: 'Informe o e-mail' })}
              type="text"
              autoComplete="username"
              placeholder="admin"
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              {...register('password', { required: 'Informe a senha' })}
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          {errors.root && <p className="login-error" role="alert">{errors.root.message}</p>}

          <button type="submit" disabled={isSubmitting} className="login-submit">
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="login-help">Se você não tiver acesso, procure o administrador do sistema.</p>
      </section>
    </main>
  );
}
