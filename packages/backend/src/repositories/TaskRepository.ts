import { Database } from 'better-sqlite3';
import { DatabaseService } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

export interface InternalTask {
  id: string;
  taskMasterId?: string;
  projectId: string;
  title: string;
  description?: string;
  details?: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  assignedToAgentId?: string;
  parentTaskId?: string;
  subtaskIds?: string[];
  dependencies?: string[];
  testStrategy?: string;
  testResults?: Record<string, any>;
  estimatedEffort?: number;
  actualEffort?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  details?: string;
  status?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  assignedToAgentId?: string;
  parentTaskId?: string;
  dependencies?: string[];
  testStrategy?: string;
  estimatedEffort?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  taskMasterId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  details?: string;
  status?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  assignedToAgentId?: string;
  dependencies?: string[];
  testStrategy?: string;
  testResults?: Record<string, any>;
  estimatedEffort?: number;
  actualEffort?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TaskFilter {
  projectId?: string;
  status?: string | string[];
  priority?: string | string[];
  assignedToAgentId?: string;
  parentTaskId?: string;
  hasSubtasks?: boolean;
  hasDependencies?: boolean;
  tags?: string[];
  includeSubtasks?: boolean;
}

export class TaskRepository {
  private db: Database;

  constructor() {
    this.db = DatabaseService.getInstance().getDatabase();
  }

  /**
   * Create a new task
   */
  async create(input: CreateTaskInput): Promise<InternalTask> {
    const id = uuidv4();
    const now = new Date();

    const task = {
      id,
      task_master_id: input.taskMasterId || null,
      project_id: input.projectId,
      title: input.title,
      description: input.description || null,
      details: input.details || null,
      status: input.status || 'pending',
      priority: input.priority || 'medium',
      assigned_to_agent_id: input.assignedToAgentId || null,
      parent_task_id: input.parentTaskId || null,
      subtask_ids: JSON.stringify([]),
      dependencies: JSON.stringify(input.dependencies || []),
      test_strategy: input.testStrategy || null,
      test_results: JSON.stringify({}),
      estimated_effort: input.estimatedEffort || null,
      actual_effort: null,
      tags: JSON.stringify(input.tags || []),
      metadata: JSON.stringify(input.metadata || {}),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      assigned_at: input.assignedToAgentId ? now.toISOString() : null,
      started_at: input.status === 'in-progress' ? now.toISOString() : null,
      completed_at: input.status === 'done' ? now.toISOString() : null
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, task_master_id, project_id, title, description, details,
        status, priority, assigned_to_agent_id, parent_task_id,
        subtask_ids, dependencies, test_strategy, test_results,
        estimated_effort, actual_effort, tags, metadata,
        created_at, updated_at, assigned_at, started_at, completed_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      task.id, task.task_master_id, task.project_id, task.title,
      task.description, task.details, task.status, task.priority,
      task.assigned_to_agent_id, task.parent_task_id, task.subtask_ids,
      task.dependencies, task.test_strategy, task.test_results,
      task.estimated_effort, task.actual_effort, task.tags, task.metadata,
      task.created_at, task.updated_at, task.assigned_at,
      task.started_at, task.completed_at
    );

    // If this is a subtask, update the parent's subtask list
    if (input.parentTaskId) {
      await this.addSubtaskToParent(input.parentTaskId, id);
    }

    return this.findById(id)!;
  }

  /**
   * Find a task by ID
   */
  findById(id: string): InternalTask | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.rowToTask(row) : null;
  }

  /**
   * Find tasks by project ID
   */
  findByProjectId(projectId: string): InternalTask[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(projectId);
    return rows.map(row => this.rowToTask(row));
  }

