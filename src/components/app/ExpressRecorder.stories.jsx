import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { ExpressRecorder } from "./ExpressRecorder";

storiesOf("Main App", module).add("widget default", () => {
    return (
        <div>
            <ExpressRecorder
                ks={"djJ8MjMyNjgyMXznryAkEePj9KuhgxVcBuMNb8GYsz1RpKupB08hpTuONZ6nc3f76aSiVKTWvxjS83TFPJYDzuvR6S-FXaYyqAIIf77LpyvSrS2DLijqRWBztBCvim4nA1wD_OwWBVuWvjQLdjWrMRxt89Gcxjg9o_k7vIWbmr93zjyeqzVFkrHq1A=="}
				app={"kms_client"}
                serviceUrl={"https://www.kaltura.com"}
            />
        </div>
    );
});
