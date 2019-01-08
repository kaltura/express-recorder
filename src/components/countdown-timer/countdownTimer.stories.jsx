 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {CountdownTimer} from "./countdownTimer";

storiesOf("Countdown Timer", module)
    .addDecorator(story => <div style={{ backgroundColor: '#333', width: '100%', height:'100%' }}>{story()}</div>)
    .add("render a countdown timer", () => {
        return <CountdownTimer initialValue={3} onCountdownComplete={() => console.log("done")}/>
    } );
