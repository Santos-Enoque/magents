# Magents Architecture Refactoring Plan

## Overview
Refactor Magents to implement proper project-based task scoping, mandatory agent-project associations, SQLite database migration, and Task Master as an optional integration.

## Phase 1: Database Migration (Week 1)

### 1.1 Create Migration Infrastructure
- Create migration scripts for existing JSON files (projects.json, agent configs)
- Implement rollback functionality for safe migration
- Add backup creation before migration
- Create CLI command `magents migrate` with --rollback option

### 1.2 Update Backend Services
- Update ProjectService to use ProjectRepository instead of file operations
- Update agent management to use AgentRepository
- Maintain backward compatibility during transition
- Add transaction support for complex operations

### 1.3 Database Initialization
- Add database initialization to startup sequence
- Create database file at ~/.magents/magents.db
- Run migrations automatically on first startup
- Add health checks for database connectivity

## Phase 2: Enforce Agent-Project Relationships (Week 1-2)

### 2.1 Make Project Association Mandatory
- Update agent creation to require projectId
- Modify UnifiedAgentData schema to make projectId required
- Update validation logic in agent creation flow
- Add foreign key constraints in database

### 2.2 Auto-Create Projects for Terminal Agents
- When creating agent from terminal without project, auto-create project
- Use current working directory as project path
- Name project based on directory basename
- Link Docker volumes to project path

### 2.3 Update Agent Creation Flow
- Modify DockerAgentManager.createAgent to enforce project association
- Update CLI create command to handle project creation/selection
- Ensure worktree paths are within project boundaries
- Update agent details display to show project info

## Phase 3: Implement Project-Scoped Tasks (Week 2)

### 3.1 Add Project Selector to Task Browser
- Create dropdown component for project selection
- Load projects list from database via API
- Store selected project in component state
- Update task loading to use selected project path

### 3.2 Filter Tasks by Project
- Modify taskMasterIntegrationService.getTasks to accept project path
- Load tasks only from selected project's .taskmaster/tasks/tasks.json
- Cache tasks per project to improve performance
- Handle projects without Task Master gracefully

### 3.3 Restrict Task Assignment
- Filter agents by project when showing assignment options
- Only allow task assignment to agents within same project
- Update API to validate project consistency
- Show clear error messages for invalid assignments

## Phase 4: Decouple Task Master Integration (Week 2-3)

### 4.1 Create Task Integration Interface
- Define TaskIntegration interface in packages/shared/src/integrations/
- Methods: getTasks, createTask, updateTask, deleteTask, getTaskDetails
- Support for task assignment and status tracking
- Pluggable architecture for different task systems

### 4.2 Move Task Master to Integration
- Create TaskMasterIntegration implementing TaskIntegration interface
- Move existing Task Master code to packages/shared/src/integrations/taskmaster/
- Make Task Master installation conditional in Dockerfile
- Add configuration to enable/disable Task Master

### 4.3 Implement Internal Task System
- Create InternalTaskIntegration using SQLite database
- Basic CRUD operations for tasks stored in database
- Simple task schema: id, title, description, status, projectId, assignedAgentId
- No external dependencies required

### 4.4 Add Task System Configuration
- Add taskIntegration setting: 'none' | 'internal' | 'taskmaster'
- Update mode configurations to reflect task system choice
- Add --task-system flag to agent creation
- Update UI to show available task systems

## Phase 5: Clean Up Docker Implementation (Week 3)

### 5.1 Remove Deprecated Code
- Remove deprecated AgentManager class completely
- Clean up any tmux-only code paths
- Update all references to use DockerAgentManager
- Remove legacy configuration options

### 5.2 Update Documentation
- Update README to emphasize Docker-first approach
- Remove references to tmux-only mode
- Add Docker troubleshooting guide
- Update installation instructions

## Implementation Details

### Database Schema Updates
```sql
-- Add foreign key constraints
ALTER TABLE agents ADD CONSTRAINT fk_project 
  FOREIGN KEY (projectId) REFERENCES projects(id);

-- Add indexes for performance
CREATE INDEX idx_agents_projectId ON agents(projectId);
CREATE INDEX idx_tasks_projectId ON tasks(projectId);
CREATE INDEX idx_tasks_assignedAgentId ON tasks(assignedAgentId);
```

### API Changes
```typescript
// New endpoints
GET /api/projects/:projectId/tasks
GET /api/projects/:projectId/agents
POST /api/agents (body must include projectId)

// Updated endpoints
GET /api/tasks?projectId=xxx (filter by project)
PUT /api/tasks/:id/assign (validate same project)
```

### Configuration Changes
```json
{
  "taskIntegration": {
    "type": "taskmaster", // or "internal" or "none"
    "config": {
      "autoInstall": false,
      "apiKeys": {}
    }
  }
}
```

## Success Criteria

1. **Database Migration**
   - All existing data successfully migrated to SQLite
   - No data loss during migration
   - Rollback functionality works correctly

2. **Project-Agent Association**
   - Every agent has a mandatory project association
   - Projects automatically created when needed
   - Clear project boundaries enforced

3. **Project-Scoped Tasks**
   - Tasks filtered by selected project
   - Task assignment restricted to same-project agents
   - Smooth user experience with project switching

4. **Task Master Decoupling**
   - Task Master works as optional integration
   - Internal task system provides basic functionality
   - Easy to switch between task systems

5. **Docker Cleanup**
   - All deprecated code removed
   - Documentation updated
   - Docker-first approach clear to users

## Risk Mitigation

1. **Data Loss Prevention**
   - Create backups before migration
   - Implement rollback functionality
   - Test migration thoroughly

2. **Breaking Changes**
   - Version the API endpoints
   - Maintain backward compatibility where possible
   - Provide clear migration guides

3. **Performance Issues**
   - Add proper database indexes
   - Implement caching where appropriate
   - Monitor query performance

4. **User Experience**
   - Gradual rollout with feature flags
   - Clear error messages and guidance
   - Maintain CLI compatibility