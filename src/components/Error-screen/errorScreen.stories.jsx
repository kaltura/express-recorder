 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {ErrorScreen} from "./ErrorScreen";


storiesOf("Error Screen", module)
    .addDecorator(story => <div style={{ width: 858, height: 483}}>{story()}</div>)
    .add("render an error screen without title", () => (<ErrorScreen text={'A terrible error has occured'} ></ErrorScreen>))
    .add("render an error screen with title", () => (<ErrorScreen title={'Oh, No!'} text={'A terrible error has occured'} ></ErrorScreen>))
    .add("render an error screen with HTML text", () => (<ErrorScreen title={'Oh, No!'}
                                                                      text={'A terrible <a href="http://google.com">error</a> has occured'} ></ErrorScreen>))
    ;
