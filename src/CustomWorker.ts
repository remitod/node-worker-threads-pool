import {parentPort} from 'worker_threads';
import {WorkerResultCode, WorkerTask} from "./WorkerPool";

export interface CustomWorkerTask extends WorkerTask {
    data: string;
}

(async () => {
    // Worker async initialization step
    /*
     * Put here everything that needs to be initialized before a task can be run by the worker
     */
    parentPort.postMessage({resultCode: WorkerResultCode.INIT});

    // Worker main function definition
    async function CustomWorker(task: CustomWorkerTask) {
        /*
         * Put here the worker code which can be asynchronous
         */
    }

    // Worker messaging wrapper
    parentPort.on('message', (task) => {
        try {
            CustomWorker(task).then(() => {
                parentPort.postMessage({taskId: task.taskId, resultCode: WorkerResultCode.OK});
            }, () => {
                parentPort.postMessage({taskId: task.taskId, resultCode: WorkerResultCode.ERROR});
            }).catch(() => {
                parentPort.postMessage({taskId: task.taskId, resultCode: WorkerResultCode.ERROR});
            });
        } catch (e) {
            parentPort.postMessage({taskId: task.taskId, resultCode: WorkerResultCode.ERROR});
        }
    });
})();
