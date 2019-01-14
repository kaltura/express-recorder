import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { ExpressRecorder } from "./expressRecorder";

storiesOf("Main App", module).add("widget default", () => {
    return (
        <div>
            <ExpressRecorder
                ks={"djJ8MjMyNjgyMXwrU0-ndW2_CwVtklE1M6VLu3aShSDY6TZ56UusuapKyCT5u1Zd0CCKbD0p_e2cW09PxuSFdlfmrOa4xPwj5chke9LwTlfRy0BYWNXxTGpDld8DgzrdVD3_yvKHM83NTbyzs8eFu0Bdh2M52ewlQ1Cjd2rjUgYCsRI3CPwst-gyiQ=="}
				app={"kms_client"}
                serviceUrl={"https://www.kaltura.com"}
				partnerId={346151}
				uiConfId={43398481}
				playerUrl={"https://cdnapisec.kaltura.com"}
				maxRecordingTime={5}
            />
        </div>
    );
});

