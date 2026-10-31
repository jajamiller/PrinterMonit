import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import type { Printer } from '../types';
import { PageTitle } from '../components/PageTitle';
import './Dashboard.css';

type PrinterForm = {
  name: string;
  ip_address: string;
  manufacturer: string;
  model: string;
  asset_tag: string;
  sector: string;
  location: string;
  port: number;
  snmp_community: string;
};

export interface PrinterDetails {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  ip_address: string;
  sector?: string;
  location?: string;
  status: string;
  last_reading: {
    total_pages: number | null;
    available_pages: number | null;
    status: string | null;
    error_message: string | null;
    read_at: string | null;  // ISO 8601 UTC string
  };
  consumption_since_last: number;
  consumption_today: number;
}

function PrinterUiIcon({ name }: { name: 'add' | 'edit' | 'delete' | 'reading' | 'details' | 'test' | 'report' | 'close' }) {
  const paths = {
    add: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /></>,
    delete: <><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    reading: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    details: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6m-3-3h6"/></>,
    test: <><path d="M9 3h6m-5 0v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M8 16h8"/></>,
    report: <><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 13h8m-8 4h8"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}


const formatDateTime = (isoString: string | null | undefined, systemTimezone: string): string => {
  if (!isoString) return '-';
  try {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(isoString);
    const normalizedTimestamp = hasTimezone ? isoString : `${isoString}Z`;
    const date = new Date(normalizedTimestamp);
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

const emptyForm: PrinterForm = {
  name: '',
  ip_address: '',
  manufacturer: '',
  model: '',
  asset_tag: '',
  sector: '',
  location: '',
  port: 161,
  snmp_community: 'public',
};

export function Printers() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PrinterForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
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

  const loadPrinters = useCallback(async () => {
    try {
      const response = await api.get<Printer[]>('/printers');
      setPrinters(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar impressoras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/printers/${editingId}`, form);
        setNotice('✅ Impressora atualizada com sucesso!');
      } else {
        await api.post('/printers', form);
        setNotice('✅ Impressora cadastrada com sucesso!');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      loadPrinters();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar impressora');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (printer: Printer) => {
    setForm({
      name: printer.name,
      ip_address: printer.ip_address,
      manufacturer: printer.manufacturer || '',
      model: printer.model || '',
      asset_tag: printer.asset_tag || '',
      sector: printer.sector || '',
      location: printer.location || '',
      port: printer.port || 161,
      snmp_community: printer.snmp_community || 'public',
    });
    setEditingId(printer.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza?')) return;
    try {
      await api.delete(`/printers/${id}`);
      setNotice('✅ Impressora deletada com sucesso!');
      loadPrinters();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao deletar impressora');
    }
  };

  const handleTest = async (printerId: string) => {
    setTestingId(printerId);
    try {
      const result = await api.post(`/printers/${printerId}/test`, {});
      const printer = printers.find(p => p.id === printerId);
      if (result.data.pages_total) {
        setNotice(`✅ ${printer?.name}: ${result.data.pages_total} páginas (${result.data.counter_oid})`);
      } else {
        setError(`Teste falhou: ${result.data.error}`);
      }
      setTimeout(() => loadPrinters(), 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao testar impressora');
    } finally {
      setTestingId(null);
    }
  };

  const handleShowDetails = async (printerId: string) => {
    setLoadingDetails(true);
    try {
      const response = await api.get<PrinterDetails>(`/printers/${printerId}/details`);
      setSelectedPrinter(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar detalhes');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPrinter) return;
    setReportGenerating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await api.post('/reports/consumption', {
        start_date: thirtyDaysAgo,
        end_date: today,
        printer_id: selectedPrinter.id,
      });
      
      setNotice(`✅ Relatório gerado para ${selectedPrinter.name}`);
      
      // Baixa o CSV
      const csvResponse = await api.get('/reports/export/csv', {
        params: {
          printer_id: selectedPrinter.id,
          start_date: thirtyDaysAgo,
          end_date: today,
        },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([csvResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-${selectedPrinter.name}-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao gerar relatório');
    } finally {
      setReportGenerating(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading"><span className="dashboard-spinner" />Carregando impressoras...</div>;
  }

  return (
    <div className="printer-management-page">
      <div className="printer-management-header">
        <PageTitle icon="printer">Impressoras</PageTitle>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1E40AF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : <><PrinterUiIcon name="add" /> Nova impressora</>}
        </button>
      </div>

      {error && <div className="dashboard-alert" role="alert">{error}</div>}
      {notice && <div style={{ color: '#16A34A', marginBottom: '20px', padding: '12px', backgroundColor: '#d1fae5', borderRadius: '5px' }}>{notice}</div>}

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2>{editingId ? 'Editar' : 'Nova'} impressora</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <input type="text" name="name" placeholder="Nome *" value={form.name} onChange={handleChange} required style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="ip_address" placeholder="IP *" value={form.ip_address} onChange={handleChange} required style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="manufacturer" placeholder="Fabricante" value={form.manufacturer} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="model" placeholder="Modelo" value={form.model} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="asset_tag" placeholder="Patrimônio" value={form.asset_tag} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="sector" placeholder="Setor" value={form.sector} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="location" placeholder="Localização" value={form.location} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="number" name="port" placeholder="Porta SNMP" value={form.port} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <input type="text" name="snmp_community" placeholder="Community" value={form.snmp_community} onChange={handleChange} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            <button type="submit" disabled={saving} style={{ padding: '8px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
          </form>
        </div>
      )}

      {printers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          Nenhuma impressora cadastrada. Clique em "Nova Impressora" para começar.
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Nome</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>IP</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fabricante</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Patrimônio</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Setor</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {printers.map(printer => (
                <tr key={printer.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px' }}><strong>{printer.name}</strong></td>
                  <td style={{ padding: '12px' }}>{printer.ip_address}</td>
                  <td style={{ padding: '12px' }}>{printer.manufacturer || '-'}</td>
                  <td style={{ padding: '12px' }}>{printer.asset_tag || '-'}</td>
                  <td style={{ padding: '12px' }}>{printer.sector || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: printer.status === 'online' ? '#dcfce7' : '#fee2e2',
                      color: printer.status === 'online' ? '#16A34A' : '#dc2626',
                    }}>
                      <span className={`printer-status-dot ${printer.status === 'online' ? 'is-online' : 'is-offline'}`} /> {printer.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleShowDetails(printer.id)}
                      disabled={loadingDetails}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#1E40AF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <PrinterUiIcon name="details" /> Detalhes
                    </button>
                    <button
                      onClick={() => handleTest(printer.id)}
                      disabled={testingId === printer.id}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: testingId === printer.id ? '#CBD5E1' : '#1E40AF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <PrinterUiIcon name="test" /> Testar
                    </button>
                    <button
                      onClick={() => handleEdit(printer)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <PrinterUiIcon name="edit" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(printer.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <PrinterUiIcon name="delete" /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalhes */}
      {selectedPrinter && (
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
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '30px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Detalhes da impressora</h2>
              <button
                onClick={() => setSelectedPrinter(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                <PrinterUiIcon name="close" />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>{selectedPrinter.name}</h3>
              <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                <div><strong>Fabricante:</strong> {selectedPrinter.manufacturer || '-'}</div>
                <div><strong>Modelo:</strong> {selectedPrinter.model || '-'}</div>
                <div><strong>Patrimônio:</strong> {selectedPrinter.asset_tag || '-'}</div>
                <div><strong>IP:</strong> {selectedPrinter.ip_address}</div>
                <div><strong>Setor:</strong> {selectedPrinter.sector || '-'}</div>
                <div><strong>Localização:</strong> {selectedPrinter.location || '-'}</div>
                <div><strong>Status:</strong>
                  <span style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: selectedPrinter.status === 'online' ? '#dcfce7' : '#fee2e2',
                    color: selectedPrinter.status === 'online' ? '#16A34A' : '#dc2626',
                  }}>
                    <span className={`printer-status-dot ${selectedPrinter.status === 'online' ? 'is-online' : 'is-offline'}`} /> {selectedPrinter.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F1F5F9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '10px' }}><PrinterUiIcon name="reading" /> Última leitura</h4>
              {selectedPrinter.last_reading.read_at ? (
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Data/Hora:</strong> {formatDateTime(selectedPrinter.last_reading.read_at, systemTimezone)}</div>
                  <div><strong>Contagem Total:</strong> {selectedPrinter.last_reading.total_pages?.toLocaleString('pt-BR') || '-'} páginas</div>
                  <div><strong>Consumo desde última leitura:</strong> {selectedPrinter.consumption_since_last.toLocaleString('pt-BR')} páginas</div>
                  <div><strong>Consumo hoje:</strong> {selectedPrinter.consumption_today.toLocaleString('pt-BR')} páginas</div>
                  {selectedPrinter.last_reading.available_pages !== null && (
                    <div><strong>Páginas disponíveis:</strong> {selectedPrinter.last_reading.available_pages}</div>
                  )}
                  {selectedPrinter.last_reading.status && (
                    <div><strong>Status da leitura:</strong> {selectedPrinter.last_reading.status}</div>
                  )}
                  {selectedPrinter.last_reading.error_message && (
                    <div style={{ color: '#dc2626' }}><strong>Erro:</strong> {selectedPrinter.last_reading.error_message}</div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#64748B' }}>Nenhuma leitura disponível</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedPrinter(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#E2E8F0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Fechar
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={reportGenerating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: reportGenerating ? '#CBD5E1' : '#16A34A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {reportGenerating ? 'Gerando...' : <><PrinterUiIcon name="report" /> Gerar relatório</>} 
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
