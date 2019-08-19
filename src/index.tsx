import { h, render, Component } from "preact";
import { ExpressRecorder, ExpressRecorderProps } from "./components/app/expressRecorder";
import { version } from "./version";
export const create = (
    elementId: string,
    props: ExpressRecorderProps
): { destroy: () => void; instance: ExpressRecorder; version: string } => {
    const parent = document.getElementById(elementId);

    if (!parent) {
        throw new Error(`cannot find element with id '${elementId}'`);
    }

    let instance: any;
    let ref = (c: any) => {
        instance = c;
    };

    const child = render(<ExpressRecorder ref={ref} {...props} />, parent);

    return {
        destroy: () => {
            instance.destroy();
            render(null, parent, child);
        },
        instance,
        version
    };
};
