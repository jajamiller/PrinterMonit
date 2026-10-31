import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Printer } from '../types';
import { PageTitle } from '../components/PageTitle';
import './Dashboard.css';

interface ConsumptionReport {
  period: { start: string; end: string };
  results: Array<{
    printer_id: string;
    printer_name: string;
    sector: string;
    location?: string;
    total_pages: number;
    reading_count: number;
  }>;
}

const toLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatReportDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

export function Reports() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [report, setReport] = useState<ConsumptionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    startDate: toLocalDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: toLocalDateInput(new Date()),
    printerId: '',
    sector: '',
  });

  useEffect(() => {
    const loadPrinters = async () => {
      try {
        const response = await api.get<Printer[]>('/printers');
        setPrinters(response.data);
      } catch (err) {
        console.error('Erro ao carregar impressoras', err);
      } finally {
        setLoading(false);
      }
    };
    loadPrinters();
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await api.post('/reports/consumption', {
        start_date: filters.startDate,
        end_date: filters.endDate,
        printer_id: filters.printerId || null,
        sector: filters.sector.trim() || null,
      });
      setReport(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  const totalPages = report?.results.reduce((sum, r) => sum + r.total_pages, 0) || 0;
  const reportDays = report
    ? Math.max(1, (Date.parse(`${report.period.end.slice(0, 10)}T00:00:00Z`) - Date.parse(`${report.period.start.slice(0, 10)}T00:00:00Z`)) / 86400000 + 1)
    : 1;
  const avgDaily = report ? Math.round(totalPages / reportDays) : 0;

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Carregando...</div>;
  }

  return (
    <div className="printer-management-page">
      <header className="history-header">
        <div><PageTitle icon="reports">Relatórios</PageTitle><p className="dashboard-subtitle">Consumo de impressão por período, equipamento e setor.</p></div>
      </header>

      <section className="dashboard-panel report-filters">
        <h2 style={{ marginTop: 0 }}>Filtros</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Data Inicial:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Data Final:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Impressora:</label>
            <select
              value={filters.printerId}
              onChange={(e) => setFilters({ ...filters, printerId: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
            >
              <option value="">Todas</option>
              {printers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Setor:</label>
            <input
              type="text"
              value={filters.sector}
              onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
              placeholder="Digite o setor"
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
            />
          </div>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1E40AF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {generating ? 'Gerando...' : 'Aplicar filtros'}
        </button>
      </section>

      {error && <div className="dashboard-alert" role="alert">❌ {error}</div>}

      {/* Relatório */}
      {report && (
        <section className="report-results">
          <div className="history-metrics report-metrics">
            <div className="history-metric-card metric-blue">
              <span className="history-metric-label">PERÍODO</span>
              <strong className="report-period-value">{formatReportDate(report.period.start)} – {formatReportDate(report.period.end)}</strong>
            </div>
            <div className="history-metric-card metric-green">
              <span className="history-metric-label">TOTAL DE PÁGINAS</span>
              <strong>{totalPages.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="history-metric-card metric-amber">
              <span className="history-metric-label">MÉDIA DIÁRIA</span>
              <strong>{avgDaily.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="history-metric-card metric-slate">
              <span className="history-metric-label">IMPRESSORAS</span>
              <strong>{report.results.length}</strong>
            </div>
          </div>

          {/* Tabela */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Impressora</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Setor</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Localização</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Páginas</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Leituras</th>
                </tr>
              </thead>
              <tbody>
                {report.results.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                      Nenhum dados para o período selecionado
                    </td>
                  </tr>
                ) : (
                  report.results.map(row => (
                    <tr key={row.printer_id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px' }}><strong>{row.printer_name}</strong></td>
                      <td style={{ padding: '12px' }}>{row.sector || '-'}</td>
                      <td style={{ padding: '12px' }}>{row.location || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{row.total_pages.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{row.reading_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </section>
      )}

      {!report && !error && (
        <div className="dashboard-panel report-empty">
          Selecione os filtros e clique em “Aplicar filtros” para atualizar o relatório
        </div>
      )}
    </div>
  );
}
