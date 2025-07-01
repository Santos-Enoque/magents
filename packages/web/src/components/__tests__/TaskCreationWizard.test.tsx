import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCreationWizard } from '../TaskCreationWizard';
import { apiService } from '../../services/api';
import { TaskMasterTask } from '@magents/shared';

// Mock the API service
jest.mock('../../services/api');

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('TaskCreationWizard', () => {
  const mockProjectPath = '/test/project';
  const mockOnClose = jest.fn();
  const mockOnTaskCreated = jest.fn();
  
  const mockExistingTasks: TaskMasterTask[] = [
    {
      id: '1',
      title: 'Existing Task 1',
      description: 'Description 1',
      status: 'pending',
      priority: 'medium'
    },
    {
      id: '2',
      title: 'Existing Task 2',
      description: 'Description 2',
      status: 'done',
      priority: 'high'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the wizard with initial step', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByText('Choose a Task Template')).toBeInTheDocument();
  });

  it('navigates through wizard steps', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Step 1: Skip template selection
    fireEvent.click(screen.getByText(/Skip and create custom task/));
    expect(screen.getByText('Basic Information')).toBeInTheDocument();

    // Step 2: Fill basic information
    fireEvent.change(screen.getByPlaceholderText(/Implement user authentication/), {
      target: { value: 'Test Task Title' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what needs to be done/), {
      target: { value: 'Test task description with enough characters' }
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 3: Implementation Details
    expect(screen.getByText('Implementation Details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Step 4: Dependencies
    expect(screen.getByText('Task Dependencies')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Step 5: Subtasks
    expect(screen.getByText('Subtasks')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Step 6: Review
    expect(screen.getByText('Review Task Details')).toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Skip template
    fireEvent.click(screen.getByText(/Skip and create custom task/));

    // Try to proceed without filling required fields
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('allows template selection', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Select Feature Implementation template
    fireEvent.click(screen.getByText('Feature Implementation'));

    // Should move to basic information with pre-filled priority
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('medium')).toBeInTheDocument();
  });

  it('handles dependency selection', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Navigate to dependencies step
    fireEvent.click(screen.getByText(/Skip and create custom task/));
    fireEvent.change(screen.getByPlaceholderText(/Implement user authentication/), {
      target: { value: 'Test Task' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what needs to be done/), {
      target: { value: 'Test description with enough content' }
    });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    // Search for tasks
    const searchInput = screen.getByPlaceholderText('Search tasks by ID or title...');
    fireEvent.change(searchInput, { target: { value: 'Existing' } });
    fireEvent.focus(searchInput);

    // Should show matching tasks
    expect(screen.getByText('Existing Task 1')).toBeInTheDocument();
    expect(screen.getByText('Existing Task 2')).toBeInTheDocument();
  });

  it('handles subtask management', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Navigate to subtasks step
    fireEvent.click(screen.getByText(/Skip and create custom task/));
    fireEvent.change(screen.getByPlaceholderText(/Implement user authentication/), {
      target: { value: 'Test Task' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what needs to be done/), {
      target: { value: 'Test description with enough content' }
    });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    // Add subtask
    fireEvent.click(screen.getByText('Add Subtask'));
    
    const subtaskTitleInputs = screen.getAllByPlaceholderText('Subtask title');
    const subtaskDescInputs = screen.getAllByPlaceholderText('Subtask description');
    
    fireEvent.change(subtaskTitleInputs[0], { target: { value: 'Subtask 1' } });
    fireEvent.change(subtaskDescInputs[0], { target: { value: 'Subtask 1 description' } });
  });

  it('creates task successfully', async () => {
    const mockNewTask: TaskMasterTask = {
      id: '3',
      title: 'New Test Task',
      description: 'New test task description',
      status: 'pending',
      priority: 'medium'
    };

    mockApiService.createTaskMasterTask.mockResolvedValueOnce(mockNewTask);

    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Fill out the form
    fireEvent.click(screen.getByText(/Skip and create custom task/));
    fireEvent.change(screen.getByPlaceholderText(/Implement user authentication/), {
      target: { value: 'New Test Task' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what needs to be done/), {
      target: { value: 'New test task description' }
    });

    // Navigate to review
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    // Create task
    fireEvent.click(screen.getByText('Create Task'));

    await waitFor(() => {
      expect(mockApiService.createTaskMasterTask).toHaveBeenCalledWith(
        mockProjectPath,
        'New Test Task',
        'New test task description',
        'medium'
      );
      expect(mockOnTaskCreated).toHaveBeenCalledWith(expect.objectContaining({
        id: '3',
        title: 'New Test Task'
      }));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles task creation error', async () => {
    mockApiService.createTaskMasterTask.mockRejectedValueOnce(new Error('Failed to create task'));

    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    // Fill out the form
    fireEvent.click(screen.getByText(/Skip and create custom task/));
    fireEvent.change(screen.getByPlaceholderText(/Implement user authentication/), {
      target: { value: 'New Test Task' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what needs to be done/), {
      target: { value: 'New test task description' }
    });

    // Navigate to review
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    // Try to create task
    fireEvent.click(screen.getByText('Create Task'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create task')).toBeInTheDocument();
    });
  });

  it('closes wizard on cancel', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes wizard on escape key', () => {
    render(
      <TaskCreationWizard
        projectPath={mockProjectPath}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
        existingTasks={mockExistingTasks}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});