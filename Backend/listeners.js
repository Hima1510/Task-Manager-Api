const taskEvents = require('./events');

taskEvents.on('task-created', async ({ task, assignedUser }) => {
  try {
    // Simulate a slow notification without keeping the HTTP response open.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(
      `[Notification] Task "${task.title}" created at ${new Date().toISOString()} for ${assignedUser}`,
    );
  } catch (error) {
    taskEvents.emit('error', error, { event: 'task-created', taskId: task._id });
  }
});

taskEvents.on('task-deleted', ({ task, assignedUser }) => {
  console.log(
    `[Notification] Task "${task.title}" deleted at ${new Date().toISOString()} by ${assignedUser}`,
  );
});

// EventEmitter treats `error` specially; always register a listener before emitting it.
taskEvents.on('error', (error, context = {}) => {
  console.error(
    `[Notification error] ${context.event || 'background event'}${context.taskId ? ` for task ${context.taskId}` : ''}:`,
    error,
  );
});
