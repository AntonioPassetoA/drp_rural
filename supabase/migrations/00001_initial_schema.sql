-- DRP Rural Gestão - Initial Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM (
  'platform_admin',
  'project_manager',
  'agronomist',
  'local_manager',
  'operator'
);

CREATE TYPE project_status AS ENUM (
  'active',
  'paused',
  'completed'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE task_type AS ENUM (
  'task',
  'order'
);

CREATE TYPE diagnostic_status AS ENUM (
  'draft',
  'completed'
);

CREATE TYPE diagnostic_form_type AS ENUM (
  'municipality_history',
  'drp_summary',
  'applied_methodology',
  'social_reality',
  'environmental_reality',
  'productive_vocations',
  'main_actions',
  'final_recommendations'
);

CREATE TYPE locality_type AS ENUM (
  'community',
  'settlement',
  'village',
  'other'
);

CREATE TYPE evidence_type AS ENUM (
  'photo',
  'video',
  'document'
);

CREATE TYPE scope_type AS ENUM (
  'project',
  'municipality',
  'microregion',
  'locality'
);

CREATE TYPE project_role AS ENUM (
  'manager',
  'agronomist',
  'local_manager',
  'operator'
);

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'operator',
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Members (junction table with roles)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_project project_role NOT NULL DEFAULT 'operator',
  scope_type scope_type NOT NULL DEFAULT 'project',
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Municipalities
CREATE TABLE municipalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  ibge_code VARCHAR(10),
  population INTEGER,
  area_km2 DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Microregions
CREATE TABLE microregions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  families_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Localities
CREATE TABLE localities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  microregion_id UUID NOT NULL REFERENCES microregions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  locality_type locality_type NOT NULL DEFAULT 'community',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diagnostics (DRP forms)
CREATE TABLE diagnostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  form_type diagnostic_form_type NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status diagnostic_status NOT NULL DEFAULT 'draft',
  filled_by UUID NOT NULL REFERENCES users(id),
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(municipality_id, form_type)
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type task_type NOT NULL DEFAULT 'task',
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to UUID NOT NULL REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  locality_id UUID REFERENCES localities(id) ON DELETE SET NULL,
  checklist JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidences
CREATE TABLE evidences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_type evidence_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  captured_at TIMESTAMPTZ,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  diagnostic_id UUID REFERENCES diagnostics(id) ON DELETE SET NULL,
  locality_id UUID REFERENCES localities(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evidence_has_link CHECK (
    task_id IS NOT NULL OR diagnostic_id IS NOT NULL OR locality_id IS NOT NULL
  )
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);

CREATE INDEX idx_municipalities_project ON municipalities(project_id);
CREATE INDEX idx_municipalities_state ON municipalities(state);

CREATE INDEX idx_microregions_municipality ON microregions(municipality_id);

CREATE INDEX idx_localities_microregion ON localities(microregion_id);
CREATE INDEX idx_localities_type ON localities(locality_type);

CREATE INDEX idx_diagnostics_municipality ON diagnostics(municipality_id);
CREATE INDEX idx_diagnostics_form_type ON diagnostics(form_type);
CREATE INDEX idx_diagnostics_status ON diagnostics(status);
CREATE INDEX idx_diagnostics_filled_by ON diagnostics(filled_by);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE INDEX idx_evidences_task ON evidences(task_id);
CREATE INDEX idx_evidences_diagnostic ON evidences(diagnostic_id);
CREATE INDEX idx_evidences_locality ON evidences(locality_id);
CREATE INDEX idx_evidences_uploaded_by ON evidences(uploaded_by);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_municipalities_updated_at
  BEFORE UPDATE ON municipalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_microregions_updated_at
  BEFORE UPDATE ON microregions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_localities_updated_at
  BEFORE UPDATE ON localities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnostics_updated_at
  BEFORE UPDATE ON diagnostics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE microregions ENABLE ROW LEVEL SECURITY;
ALTER TABLE localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'platform_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is member of project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can view themselves" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Platform admins can view all users" ON users
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Platform admins can insert users" ON users
  FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "Users can update themselves" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Platform admins can update any user" ON users
  FOR UPDATE USING (is_platform_admin());

-- Projects policies
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (
    is_platform_admin() OR is_project_member(id)
  );

CREATE POLICY "Platform admins and managers can create projects" ON projects
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('platform_admin', 'project_manager'))
  );

