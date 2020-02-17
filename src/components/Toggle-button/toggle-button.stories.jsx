 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {ToggleButton} from "./ToggleButton";


storiesOf("Toggle Button", module)
    .addDecorator(story => <div style={{ width: 858, height: 483}}>{story()}</div>)
    .add("render a toggle button with text only", () => (<ToggleButton text={'Do You'} id={'test'}></ToggleButton>))
    .add("render a toggle button with text and name", () => (<ToggleButton text={'Do You'} id={'test'} name={'MyForm[toggle]'}></ToggleButton>))
    .add("render a toggle button with text and a different text for screen reader", () => (<ToggleButton text={'Do You'} id={'test'} screenReaderText={'why oh why'}></ToggleButton>));
