import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import type { User } from '../types';
import { PageTitle } from '../components/PageTitle';
import './Dashboard.css';

function UserPlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/></svg>;
}

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'usuario',
  });
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role: 'usuario',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get<User[]>('/users');
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar usuários');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    });
    setShowForm(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      await api.put(`/users/${editingUser.id}`, editFormData);
      await loadUsers();
      setShowForm(false);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar usuário');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await api.delete(`/users/${userId}`);
      await loadUsers();
    } catch (err: any) {
      setError('Erro ao deletar usuário');
      console.error(err);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'usuario',
    });
    setShowForm(true);
  };

  const handleSaveNewUser = async () => {
    if (!formData.email || !formData.full_name || !formData.password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      await api.post('/auth/register', {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        role: formData.role,
      });
      await loadUsers();
      setShowForm(false);
      setFormData({ email: '', full_name: '', password: '', role: 'usuario' });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar usuário');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      supervisor: 'Supervisor',
      usuario: 'Usuário',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: '#dc2626',
      supervisor: '#f59e0b',
      usuario: '#1E40AF',
    };
    return colors[role] || '#64748B';
  };

  return (
    <div className="printer-management-page">
      <header className="history-header">
        <div><PageTitle icon="users">Gerenciar Usuários</PageTitle><p className="dashboard-subtitle">Contas, permissões e acesso ao PrinterMonit.</p></div>
        <button
          onClick={handleAddUser}
          style={{
            padding: '10px 20px',
            backgroundColor: '#16A34A',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <UserPlusIcon /> Adicionar usuário
        </button>
      </header>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
          Carregando usuários...
        </div>
      ) : (
        <>
          <div className="users-list">
            {users.map(user => (
              <article className="user-card" key={user.id}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {user.full_name}
                    {user.id === currentUser?.id && (
                      <span style={{ fontSize: '12px', marginLeft: '8px', color: '#64748B' }}>
                        (Você)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
                    {user.email}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        padding: '4px 12px',
                        backgroundColor: getRoleColor(user.role),
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                    <span
                      style={{
                        padding: '4px 12px',
                        backgroundColor: user.is_active ? '#d1fae5' : '#fee2e2',
                        color: user.is_active ? '#065f46' : '#991b1b',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {user.is_active ? '✓ Ativo' : '✕ Inativo'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleEditUser(user)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1E40AF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    Editar
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                      }}
                    >
                      Deletar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Modal */}
          {showForm && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
              }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
                  maxWidth: '500px',
                  width: '90%',
                  padding: '30px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>
                    {editingUser ? 'Editar usuário' : 'Novo usuário'}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Form novo usuário */}
                {!editingUser && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="usuario@exemplo.com"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="João da Silva"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Senha (min 8 caracteres)
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="usuario">Usuário</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Form editar usuário */}
                {editingUser && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Nome
                      </label>
                      <input
                        type="text"
                        value={editFormData.full_name}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Role
                      </label>
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        disabled={editingUser.id === currentUser?.id}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          cursor: editingUser.id === currentUser?.id ? 'not-allowed' : 'pointer',
                          boxSizing: 'border-box',
                          opacity: editingUser.id === currentUser?.id ? 0.6 : 1,
                        }}
                      >
                        <option value="usuario">Usuário</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                      {editingUser.id === currentUser?.id && (
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                          Você não pode alterar sua própria role
                        </div>
                      )}
                    </div>

                    {editingUser.id !== currentUser?.id && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editFormData.is_active}
                            onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Usuário Ativo</span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#E2E8F0',
                      color: '#0F172A',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingUser ? handleSaveEditUser : handleSaveNewUser}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: saving ? '#94A3B8' : '#1E40AF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    {saving ? '⏳ Salvando...' : '💾 Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <div
              onClick={() => setShowForm(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1999,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
