// Database types for DRP Rural Gestão
// These types mirror the PostgreSQL schema

export type UserRole = 'superadmin' | 'gestor' | 'colaborador'

export type ProjectStatus = 'active' | 'paused' | 'completed'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskType = 'task' | 'order'

export type DiagnosticStatus = 'draft' | 'completed'

export type DiagnosticFormType =
  | 'municipality_history'
  | 'drp_summary'
  | 'applied_methodology'
  | 'social_reality'
  | 'environmental_reality'
  | 'productive_vocations'
  | 'main_actions'
  | 'final_recommendations'

export type LocalityType = 'community' | 'settlement' | 'village' | 'other'

export type EvidenceType = 'photo' | 'video' | 'document'

export type ScopeType = 'project' | 'municipality' | 'microregion' | 'locality'

export type ProjectRole = 'manager' | 'agronomist' | 'local_manager' | 'operator'

// Base types for entities
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_in_project: ProjectRole
  scope_type: ScopeType
  scope_id: string | null
  created_at: string
}

export interface Municipality {
  id: string
  project_id: string
  name: string
  state: string
  ibge_code: string | null
  population: number | null
  area_km2: number | null
  created_at: string
  updated_at: string
}

export interface Microregion {
  id: string
  municipality_id: string
  name: string
  description: string | null
  families_count: number | null
  created_at: string
  updated_at: string
}

export interface Locality {
  id: string
  microregion_id: string
  name: string
  locality_type: LocalityType
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export interface Diagnostic {
  id: string
  municipality_id: string
  form_type: DiagnosticFormType
  data: Record<string, unknown>
  status: DiagnosticStatus
  filled_by: string
  filled_at: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  task_type: TaskType
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string
  created_by: string
  due_date: string
  completed_at: string | null
  locality_id: string | null
  checklist: ChecklistItem[] | null
  created_at: string
  updated_at: string
}

export interface Evidence {
  id: string
  evidence_type: EvidenceType
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  latitude: number | null
  longitude: number | null
  captured_at: string | null
  task_id: string | null
  diagnostic_id: string | null
  locality_id: string | null
  uploaded_by: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// Extended types with relations
export interface UserWithProjects extends User {
  project_members?: ProjectMemberWithProject[]
}

export interface ProjectMemberWithProject extends ProjectMember {
  project?: Project
}

export interface ProjectMemberWithUser extends ProjectMember {
  user?: User
}

export interface ProjectWithMembers extends Project {
  project_members?: ProjectMemberWithUser[]
  municipalities?: Municipality[]
}

export interface MunicipalityWithRelations extends Municipality {
  project?: Project
  microregions?: Microregion[]
  diagnostics?: Diagnostic[]
}

export interface MicroregionWithRelations extends Microregion {
  municipality?: Municipality
  localities?: Locality[]
}

export interface LocalityWithRelations extends Locality {
  microregion?: MicroregionWithRelations
}

export interface TaskWithRelations extends Task {
  project?: Project
  assigned_user?: User
  created_user?: User
  locality?: Locality
  evidences?: Evidence[]
}

export interface DiagnosticWithRelations extends Diagnostic {
  municipality?: Municipality
  filled_user?: User
  evidences?: Evidence[]
}

export interface EvidenceWithRelations extends Evidence {
  task?: Task
  diagnostic?: Diagnostic
  locality?: Locality
  uploaded_user?: User
}

// Form data types for creating/updating
export interface CreateUserData {
  email: string
  full_name: string
  role: UserRole
  phone?: string
  password: string
}

export interface UpdateUserData {
  full_name?: string
  phone?: string
  avatar_url?: string
  is_active?: boolean
}

export interface CreateProjectData {
  name: string
  description?: string
  status?: ProjectStatus
  start_date?: string
  end_date?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: ProjectStatus
  start_date?: string
  end_date?: string
}

export interface CreateMunicipalityData {
  project_id: string
  name: string
  state: string
  ibge_code?: string
  population?: number
  area_km2?: number
}

export interface CreateMicroregionData {
  municipality_id: string
  name: string
  description?: string
  families_count?: number
}

export interface CreateLocalityData {
  microregion_id: string
  name: string
  locality_type: LocalityType
  latitude?: number
  longitude?: number
}

export interface CreateTaskData {
  project_id: string
  title: string
  description?: string
  task_type: TaskType
  priority: TaskPriority
  assigned_to: string
  due_date: string
  locality_id?: string
  checklist?: ChecklistItem[]
}

export interface UpdateTaskData {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  assigned_to?: string
  due_date?: string
  checklist?: ChecklistItem[]
}

export interface CreateDiagnosticData {
  municipality_id: string
  form_type: DiagnosticFormType
  data: Record<string, unknown>
  status?: DiagnosticStatus
}

export interface UpdateDiagnosticData {
  data?: Record<string, unknown>
  status?: DiagnosticStatus
}

export interface CreateEvidenceData {
  evidence_type: EvidenceType
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  latitude?: number
  longitude?: number
  captured_at?: string
  task_id?: string
  diagnostic_id?: string
  locality_id?: string
}

// Supabase Database type helper
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
      }
      project_members: {
        Row: ProjectMember
        Insert: Omit<ProjectMember, 'id' | 'created_at'>
        Update: Partial<Omit<ProjectMember, 'id' | 'created_at'>>
      }
      municipalities: {
        Row: Municipality
        Insert: Omit<Municipality, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Municipality, 'id' | 'created_at' | 'updated_at'>>
      }
      microregions: {
        Row: Microregion
        Insert: Omit<Microregion, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Microregion, 'id' | 'created_at' | 'updated_at'>>
      }
      localities: {
        Row: Locality
        Insert: Omit<Locality, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Locality, 'id' | 'created_at' | 'updated_at'>>
      }
      diagnostics: {
        Row: Diagnostic
        Insert: Omit<Diagnostic, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Diagnostic, 'id' | 'created_at' | 'updated_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
      }
      evidences: {
        Row: Evidence
        Insert: Omit<Evidence, 'id' | 'created_at'>
        Update: Partial<Omit<Evidence, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
    }
  }
}
