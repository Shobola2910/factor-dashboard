export interface Company {
  id: string;
  uuid?: string;
  name: string;
  status: string;
  dot_number?: string;
  mc_number?: string;
  address?: string;
  phone?: string;
  driver_count?: number;
  vehicle_count?: number;
}

export interface Driver {
  driver_id: string;
  driver_name: string;
  vehicle_id?: string;
  vehicle_number?: string;
  vin?: string;
  status: boolean | string;
  co_driver_id?: string;
  // from full driver list
  id?: number;
  company_id?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  license_number?: string;
  license_state?: string;
  username?: string;
}

export interface LogEntry {
  id?: string;
  event_type?: string;
  status?: string;          // ON, OFF, SB, D, PC, YM
  start_time?: string;
  end_time?: string;
  duration?: number;        // minutes
  location?: string;
  lat?: number;
  lng?: number;
  odometer?: number;
  engine_hours?: number;
  speed?: number;
  annotation?: string;
  certified?: boolean;
  malfunctions?: string[];
}

export interface DayLog {
  date: string;
  driver_id: string;
  driver_name?: string;
  entries: LogEntry[];
  certified?: boolean;
  total_driving?: number;
  total_on_duty?: number;
}

export interface HOSViolation {
  driver_id: string;
  driver_name: string;
  date: string;
  violation_type: string;
  description: string;
  severity: "critical" | "warning" | "info";
  value?: number;
  limit?: number;
}

export interface AuthState {
  token: string;
  tenantId: string;
  companyId?: string;
  email?: string;
}
