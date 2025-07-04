#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const os = require('os');

// Paths
const dataDir = path.join(os.homedir(), '.magents');
const dockerAgentsPath = path.join(dataDir, 'docker_agents.json');
const dbPath = path.join(dataDir, 'magents.db');

console.log('Migrating Docker agents to database...');

// Read docker agents
if (!fs.existsSync(dockerAgentsPath)) {
  console.error('No docker_agents.json found');
  process.exit(1);
}

const dockerAgents = JSON.parse(fs.readFileSync(dockerAgentsPath, 'utf-8'));
console.log(`Found ${dockerAgents.length} agents to migrate`);

// Connect to database
const db = new Database(dbPath);

// Check if agents table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='agents'
`).get();

if (!tableExists) {
  console.error('Agents table does not exist in database');
  process.exit(1);
}

// Prepare insert statement
const insertAgent = db.prepare(`
  INSERT OR REPLACE INTO agents (
    id, name, project_id, status, mode, branch, worktree_path,
    tmux_session, docker_container, docker_image, docker_ports,
    docker_volumes, docker_network, auto_accept, port_range,
    environment_vars, current_task_id, assigned_tasks,
    resource_limits, description, tags, metadata,
    created_at, updated_at, last_accessed_at
  ) VALUES (
    @id, @name, @project_id, @status, @mode, @branch, @worktree_path,
    @tmux_session, @docker_container, @docker_image, @docker_ports,
    @docker_volumes, @docker_network, @auto_accept, @port_range,
    @environment_vars, @current_task_id, @assigned_tasks,
    @resource_limits, @description, @tags, @metadata,
    @created_at, @updated_at, @last_accessed_at
  )
`);

// Get or create default project
let defaultProjectId;
const existingProject = db.prepare('SELECT id FROM projects LIMIT 1').get();

if (existingProject) {
  defaultProjectId = existingProject.id;
  console.log(`Using existing project: ${defaultProjectId}`);
} else {
  // Create default project
  defaultProjectId = `proj-${Date.now()}-default`;
  const insertProject = db.prepare(`
    INSERT INTO projects (
      id, name, path, status, created_at, updated_at,
      agent_ids, max_agents, task_master_enabled,
      description, tags, metadata
    ) VALUES (
      @id, @name, @path, @status, @created_at, @updated_at,
      @agent_ids, @max_agents, @task_master_enabled,
      @description, @tags, @metadata
    )
  `);
  
  insertProject.run({
    id: defaultProjectId,
    name: 'magents',
    path: '/Users/santossafrao/Development/personal/magents',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    agent_ids: '[]',
    max_agents: 10,
    task_master_enabled: 1,
    description: 'Default project for migrated agents',
    tags: '[]',
    metadata: '{}'
  });
  
  console.log(`Created default project: ${defaultProjectId}`);
}

// Migrate agents
let migrated = 0;
let failed = 0;

const migrateMany = db.transaction((agents) => {
  for (const agent of agents) {
    try {
      // Map status
      let status = agent.status;
      if (status === 'REMOVED') {
        status = 'STOPPED';
      }
      
      const agentData = {
        id: agent.id,
        name: agent.id, // Use ID as name since name field doesn't exist
        project_id: defaultProjectId,
        status: status,
        mode: agent.useDocker ? 'docker' : 'hybrid',
        branch: agent.branch || 'main',
        worktree_path: agent.worktreePath,
        tmux_session: agent.tmuxSession,
        docker_container: agent.containerName || null,
        docker_image: agent.dockerImage || null,
        docker_ports: JSON.stringify(agent.dockerPorts || []),
        docker_volumes: JSON.stringify(agent.dockerVolumes || []),
        docker_network: agent.dockerNetwork || null,
        auto_accept: agent.autoAccept ? 1 : 0,
        port_range: agent.portRange || null,
        environment_vars: JSON.stringify(agent.environment || {}),
        current_task_id: agent.currentTaskId || null,
        assigned_tasks: JSON.stringify(agent.tasksAssigned || []),
        resource_limits: JSON.stringify(agent.resourceLimits || {}),
        description: agent.description || null,
        tags: JSON.stringify(agent.tags || []),
        metadata: JSON.stringify(agent.metadata || {}),
        created_at: agent.createdAt || new Date().toISOString(),
        updated_at: agent.updatedAt || new Date().toISOString(),
        last_accessed_at: agent.lastActivity || null
      };
      
      insertAgent.run(agentData);
      migrated++;
      console.log(`✓ Migrated agent: ${agent.id}`);
      
    } catch (error) {
      console.error(`✗ Failed to migrate agent ${agent.id}:`, error.message);
      failed++;
    }
  }
});

// Run migration in transaction
try {
  migrateMany(dockerAgents);
  
  // Update project with agent IDs
  const agentIds = dockerAgents.map(a => a.id);
  db.prepare(`
    UPDATE projects 
    SET agent_ids = @agent_ids, updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: defaultProjectId,
    agent_ids: JSON.stringify(agentIds),
    updated_at: new Date().toISOString()
  });
  
  console.log(`\n✓ Migration completed: ${migrated} agents migrated, ${failed} failed`);
  
  // Backup original file
  const backupPath = dockerAgentsPath + '.backup-' + Date.now();
  fs.copyFileSync(dockerAgentsPath, backupPath);
  console.log(`✓ Original file backed up to: ${backupPath}`);
  
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}