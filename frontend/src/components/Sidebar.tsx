import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '../services/auth';
import { api } from '../services/api';

interface MenuItem {
  icon: 'dashboard' | 'printer' | 'history' | 'users' | 'reports' | 'monitoring';
  label: string;
  path: string;
  section?: string;
}

function MenuIcon({ name }: { name: MenuItem['icon'] }) {
  const paths: Record<MenuItem['icon'], ReactNode> = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></>,
    printer: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7zM17 11h.01"/></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"/></>,
    reports: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M17 6h3v3"/></>,
    monitoring: <><path d="M3 12h4l3-8 4 16 3-8h4"/><circle cx="12" cy="12" r="9"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

type SidebarActionIconName = 'user' | 'settings' | 'password' | 'logout' | 'close' | 'clock' | 'info' | 'save';

function SidebarActionIcon({ name }: { name: SidebarActionIconName }) {
  const paths: Record<SidebarActionIconName, ReactNode> = {
    user: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/></>,
    password: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></>,
  };
  return <svg className="sidebar-action-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

interface Settings {
  id: string;
  timezone: string;
  date_format: string;
}

const menuItems: MenuItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/', section: 'principal' },
  { icon: 'printer', label: 'Impressoras', path: '/printers', section: 'gestao' },
  { icon: 'history', label: 'Histórico', path: '/history', section: 'gestao' },
  { icon: 'users', label: 'Usuários', path: '/users', section: 'gestao' },
  { icon: 'reports', label: 'Relatórios', path: '/reports', section: 'analise' },
  { icon: 'monitoring', label: 'Monitoramento', path: '/monitoring', section: 'operacao' },
];

const sections: Record<string, string> = {
  principal: 'Principal',
  gestao: 'Gestão',
  analise: 'Análise',
  operacao: 'Operação',
};

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
  { value: 'America/New_York', label: 'Nova York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Europe/London', label: 'Londres (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Xangai (UTC+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<Settings>('/settings/timezone');
      setSettings(response.data);
      setTimezone(response.data.timezone);
    } catch (err) {
      console.error('Erro ao carregar configurações', err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings/timezone', {
        timezone,
      });
      await loadSettings();
      setShowSettingsModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao salvar configurações', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setPasswordError('Preencha todos os campos');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('Novas senhas não conferem');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }

    try {
      setSaving(true);
      await api.post('/auth/change-password', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      setShowPasswordModal(false);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setPasswordError('');
      alert('Senha alterada com sucesso!');
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentSection = menuItems.find(m => m.path === location.pathname)?.section || 'principal';

  // Filtrar menu items baseado na role do usuário
  const visibleItems = menuItems.filter(item => {
    if (item.path === '/users') {
      return user?.role === 'admin';
    }
    return true;
  });

  const groupedItems = Object.entries(sections).map(([key, title]) => ({
    key,
    title,
    items: visibleItems.filter(m => m.section === key),
  }));

  return (
    <>
      <aside
        style={{
          width: '260px',
          backgroundColor: '#0F172A',
          color: 'white',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          borderRight: '1px solid #1E293B',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '0 20px 30px', borderBottom: '1px solid #374151', marginBottom: '20px' }}>
          <a
            href="/"
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F1F5F9',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <img src="/printermonit-mark.svg" alt="" width="30" height="30" />
            PrinterMonit
          </a>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {groupedItems.map(group => (
            <div key={group.key} style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8', paddingLeft: '20px', marginBottom: '12px', letterSpacing: '0.5px' }}>
                {group.title}
              </div>
              {group.items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      backgroundColor: isActive ? '#1E40AF' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s',
                      borderLeft: isActive ? '4px solid #16A34A' : '4px solid transparent',
                      paddingLeft: isActive ? '16px' : '20px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#1E293B';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <MenuIcon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar"><SidebarActionIcon name="user" /></div>
            <div className="sidebar-user-copy">
              <span className="sidebar-user-label">Conectado como</span>
              <strong title={user?.full_name || 'Usuário'}>{user?.full_name || 'Usuário'}</strong>
              {user?.role && <span className="sidebar-user-role">{user.role === 'admin' ? 'Administrador' : user.role}</span>}
            </div>
          </div>
          <button className="sidebar-footer-action" onClick={() => setShowSettingsModal(true)}>
            <SidebarActionIcon name="settings" /><span>Configurações</span>
          </button>
          <button className="sidebar-footer-action" onClick={() => setShowPasswordModal(true)}>
            <SidebarActionIcon name="password" /><span>Alterar senha</span>
          </button>
          <button className="sidebar-footer-action sidebar-logout-action" onClick={handleLogout}>
            <SidebarActionIcon name="logout" /><span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Modal de Configurações */}
      {showSettingsModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            maxWidth: '500px',
            width: '90%',
            padding: '30px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Configurações do sistema</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                <SidebarActionIcon name="close" />
              </button>
            </div>

            {/* Timezone */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#374151',
              }}>
                🌍 Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <div style={{
                fontSize: '12px',
                color: '#94A3B8',
                marginTop: '6px',
              }}>
                <SidebarActionIcon name="clock" /> Selecione o timezone padrão. As datas serão exibidas neste horário.
              </div>
            </div>

            {/* Info */}
            <div style={{
              backgroundColor: '#dbeafe',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#1e40af',
            }}>
              <SidebarActionIcon name="info" /> A página será recarregada após salvar as configurações.
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e5e7eb',
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
                onClick={handleSaveSettings}
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

      {/* Click outside to close modal */}
      {showSettingsModal && (
        <div
          onClick={() => setShowSettingsModal(false)}
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

      {/* Modal de Alterar Senha */}
      {showPasswordModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            maxWidth: '500px',
            width: '90%',
            padding: '30px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Alterar senha</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                <SidebarActionIcon name="close" />
              </button>
            </div>

            {passwordError && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '13px',
              }}>
                {passwordError}
              </div>
            )}

            {/* Senha Atual */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#374151',
              }}>
                Senha Atual
              </label>
              <input
                type="password"
                value={passwordForm.old_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
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

            {/* Nova Senha */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#374151',
              }}>
                Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
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
              <div style={{
                fontSize: '12px',
                color: '#94A3B8',
                marginTop: '6px',
              }}>
                Mínimo 8 caracteres
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#374151',
              }}>
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
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

            {/* Botões */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e5e7eb',
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
                onClick={handleChangePassword}
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
                {saving ? '⏳ Alterando...' : '✅ Alterar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close password modal */}
      {showPasswordModal && (
        <div
          onClick={() => setShowPasswordModal(false)}
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
  );
}
