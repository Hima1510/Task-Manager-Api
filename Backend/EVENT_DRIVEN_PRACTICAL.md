# Practical 10: Event Driven Task Notifications

The backend uses Node.js's built-in `EventEmitter` for process-local task notifications. `events.js` exports one shared emitter, and `listeners.js` registers its handlers once at startup.

After a task is saved, `POST /tasks` logs the response timestamp, sends the `201` response, then emits `task-created`. The listener waits two seconds before logging the task title, notification timestamp, and assigned user's email (or ID). `DELETE /tasks/:id` similarly emits `task-deleted` after its success response.

Example console ordering:

```text
[API] Task creation response sent at 2026-10-20T10:00:00.000Z
[Notification] Task "Finish report" created at 2026-10-20T10:00:02.004Z for student@example.com
```

`emit()` calls listeners synchronously until they yield; it does not wait for an async listener's promise or timer. The two-second delay therefore occurs after the route has ended the response. Keeping slow work directly in the route would delay that response. The listener reports failures through the registered `error` event listener.

This in-process approach fits a small learning application. Events are lost if the process exits, and separate server instances do not share them. Production workloads that need durable delivery, retries, or horizontal scaling should use a message broker or job queue.

To observe the behavior, create a task through the authenticated API and compare the `[API]` and `[Notification]` timestamps in the backend console. Delete a task to see its separate notification.
