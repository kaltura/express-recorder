import { ExpressRecorder } from "../components/app/expressRecorder";

export type ExpressRecorderEvent = {
    target: ExpressRecorder;
    type: string;
    detail?: Record<string, any>;
};

type ExpressRecorderEventListener = (event: ExpressRecorderEvent) => void;

export default class PubSub {
    target: ExpressRecorder;
    listeners: Record<string, ((event: ExpressRecorderEvent) => void)[]> = {};

    constructor(target: ExpressRecorder) {
        this.target = target;
    }

    addEventListener(eventType: string, listener: ExpressRecorderEventListener) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(listener);
    }

    removeEventListener(eventType: string, listener: ExpressRecorderEventListener) {
        if (!this.listeners[eventType]) {
            return;
        }
        this.listeners[eventType] = this.listeners[eventType].filter(
            callback => callback === listener
        );
    }

    dispatchEvent(eventType: string, detail?: ExpressRecorderEvent["detail"]) {
        const list = this.listeners[eventType];
        if (!list) {
            return;
        }
        const event: ExpressRecorderEvent = {
            target: this.target,
            type: eventType,
            detail: detail
        };
        list.forEach(listener => {
            listener(event);
        });
    }
}
