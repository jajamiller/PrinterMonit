import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Printer, PrinterReading } from '../types';
import { PageTitle } from '../components/PageTitle';
import './Dashboard.css';
import './Dashboard.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper para converter timestamp UTC para horário local usando timezone do sistema
const formatDateTime = (dateString: string | number | null | undefined, systemTimezone: string): string => {
  if (!dateString) return '-';
  try {
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

const formatCapturePeriod = (timestamp: number, systemTimezone: string): string => {
  return new Date(timestamp).toLocaleString('pt-BR', {
    timeZone: systemTimezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface SystemSettings {
  timezone: string;
}

export function History() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [readings, setReadings] = useState<PrinterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  const [systemTimezone, setSystemTimezone] = useState('America/Sao_Paulo');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get<SystemSettings>('/settings/timezone');
        setSystemTimezone(response.data.timezone);
      } catch (err) {
        console.error('Erro ao carregar timezone', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadPrinters = async () => {
      try {
        const response = await api.get<Printer[]>('/printers');
        setPrinters(response.data);
        if (response.data.length > 0) {
          setSelectedPrinterId(response.data[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar impressoras', err);
      }
    };
    loadPrinters();
  }, []);

  useEffect(() => {
    if (!selectedPrinterId) return;

    const loadReadings = async () => {
      setLoading(true);
      try {
        const response = await api.get<PrinterReading[]>(`/printers/${selectedPrinterId}/readings`, {
          params: { days: daysFilter },
        });
        setReadings(response.data);
      } catch (err) {
        console.error('Erro ao carregar histórico', err);
      } finally {
        setLoading(false);
      }
    };

    loadReadings();
  }, [selectedPrinterId, daysFilter]);

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId);

  // Ordenar cronologicamente e manter a leitura mais recente de cada janela de 6 horas.
  const chronologicalReadings = [...readings].sort(
    (a, b) => new Date(a.read_at).getTime() - new Date(b.read_at).getTime(),
  );
  const chartBuckets = new Map<number, PrinterReading>();
  chronologicalReadings.forEach(reading => {
    const timestamp = new Date(reading.read_at).getTime();
    if (!Number.isFinite(timestamp)) return;
    const bucketStart = Math.floor(timestamp / (6 * 60 * 60 * 1000)) * (6 * 60 * 60 * 1000);
    chartBuckets.set(bucketStart, reading);
  });

  const chartData = Array.from(chartBuckets.entries())
    .sort(([startA], [startB]) => startA - startB)
    .map(([start, reading]) => ({
      period: `${formatCapturePeriod(start, systemTimezone)} – ${formatCapturePeriod(start + 6 * 60 * 60 * 1000, systemTimezone)}`,
      pages: reading.total_pages,
    }));

  // Calcular consumo usando a primeira e a última leitura em ordem cronológica.
  const consumption = chronologicalReadings.length > 1
    ? chronologicalReadings[chronologicalReadings.length - 1].total_pages - chronologicalReadings[0].total_pages
    : 0;

  const avgDaily = daysFilter > 0 ? Math.round(consumption / daysFilter) : 0;

  return (
    <div className="printer-management-page">
      <header className="history-header">
        <div>
          <PageTitle icon="history">Histórico de Contadores</PageTitle>
          <p className="dashboard-subtitle">Acompanhe contadores e consumo por período de captura.</p>
        </div>
      </header>

      <section className="dashboard-panel history-filters">
        <div className="history-filter-field">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Impressora:</label>
          <select
            value={selectedPrinterId}
            onChange={(e) => setSelectedPrinterId(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
          >
            {printers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="history-filter-field">
          <label>Período:</label>
          <select
            onChange={(e) => setDaysFilter(parseInt(e.target.value))}
            style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>
        </div>
      </section>

      {/* Estatísticas */}
      {selectedPrinter && readings.length > 0 && (
        <div className="history-metrics">
          <div className="history-metric-card metric-blue">
            <span className="history-metric-label">PÁGINAS ATUAIS</span>
            <strong>{chronologicalReadings[chronologicalReadings.length - 1]?.total_pages.toLocaleString('pt-BR')}</strong>
          </div>
          <div className="history-metric-card metric-green">
            <span className="history-metric-label">CONSUMO NO PERÍODO</span>
            <strong>{consumption.toLocaleString('pt-BR')}</strong>
          </div>
          <div className="history-metric-card metric-amber">
            <span className="history-metric-label">MÉDIA DIÁRIA</span>
            <strong>{avgDaily.toLocaleString('pt-BR')}</strong>
          </div>
          <div className="history-metric-card metric-slate">
            <span className="history-metric-label">LEITURAS</span>
            <strong>{readings.length}</strong>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>⏳ Carregando...</div>
      ) : chartData.length > 0 ? (
        <article className="dashboard-panel history-chart-panel">
          <div className="dashboard-panel-heading"><div><h2>Contagem de páginas</h2><p>Leitura mais recente de cada janela de 6 horas</p></div></div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 14, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="period"
                angle={-35}
                textAnchor="end"
                height={80}
                interval={Math.max(0, Math.ceil(chartData.length / 14) - 1)}
                tick={{ fill: '#64748B', fontSize: 10 }}
              />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={(label) => `Período: ${label}`}
                formatter={(value) => [(value as number).toLocaleString('pt-BR'), 'Páginas']}
              />
              <Line type="monotone" dataKey="pages" name="Páginas" stroke="#1E40AF" strokeWidth={2.5} dot={{ r: 3, fill: '#1E40AF', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </article>
      ) : (
        <div className="dashboard-panel history-empty">Nenhuma leitura disponível para este período.</div>
      )}

      {readings.length > 0 && (
        <section className="dashboard-panel history-table-panel">
          <div className="dashboard-panel-heading"><div><h2>Histórico detalhado</h2><p>{readings.length} leituras registradas</p></div></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Data/Hora</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Páginas</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Tempo Resposta (ms)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {readings.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px' }}>{formatDateTime(r.read_at, systemTimezone)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{r.total_pages.toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{r.response_time_ms}ms</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: r.status === 'online' ? '#dcfce7' : '#fee2e2',
                        color: r.status === 'online' ? '#16A34A' : '#dc2626',
                      }}>
                        {r.status === 'online' ? '✓' : '✗'} {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
