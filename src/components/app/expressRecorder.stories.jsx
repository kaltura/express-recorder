import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { ExpressRecorder } from "./expressRecorder";

storiesOf("Main App", module).add("widget default", () => {
    return (
        <div>
            <ExpressRecorder
                ks={""}
				app={""}
                serviceUrl={""}
				partnerId={}
				uiConfId={}
				playerUrl={""}
            />
        </div>
    );
});

