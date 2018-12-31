import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { ExpressRecorder } from "./ExpressRecorder";

storiesOf("Main App", module).add("widget default", () => {
    return (
        <div>
            <ExpressRecorder
                ks={"djJ8MjMyNjgyMXzwsnEk0vMaZxYsD2BEWT9v6Pxf3sGZQ-noaOCqnI9zr5rl43-52azXLkBA2-EQrBzDTAzLFP9y1F_qgUdt5zdJO_ge0yevZmwHvlJnbrnC8l1k4cyeQloByVm_kM2KHoBhzma_tjmXcSOOnfrvWnPW11Qr-f2YxiOv1gF4IjLllg=="}
				app={"kms_client"}
                serviceUrl={"https://www.kaltura.com"}
				partnerId={346151}
				uiConfId={43398481}
            />
        </div>
    );
});
