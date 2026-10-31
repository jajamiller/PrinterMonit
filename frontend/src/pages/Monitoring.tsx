import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Printer } from '../types';
import { PageTitle } from '../components/PageTitle';
import './Dashboard.css';

function StatusIcon({ status }: { status?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (status === 'online') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>;
  if (status === 'offline') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>;
  if (status === 'error') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>;
}

function LocationIcon() {
  return <svg className="monitoring-location-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
}


const formatDateTime = (dateString: string | number | undefined, systemTimezone: string): string => {
  if (!dateString) return '-';
  try {
    // Se for número, é timestamp em ms
    const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR', {
      timeZone: systemTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (e) {
    return '-';
  }
};

const formatTime = (dateString: string | number | undefined, systemTimezone: string): string => {
  if (!dateString) return '-';
  try {
    // Se for número, é timestamp em ms
    const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('pt-BR', {
      timeZone: systemTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (e) {
    return '-';
  }
};

export function Monitoring() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [systemTimezone, setSystemTimezone] = useState('America/Sao_Paulo');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get<{ timezone: string }>('/settings/timezone');
        setSystemTimezone(response.data.timezone);
      } catch (err) {
        console.error('Erro ao carregar timezone', err);
      }
    };
    loadSettings();
  }, []);

  const loadPrinters = async () => {
    try {
      const response = await api.get<Printer[]>('/printers');
      setPrinters(response.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao carregar impressoras', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();

    if (autoRefresh) {
      const interval = setInterval(loadPrinters, 5000); // Atualiza a cada 5s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const online = printers.filter(p => p.status === 'online').length;
  const offline = printers.filter(p => p.status === 'offline').length;
  const error = printers.filter(p => p.status === 'error').length;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return { bg: '#dcfce7', text: '#16A34A' };
      case 'offline':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'error':
        return { bg: '#fef3c7', text: '#92400e' };
      default:
        return { bg: '#E2E8F0', text: '#374151' };
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Carregando...</div>;
  }

  return (
    <div className="printer-management-page">
      <header className="history-header">
        <div><PageTitle icon="monitoring">Monitoramento em Tempo Real</PageTitle><p className="dashboard-subtitle">Status e disponibilidade dos equipamentos cadastrados.</p></div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            padding: '10px 20px',
            backgroundColor: autoRefresh ? '#16A34A' : '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {autoRefresh ? '⏸️ Pausar' : '▶️ Retomar'} (A cada 5s)
        </button>
      </header>

      {lastUpdate && (
        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px' }}>
          Última atualização: {formatDateTime(lastUpdate.toISOString(), systemTimezone)}
        </div>
      )}

      {/* Cards de Status */}
      <div className="monitoring-metrics">
        <div style={{ backgroundColor: '#dcfce7', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #16A34A' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>ONLINE</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16A34A' }}>{online}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px' }}>de {printers.length}</div>
        </div>

        <div style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>OFFLINE</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{offline}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px' }}>fora de serviço</div>
        </div>

        <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>ERRO</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{error}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px' }}>com problema</div>
        </div>
      </div>

      {/* Lista de Impressoras */}
      <section className="monitoring-printers">
        <div className="dashboard-panel-heading"><div><h2>Impressoras monitoradas</h2><p>{printers.length} equipamento{printers.length === 1 ? '' : 's'}</p></div></div>
        {printers.length === 0 ? (
          <div className="dashboard-panel monitoring-empty">Nenhuma impressora cadastrada</div>
        ) : (
          <div className="monitoring-printer-list">
            {printers.map(printer => {
            const statusColor = getStatusColor(printer.status);
            return (
              <div
                key={printer.id}
                style={{
                  backgroundColor: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${statusColor.text}`,
                }}
              >
                {/* Status Badge */}
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    backgroundColor: statusColor.bg,
                    color: statusColor.text,
                  }}
                >
                  <StatusIcon status={printer.status} />
                </div>

                {/* Informações */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {printer.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    {printer.ip_address} • {printer.manufacturer || 'Desconhecido'} {printer.model ? `- ${printer.model}` : ''}
                  </div>
                  {printer.sector && (
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                      <LocationIcon /> {printer.sector} {printer.location && `- ${printer.location}`}
                    </div>
                  )}
                </div>

                {/* Status e Tempo */}
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: statusColor.bg,
                      color: statusColor.text,
                      fontWeight: 'bold',
                      fontSize: '13px',
                      marginBottom: '8px',
                    }}
                  >
                    {printer.status?.toUpperCase() || 'DESCONHECIDO'}
                  </div>
                  {printer.last_seen_at && (
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {formatTime(printer.last_seen_at)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </section>
    </div>
  );
}
