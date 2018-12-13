import { h } from "preact";
import { storiesOf } from "@storybook/react";



storiesOf("Storybook With Preact", module)
    .add("render some text", () => <h1> I work </h1>);