  /**
   * Find tasks with filters
   */
  findWithFilters(filter: TaskFilter): InternalTask[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filter.projectId) {
      query += ' AND project_id = ?';
      params.push(filter.projectId);
    }

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        query += ` AND status IN (${filter.status.map(() => '?').join(',')})`;
        params.push(...filter.status);
      } else {
        query += ' AND status = ?';
        params.push(filter.status);
      }
    }

    if (filter.priority) {
      if (Array.isArray(filter.priority)) {
        query += ` AND priority IN (${filter.priority.map(() => '?').join(',')})`;
        params.push(...filter.priority);
      } else {
        query += ' AND priority = ?';
        params.push(filter.priority);
      }
    }

    if (filter.assignedToAgentId !== undefined) {
      if (filter.assignedToAgentId === null) {
        query += ' AND assigned_to_agent_id IS NULL';
      } else {
        query += ' AND assigned_to_agent_id = ?';
        params.push(filter.assignedToAgentId);
      }
    }

    if (filter.parentTaskId !== undefined) {
      if (filter.parentTaskId === null) {
        query += ' AND parent_task_id IS NULL';
      } else {
        query += ' AND parent_task_id = ?';
        params.push(filter.parentTaskId);
      }
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    const tasks = rows.map(row => this.rowToTask(row));

    // Apply post-query filters
    let filtered = tasks;

    if (filter.hasSubtasks !== undefined) {
      filtered = filtered.filter(task => 
        filter.hasSubtasks ? (task.subtaskIds?.length || 0) > 0 : (task.subtaskIds?.length || 0) === 0
      );
    }

    if (filter.hasDependencies !== undefined) {
      filtered = filtered.filter(task => 
        filter.hasDependencies ? (task.dependencies?.length || 0) > 0 : (task.dependencies?.length || 0) === 0
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(task => 
        filter.tags!.some(tag => task.tags?.includes(tag))
      );
    }

    // Include subtasks if requested
    if (filter.includeSubtasks) {
      const tasksWithSubtasks: InternalTask[] = [];
      
      for (const task of filtered) {
        tasksWithSubtasks.push(task);
        if (task.subtaskIds && task.subtaskIds.length > 0) {
          const subtasks = this.findSubtasks(task.id);
          tasksWithSubtasks.push(...subtasks);
        }
      }
      
      // Remove duplicates
      const uniqueTasks = Array.from(
        new Map(tasksWithSubtasks.map(t => [t.id, t])).values()
      );
      
      return uniqueTasks;
    }

    return filtered;
  }

  /**
   * Find all subtasks of a task
   */
  findSubtasks(parentTaskId: string): InternalTask[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at');
    const rows = stmt.all(parentTaskId);
    return rows.map(row => this.rowToTask(row));
  }

  /**
   * Update a task
   */
  async update(id: string, input: UpdateTaskInput): Promise<InternalTask | null> {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    // Build dynamic update query
    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }
    if (input.details !== undefined) {
      updates.push('details = ?');
      params.push(input.details);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
      
      // Update timestamps based on status
      const now = new Date().toISOString();
      if (input.status === 'in-progress' && !existing.startedAt) {
        updates.push('started_at = ?');
        params.push(now);
      }
      if (input.status === 'done' && !existing.completedAt) {
        updates.push('completed_at = ?');
        params.push(now);
      }
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }
    if (input.assignedToAgentId !== undefined) {
      updates.push('assigned_to_agent_id = ?');
      params.push(input.assignedToAgentId);
      
      if (input.assignedToAgentId && !existing.assignedAt) {
        updates.push('assigned_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (input.dependencies !== undefined) {
      updates.push('dependencies = ?');
      params.push(JSON.stringify(input.dependencies));
    }
    if (input.testStrategy !== undefined) {
      updates.push('test_strategy = ?');
      params.push(input.testStrategy);
    }
    if (input.testResults !== undefined) {
      updates.push('test_results = ?');
      params.push(JSON.stringify(input.testResults));
    }
    if (input.estimatedEffort !== undefined) {
      updates.push('estimated_effort = ?');
      params.push(input.estimatedEffort);
    }
    if (input.actualEffort !== undefined) {
      updates.push('actual_effort = ?');
      params.push(input.actualEffort);
    }
    if (input.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(input.tags));
    }
    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(input.metadata));
    }

    // Always update updated_at
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    if (updates.length === 1) return existing; // Only updated_at changed

    // Add ID to params
    params.push(id);

    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(...params);

    return this.findById(id);
  }

  /**
   * Delete a task
   */
  async delete(id: string): Promise<boolean> {
    const task = this.findById(id);
    if (!task) return false;

    // Remove from parent's subtask list if it has a parent
    if (task.parentTaskId) {
      await this.removeSubtaskFromParent(task.parentTaskId, id);
    }

    // Delete the task (subtasks will be cascade deleted due to foreign key)
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Add a subtask to a parent task
   */
  private async addSubtaskToParent(parentId: string, subtaskId: string): Promise<void> {
    const parent = this.findById(parentId);
    if (!parent) return;

    const subtaskIds = parent.subtaskIds || [];
    if (!subtaskIds.includes(subtaskId)) {
      subtaskIds.push(subtaskId);
      
      const stmt = this.db.prepare('UPDATE tasks SET subtask_ids = ?, updated_at = ? WHERE id = ?');
      stmt.run(JSON.stringify(subtaskIds), new Date().toISOString(), parentId);
    }
  }

  /**
   * Remove a subtask from a parent task
   */
  private async removeSubtaskFromParent(parentId: string, subtaskId: string): Promise<void> {
    const parent = this.findById(parentId);
    if (!parent || !parent.subtaskIds) return;

    const subtaskIds = parent.subtaskIds.filter(id => id !== subtaskId);
    
    const stmt = this.db.prepare('UPDATE tasks SET subtask_ids = ?, updated_at = ? WHERE id = ?');
    stmt.run(JSON.stringify(subtaskIds), new Date().toISOString(), parentId);
  }

  /**
   * Convert a database row to a Task object
   */
  private rowToTask(row: any): InternalTask {
    return {
      id: row.id,
      taskMasterId: row.task_master_id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      details: row.details,
      status: row.status,
      priority: row.priority,
      assignedToAgentId: row.assigned_to_agent_id,
      parentTaskId: row.parent_task_id,
      subtaskIds: row.subtask_ids ? JSON.parse(row.subtask_ids) : [],
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      testStrategy: row.test_strategy,
      testResults: row.test_results ? JSON.parse(row.test_results) : undefined,
      estimatedEffort: row.estimated_effort,
      actualEffort: row.actual_effort,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  /**
   * Get task statistics for a project
   */
  async getStatistics(projectId?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    assigned: number;
    unassigned: number;
  }> {
    let baseQuery = 'FROM tasks';
    const params: any[] = [];
    
    if (projectId) {
      baseQuery += ' WHERE project_id = ?';
      params.push(projectId);
    }

    // Total count
    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count ${baseQuery}`);
    const totalResult = totalStmt.get(...params);
    const total = totalResult.count;

    // By status
    const statusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      ${baseQuery}
      ${projectId ? 'AND' : 'WHERE'} 1=1
      GROUP BY status
    `);
    const statusRows = statusStmt.all(...params);
    const byStatus: Record<string, number> = {};
    statusRows.forEach(row => {
      byStatus[row.status] = row.count;
    });

    // By priority
    const priorityStmt = this.db.prepare(`
      SELECT priority, COUNT(*) as count 
      ${baseQuery}
      ${projectId ? 'AND' : 'WHERE'} 1=1
      GROUP BY priority
    `);
    const priorityRows = priorityStmt.all(...params);
    const byPriority: Record<string, number> = {};
    priorityRows.forEach(row => {
      byPriority[row.priority] = row.count;
    });

    // Assigned vs unassigned
    const assignedStmt = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN assigned_to_agent_id IS NOT NULL THEN 1 END) as assigned,
        COUNT(CASE WHEN assigned_to_agent_id IS NULL THEN 1 END) as unassigned
      ${baseQuery}
    `);
    const assignedResult = assignedStmt.get(...params);

    return {
      total,
      byStatus,
      byPriority,
      assigned: assignedResult.assigned,
      unassigned: assignedResult.unassigned
    };
  }
}