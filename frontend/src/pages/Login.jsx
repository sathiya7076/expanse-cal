import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-muted">Pick up where you left off.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {serverError && <p role="alert" className="rounded-lg bg-expense/10 p-3 text-sm font-medium text-expense">{serverError}</p>}
        <Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} error={errors.password} />
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here? <Link to="/register" className="font-medium text-brand-700 underline">Create an account</Link>
      </p>
    </>
  );
}
