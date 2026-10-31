export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Printer {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  asset_tag?: string;
  ip_address: string;
  port?: number;
  snmp_community?: string;
  snmp_enabled?: boolean;
  sector?: string;
  location?: string;
  printer_type?: string;
  status?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PrinterReading {
  id: string;
  printer_id: string;
  total_pages: number;
  available_pages?: number | null;
  status: string;
  response_time_ms: number;
  error_message?: string | null;
  read_at: string;
}

export interface DashboardSummary {
  total_printers: number;
  online: number;
  offline: number;
  with_errors: number;
  total_readings: number;
  total_pages_printed: number;
  today_pages_printed: number;
  week_pages_printed: number;
  by_sector: Array<{ name: string; pages: number }>;
  daily_trend: Array<{ date: string; pages: number }>;
}