CREATE POLICY "Project managers can update their projects" ON projects
  FOR UPDATE USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
      AND user_id = auth.uid()
      AND role_in_project = 'manager'
    )
  );

CREATE POLICY "Only platform admins can delete projects" ON projects
  FOR DELETE USING (is_platform_admin());

-- Project members policies
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    is_platform_admin() OR is_project_member(project_id)
  );

CREATE POLICY "Managers can add project members" ON project_members
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role_in_project = 'manager'
    )
  );

-- Municipalities policies
CREATE POLICY "Users can view municipalities in their projects" ON municipalities
  FOR SELECT USING (
    is_platform_admin() OR is_project_member(project_id)
  );

CREATE POLICY "Managers can create municipalities" ON municipalities
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = municipalities.project_id
      AND user_id = auth.uid()
      AND role_in_project = 'manager'
    )
  );

CREATE POLICY "Managers can update municipalities" ON municipalities
  FOR UPDATE USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = municipalities.project_id
      AND user_id = auth.uid()
      AND role_in_project = 'manager'
    )
  );

-- Microregions policies
CREATE POLICY "Users can view microregions" ON microregions
  FOR SELECT USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM municipalities m
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = microregions.municipality_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with scope can create microregions" ON microregions
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM municipalities m
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = microregions.municipality_id
      AND pm.user_id = auth.uid()
      AND pm.role_in_project IN ('manager', 'agronomist')
    )
  );

-- Localities policies
CREATE POLICY "Users can view localities" ON localities
  FOR SELECT USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM microregions mr
      JOIN municipalities m ON m.id = mr.municipality_id
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE mr.id = localities.microregion_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with scope can create localities" ON localities
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM microregions mr
      JOIN municipalities m ON m.id = mr.municipality_id
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE mr.id = localities.microregion_id
      AND pm.user_id = auth.uid()
    )
  );

-- Diagnostics policies
CREATE POLICY "Users can view diagnostics" ON diagnostics
  FOR SELECT USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM municipalities m
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = diagnostics.municipality_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with scope can create diagnostics" ON diagnostics
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM municipalities m
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = diagnostics.municipality_id
      AND pm.user_id = auth.uid()
      AND pm.role_in_project IN ('manager', 'agronomist')
    )
  );

CREATE POLICY "Users can update their diagnostics" ON diagnostics
  FOR UPDATE USING (
    is_platform_admin() OR
    filled_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM municipalities m
      JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = diagnostics.municipality_id
      AND pm.user_id = auth.uid()
      AND pm.role_in_project = 'manager'
    )
  );

-- Tasks policies
CREATE POLICY "Users can view assigned or created tasks" ON tasks
  FOR SELECT USING (
    is_platform_admin() OR
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id
      AND user_id = auth.uid()
      AND role_in_project = 'manager'
    )
  );

CREATE POLICY "Managers can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id
      AND user_id = auth.uid()
      AND role_in_project IN ('manager', 'local_manager')
    )
  );

CREATE POLICY "Users can update their tasks" ON tasks
  FOR UPDATE USING (
    is_platform_admin() OR
    assigned_to = auth.uid() OR
    created_by = auth.uid()
  );

-- Evidences policies
CREATE POLICY "Users can view evidences" ON evidences
  FOR SELECT USING (
    is_platform_admin() OR
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = evidences.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload evidences" ON evidences
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their evidences" ON evidences
  FOR DELETE USING (
    is_platform_admin() OR uploaded_by = auth.uid()
  );

-- Audit logs policies (only platform admins)
CREATE POLICY "Platform admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS FOR AUDIT
-- ============================================

CREATE OR REPLACE FUNCTION log_audit(
  p_action VARCHAR(100),
  p_entity_type VARCHAR(100),
  p_entity_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old_data, p_new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for evidences (run this in Supabase Dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidences', 'evidences', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);
