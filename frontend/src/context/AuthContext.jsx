// Context autentikasi global: menyimpan user & token, expose login/logout
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('as_token');
    const savedUser = localStorage.getItem('as_user');
    if (token && savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      // Untuk siswa, cek ulang status persetujuan terbaru ke server (bisa saja baru
      // disetujui/ditolak admin sejak terakhir login), supaya tidak mengandalkan
      // data studentStatus yang sudah usang di localStorage.
      if (parsed.role === 'STUDENT') {
        api
          .get('/students/me')
          .then(({ data }) => {
            const latestStatus = data?.student?.status;
            if (latestStatus && latestStatus !== parsed.studentStatus) {
              const updated = { ...parsed, studentStatus: latestStatus };
              localStorage.setItem('as_user', JSON.stringify(updated));
              setUser(updated);
            }
          })
          .catch(() => {});
      }
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('as_token', data.token);
    localStorage.setItem('as_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('as_token', data.token);
    localStorage.setItem('as_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('as_token');
    localStorage.removeItem('as_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
