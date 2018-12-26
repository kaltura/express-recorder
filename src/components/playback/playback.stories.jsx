 import { h } from "preact";
import { storiesOf } from "@storybook/react";
import {Playback} from "./playback";


function createMedia() {
    let blob = new Blob(
        ["file:///cyan.webm"],  //TODO path?
        {"type": "video/webm"});
    return {blob:blob, mimeType: "video/webm"};
}

//TODO load script first, only on callback create the element
storiesOf("Playback", module)
    .addDecorator(story => { return (<div><script type="text/javascript" src="https://cdnapisec.kaltura.com/p/346151/embedPlaykitJs/uiconf_id/43398481"></script>{story()}</div>)})
    .add("render a playback component", () => {
        const media = createMedia();
        return (<Playback partnerId={346151} uiconfId={43398481} media={media}></Playback>);
    });
