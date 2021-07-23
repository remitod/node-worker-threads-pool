import {cpus} from "os";
import {Subject} from "rxjs";
import {filter, first} from "rxjs/operators";
import {Worker} from "worker_threads";

export class WorkerPool {
    private readonly availableWorkers = new Map<number, Worker>();

    private readonly taskQueue: WorkerTask[] = [];

    private readonly workers: Worker[] = [];

    private workerFinished$ = new Subject<WorkerResponseMessage>();

    constructor(workerCount: number, workerPath: string) {
        if (workerCount > cpus().length) {
            console.warn('Creating more workers than available threads (' + cpus().length + ')');
        }

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(workerPath);

            worker.on('message', async (response: WorkerResponseMessage) => {
                if (response.resultCode === WorkerResultCode.INIT) {
                    this.availableWorkers.set(worker.threadId, worker);
                    this.workers.push(worker);
                    this.checkAllWorkersInitialized(workerCount);
                    return;
                }

                this.availableWorkers.set(worker.threadId, worker);
                this.workerFinished$.next(response);
                this.next();
            });
        }
    }

    scheduleTask(task: WorkerTask): Promise<WorkerResponseMessage> {
        this.taskQueue.push(task);

        return new Promise((resolve, reject) => {
            this.workerFinished$.pipe(filter(r => r.taskId === task.taskId), first()).subscribe((response) => {
                if (response.resultCode === WorkerResultCode.OK) {
                    resolve(response);
                    return;
                }

                reject();
            });

            if (this.availableWorkers.size > 0) {
                this.next();
            }
        });
    }

    releaseWorkers(): Promise<number[]> {
        if (this.taskQueue.length > 0) {
            console.warn('Terminating worker while there are pending tasks in the queue');
        }
        if (this.availableWorkers.size < this.workers.length) {
            console.warn('Terminating worker while still running');
        }
        return Promise.all(this.workers.map(worker => worker.terminate()));
    }

    private next(): void {
        if (this.taskQueue.length === 0) {
            return;
        }

        const [workerId, worker] = Array.from(this.availableWorkers).pop();
        this.availableWorkers.delete(workerId);

        worker.postMessage(this.taskQueue.shift());
    }

    private checkAllWorkersInitialized(workerCount: number): void {
        if (this.availableWorkers.size === workerCount) {
            while (this.availableWorkers.size > 0 && this.taskQueue.length > 0) {
                this.next();
            }
        }
    }
}

export interface WorkerTask {
    taskId: number | string;

    [key: string]: any;
}

export interface WorkerResponseMessage {
    taskId?: string;
    resultCode: WorkerResultCode;
}

export enum WorkerResultCode {
    OK,
    ERROR,
    INIT
}
