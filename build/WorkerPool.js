"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerResultCode = exports.WorkerPool = void 0;
const os_1 = require("os");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const worker_threads_1 = require("worker_threads");
class WorkerPool {
    constructor(workerCount, workerPath) {
        this.availableWorkers = new Map();
        this.taskQueue = [];
        this.workers = [];
        this.workerFinished$ = new rxjs_1.Subject();
        if (workerCount > os_1.cpus().length) {
            console.warn('Creating more workers than available threads (' + os_1.cpus().length + ')');
        }
        for (let i = 0; i < workerCount; i++) {
            const worker = new worker_threads_1.Worker(workerPath);
            worker.on('message', (response) => __awaiter(this, void 0, void 0, function* () {
                if (response.resultCode === WorkerResultCode.INIT) {
                    this.availableWorkers.set(worker.threadId, worker);
                    this.workers.push(worker);
                    this.checkAllWorkersInitialized(workerCount);
                    return;
                }
                this.availableWorkers.set(worker.threadId, worker);
                this.workerFinished$.next(response);
                this.next();
            }));
        }
    }
    scheduleTask(task) {
        this.taskQueue.push(task);
        return new Promise((resolve, reject) => {
            this.workerFinished$.pipe(operators_1.filter(r => r.taskId === task.taskId), operators_1.first()).subscribe((response) => {
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
    releaseWorkers() {
        if (this.taskQueue.length > 0) {
            console.warn('Terminating worker while there are pending tasks in the queue');
        }
        if (this.availableWorkers.size < this.workers.length) {
            console.warn('Terminating worker while still running');
        }
        return Promise.all(this.workers.map(worker => worker.terminate()));
    }
    next() {
        if (this.taskQueue.length === 0) {
            return;
        }
        const [workerId, worker] = Array.from(this.availableWorkers).pop();
        this.availableWorkers.delete(workerId);
        worker.postMessage(this.taskQueue.shift());
    }
    checkAllWorkersInitialized(workerCount) {
        if (this.availableWorkers.size === workerCount) {
            while (this.availableWorkers.size > 0 && this.taskQueue.length > 0) {
                this.next();
            }
        }
    }
}
exports.WorkerPool = WorkerPool;
var WorkerResultCode;
(function (WorkerResultCode) {
    WorkerResultCode[WorkerResultCode["OK"] = 0] = "OK";
    WorkerResultCode[WorkerResultCode["ERROR"] = 1] = "ERROR";
    WorkerResultCode[WorkerResultCode["INIT"] = 2] = "INIT";
})(WorkerResultCode = exports.WorkerResultCode || (exports.WorkerResultCode = {}));
