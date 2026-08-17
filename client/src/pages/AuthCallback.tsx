import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('登录失败');
      return;
    }

    localStorage.setItem('token', token);

    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    fetch(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      })
      .then((data) => {
        const user = data.data || data;
        setUser(user);
        navigate('/workbench', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('token');
        setError('获取用户信息失败');
      });
  }, [searchParams, setUser, navigate]);

  if (error) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--canvas)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 16 }}>{error}</p>
          <a href={`${import.meta.env.BASE_URL}login`} style={{ fontSize: 13, color: 'var(--ink-2)' }}>返回登录</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--canvas)',
    }}>
      <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>登录中...</p>
    </div>
  );
}
