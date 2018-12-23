 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {CountdownTimer} from "./CountdownTimer";

storiesOf("Countdown Timer", module)
    .add("render a countdown timer", () => {
        document.getElementsByTagName('body')[0].style.backgroundColor = "#333";
        return <CountdownTimer initialValue={3} onCountdownComplete={() => console.log("done")}/>
    } );
