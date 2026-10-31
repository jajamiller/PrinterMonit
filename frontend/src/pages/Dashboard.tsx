import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { DashboardSummary, Printer } from '../types';
import { PageTitle } from '../components/PageTitle';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

const STATUS_COLORS = ['#16A34A', '#B91C1C', '#D97706'];

function MetricIcon({ type }: { type: 'printers' | 'online' | 'offline' | 'today' | 'week' }) {
  const icons = {
    printers: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/></>,
    online: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    offline: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
    today: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    week: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h3"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[type]}</svg>;
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    setLoadError('');
    try {
      const [printerResponse, summaryResponse] = await Promise.all([
        api.get<Printer[]>('/printers'),
        api.get<DashboardSummary>('/printers/dashboard/summary'),
      ]);
      setPrinters(printerResponse.data);
      setSummary(summaryResponse.data);
    } catch (err: any) {
      setLoadError(err.response?.data?.detail || 'Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const statusData = summary ? [
    { name: 'Online', value: summary.online, fill: STATUS_COLORS[0] },
    { name: 'Offline', value: summary.offline, fill: STATUS_COLORS[1] },
    { name: 'Com alerta', value: summary.with_errors, fill: STATUS_COLORS[2] },
  ].filter(item => item.value > 0) : [];
  const sectorData = summary?.by_sector || [];
  const trendData = summary?.daily_trend || [];

  const metrics = summary ? [
    { label: 'Impressoras', value: summary.total_printers, type: 'printers' as const, tone: 'blue' },
    { label: 'Online', value: summary.online, type: 'online' as const, tone: 'green' },
    { label: 'Offline', value: summary.offline, type: 'offline' as const, tone: 'red' },
    { label: 'Páginas hoje', value: summary.today_pages_printed.toLocaleString('pt-BR'), type: 'today' as const, tone: 'navy' },
    { label: 'Últimos 7 dias', value: summary.week_pages_printed.toLocaleString('pt-BR'), type: 'week' as const, tone: 'slate' },
  ] : [];

  if (loading) return <div className="dashboard-loading"><span className="dashboard-spinner" />Carregando painel…</div>;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <PageTitle icon="dashboard">Visão geral</PageTitle>
          <p className="dashboard-subtitle">Resumo da operação e atividade da sua rede de impressão.</p>
        </div>
        <span className="dashboard-refresh"><span /> Atualizado automaticamente</span>
      </header>

      {loadError && <div className="dashboard-alert" role="alert">{loadError}</div>}

      {summary && <section className="dashboard-metrics" aria-label="Indicadores principais">
        {metrics.map(metric => (
          <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
            <span className="metric-icon"><MetricIcon type={metric.type} /></span>
            <div className="metric-copy"><span className="metric-label">{metric.label}</span><strong>{metric.value}</strong></div>
          </article>
        ))}
      </section>}

      {summary && <section className="dashboard-charts" aria-label="Gráficos de operação">
        {statusData.length > 0 && <article className="dashboard-panel dashboard-status-panel">
          <div className="dashboard-panel-heading"><div><h2>Saúde da rede</h2><p>Estado atual das impressoras</p></div></div>
          <div className="status-chart-layout">
            <div className="status-donut"><ResponsiveContainer width="100%" height="100%"><PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="92%" paddingAngle={3} stroke="none">
                {statusData.map((entry, index) => <Cell key={entry.name} fill={entry.fill || STATUS_COLORS[index]} />)}
              </Pie><Tooltip />
            </PieChart></ResponsiveContainer><div className="donut-center"><strong>{summary.total_printers}</strong><span>total</span></div></div>
            <div className="status-legend">{[
              { label: 'Online', value: summary.online, tone: 'green' },
              { label: 'Offline', value: summary.offline, tone: 'red' },
              { label: 'Com alerta', value: summary.with_errors, tone: 'amber' },
            ].map(item => <div className="status-legend-row" key={item.label}><span className={`status-dot ${item.tone}`} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
          </div>
        </article>}

        {sectorData.length > 0 && <article className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><h2>Consumo por setor</h2><p>Páginas impressas nos últimos 7 dias</p></div></div>
          <div className="dashboard-chart dashboard-sector-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={sectorData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F1F5F9' }} formatter={(value) => [(value as number).toLocaleString('pt-BR'), 'Páginas']} />
            <Bar dataKey="pages" fill="#1E40AF" radius={[5, 5, 0, 0]} maxBarSize={38} />
          </BarChart></ResponsiveContainer></div>
        </article>}

        {trendData.length > 0 && <article className="dashboard-panel dashboard-trend-panel">
          <div className="dashboard-panel-heading"><div><h2>Tendência de impressão</h2><p>Volume diário nos últimos 7 dias</p></div></div>
          <div className="dashboard-chart dashboard-trend-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [(value as number).toLocaleString('pt-BR'), 'Páginas']} />
            <Line type="monotone" dataKey="pages" name="Páginas" stroke="#1E40AF" strokeWidth={2.5} dot={{ r: 3, fill: '#1E40AF', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart></ResponsiveContainer></div>
        </article>}
      </section>}

      <section className="dashboard-printers dashboard-panel">
        <div className="dashboard-panel-heading"><div><h2>Impressoras cadastradas</h2><p>{printers.length} equipamento{printers.length === 1 ? '' : 's'} monitorado{printers.length === 1 ? '' : 's'}</p></div></div>
        {printers.length === 0 ? <p className="dashboard-empty">Nenhuma impressora cadastrada.</p> : <div className="printer-list">
          {printers.slice(0, 5).map(printer => <div className="printer-row" key={printer.id}>
            <span className="printer-row-icon"><MetricIcon type="printers" /></span>
            <div className="printer-row-info"><strong>{printer.name}</strong><span>{printer.ip_address}</span></div>
            <span className={`printer-status ${printer.status === 'online' ? 'is-online' : printer.status === 'offline' ? 'is-offline' : 'is-warning'}`}><span />{printer.status === 'online' ? 'Online' : printer.status === 'offline' ? 'Offline' : 'Atenção'}</span>
          </div>)}
          {printers.length > 5 && <p className="printer-list-more">E mais {printers.length - 5} impressora{printers.length - 5 === 1 ? '' : 's'}…</p>}
        </div>}
      </section>
    </div>
  );
}
