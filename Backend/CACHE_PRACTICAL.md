# Practical 9: In-Memory Caching and Query Optimization

## Implementation

- `GET /tasks` caches each authenticated user's newest-first task list for 60 seconds.
- `GET /tasks/:id` has a separate per-user, per-task cache entry.
- Successful create, update, and delete operations invalidate the affected user's list cache; update and delete also invalidate that task's detail entry.
- Responses include `X-Cache: HIT` or `X-Cache: MISS`. Authenticated `GET /debug/cache` reports process lifetime hit/miss counts, active key count, and TTL.
- Cached reads use Mongoose `.lean()` results. A compound `{ user: 1, createdAt: -1 }` index supports the list filter and sort.

Cache entries are process-local. Restarting the server clears them, and multiple server instances do not share invalidations or entries; use a shared cache such as Redis for that deployment model.

## Response-time measurements

Record the Postman or Thunder Client **Time** values against the same database and dataset. The measurements are intentionally left blank because response times must be observed on the student's machine; values must not be estimated.

| Request condition | Reading 1 (ms) | Reading 2 (ms) | Reading 3 (ms) | Average (ms) |
|---|---:|---:|---:|---:|
| Uncached (clear cache before each request) | — | — | — | — |
| Cached (first request warms cache; record subsequent hits) | — | — | — | — |

To collect uncached readings without changing code, restart the backend before each request (the in-memory cache is cleared). For cached readings, send one warm-up request, then record the next three requests within 60 seconds. Confirm hits using the `X-Cache` response header.

## Analysis

Every successful write must invalidate relevant entries. Without invalidation, a read could return the old task list or task detail until the TTL expires, making updates appear lost and deleted tasks reappear temporarily. A 60-second TTL is a reasonable lab default: longer TTLs improve hit rates but allow stale data to remain longer if an invalidation path is missed; shorter TTLs improve freshness but increase database reads. Measure on the same dataset because small collections and network variation can hide the performance difference.
