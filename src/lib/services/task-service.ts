import { Context, Effect, Layer } from 'effect';
import type { TaskStatus } from '@/lib/types';

interface TaskState {
  status: TaskStatus;
  error?: string;
}

const taskStore = new Map<string, TaskState>();
const taskEventTarget = new EventTarget();

export class TaskService extends Context.Tag('TaskService')<
  TaskService,
  {
    readonly getTaskStatus: (id: string) => Effect.Effect<TaskStatus, Error>;
    readonly cancelTaskRequest: (
      id: string,
    ) => Effect.Effect<TaskStatus, Error>;
    readonly getTaskError: (id: string) => Effect.Effect<string | null, Error>;
    readonly setTaskStatus: (
      id: string,
      status: TaskStatus,
      error?: string,
    ) => Effect.Effect<void>;
    readonly onTaskStatusChanged: (
      callback: (id: string, status: TaskStatus) => void,
    ) => () => void;
  }
>() {}

export const TaskServiceLive = Layer.succeed(TaskService, {
  getTaskStatus: (id) =>
    Effect.sync(() => {
      const task = taskStore.get(id);
      if (!task) {
        return 'Completed' as TaskStatus;
      }
      return task.status;
    }),

  cancelTaskRequest: (id) =>
    Effect.sync(() => {
      const task = taskStore.get(id);
      if (task) {
        task.status = 'Cancelled';
        taskEventTarget.dispatchEvent(
          new CustomEvent('taskStatusChanged', {
            detail: { id, status: 'Cancelled' },
          }),
        );
      }
      return 'Cancelled' as TaskStatus;
    }),

  getTaskError: (id) =>
    Effect.sync(() => {
      const task = taskStore.get(id);
      return task?.error ?? null;
    }),

  setTaskStatus: (id, status, error) =>
    Effect.sync(() => {
      taskStore.set(id, { status, error });
      taskEventTarget.dispatchEvent(
        new CustomEvent('taskStatusChanged', {
          detail: { id, status },
        }),
      );
    }),

  onTaskStatusChanged: (callback) => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      callback(detail.id, detail.status);
    };
    taskEventTarget.addEventListener('taskStatusChanged', handler);
    return () => {
      taskEventTarget.removeEventListener('taskStatusChanged', handler);
    };
  },
});
