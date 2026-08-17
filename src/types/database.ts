export type UserRole = 'admin' | 'engineer' | 'subcontractor';
export type SnagStatus = 'open' | 'in_progress' | 'resolved' | 'approved';
export type SnagPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  full_name: string;
  role: UserRole;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface Location {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
}

export interface Snag {
  id: string;
  company_id: string;
  location_id: string;
  title: string;
  description: string;
  status: SnagStatus;
  priority: SnagPriority;
  assigned_to_user_id: string | null;
  created_by_user_id: string | null;
  image_url: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
  
  // İlişkisel alanlar (Join)
  locations?: {
    title: string;
  } | null;
  assigned_user?: {
    full_name: string;
    role: string;
  } | null;
}