# node-worker-threads-pool

Asynchronous worker threads pool class using Node.js `worker_threads` module. ES6+ and TypeScript compatible.

## Usage

```typescript
import {WorkerPool} from "./WorkerPool";
import {CustomWorkerTask} from "./CustomWorker";

const testData = [
    {foo: 'bar1'},
    {foo: 'bar2'}
];

const workerPool = new WorkerPool(cpus().length, './build/CustomWorker.js');

await Promise.all(testData.map(async (testDataItem, i) => {
    const task: CustomWorkerTask = {
        taskId: 'task_' + i.toString(),
        data: testDataItem
    };

    await workerPool.scheduleTask(task);
}));

await workerPool.releaseWorkers();
```
