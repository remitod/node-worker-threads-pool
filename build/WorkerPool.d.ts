export declare class WorkerPool {
    private readonly availableWorkers;
    private readonly taskQueue;
    private readonly workers;
    private workerFinished$;
    constructor(workerCount: number, workerPath: string);
    scheduleTask(task: WorkerTask): Promise<WorkerResponseMessage>;
    releaseWorkers(): Promise<number[]>;
    private next;
    private checkAllWorkersInitialized;
}
export interface WorkerTask {
    taskId: number | string;
    [key: string]: any;
}
export interface WorkerResponseMessage {
    taskId?: string;
    resultCode: WorkerResultCode;
}
export declare enum WorkerResultCode {
    OK = 0,
    ERROR = 1,
    INIT = 2
}
