 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {RecordingTimer} from "./recordingTimer";



storiesOf("Recording Timer", module)
    .addDecorator(story => <div style={{ backgroundColor: '#333', width: '100%', height:'300px' }}>{story()}</div>)
    .add("render a recording timer", () => {
        return <RecordingTimer onButtonClick={() => console.log("clicked")}/>
    } );
