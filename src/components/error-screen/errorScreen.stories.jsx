 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {ErrorScreen} from "./errorScreen";


storiesOf("Error Screen", module)
    .add("render an error screen without title", () => (<ErrorScreen text={'A terrible error has occured'} ></ErrorScreen>))
    .add("render an error screen with title", () => (<ErrorScreen title={'Oh, No!'} text={'A terrible error has occured'} ></ErrorScreen>))
    .add("render an error screen with HTML text", () => (<ErrorScreen title={'Oh, No!'}
                                                                      text={'A terrible <a href="http://google.com">error</a> has occured'} ></ErrorScreen>))
    ;
