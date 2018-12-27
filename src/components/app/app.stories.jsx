import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { Test } from "../test/test";
import App from "./index";



storiesOf("hello world", module)
    .add("widget default", () => {
      return (
        <div>
        <App/>
        </div>
      )
    });
