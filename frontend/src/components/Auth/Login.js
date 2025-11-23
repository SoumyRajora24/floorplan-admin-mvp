import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import './Auth.css';

const Login = ({ onSwitchToRegister }) => {
  const { login, loading, error } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(form);
  };

  return (
    <div className="auth-box">
      <h2>Login to Floor Plan Admin</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="switch-auth">
        Don't have an account?{' '}
        <span onClick={onSwitchToRegister}>Register here</span>
      </p>
    </div>
  );
};

export default Login;
