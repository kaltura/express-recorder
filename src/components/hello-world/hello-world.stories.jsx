import { h } from "preact";
import { storiesOf } from "@storybook/react";
import { Test } from "../test/test";



storiesOf("hello world", module)
    .add("widget default", () => {
      return (
        <div>
        <h1>
    <Test className={'customText'} text={'YESH!'}></Test>
        </h1>
        </div>
      )
    });
