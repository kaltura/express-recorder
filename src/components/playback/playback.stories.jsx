import { h, Component } from "preact";
import { storiesOf } from "@storybook/react";
import { Playback } from "./playback";
import { KalturaClient } from "kaltura-typescript-client";
import { Recorder } from "../recorder/recorder";

class LoadData extends Component {
    state = {
        stream: null,
        uploadMedia: false,
        doRecording: false,
        doPlayback: false
    };

    recordedBlobs = [];

    constructor(props) {
        super(props);

        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
    }

    componentDidMount() {
        const constraints = {
            audio: true,
            video: true
        };

        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then(stream => {
                return this.handleSuccess(stream);
            })
            .catch(this.handleError);
    }

    handleSuccess = s => {
        this.setState({ stream: s });
    };

    handleError = error => {
        console.log("handleError : " + error);
    };

    handleUpload = () => {
        this.setState({ uploadMedia: true });
    };

    toggleRecording = () => {
        this.setState(prevState => {
            return { doRecording: !prevState.doRecording };
        });
    };

    handleRecordingEnd = recordedBlobs => {
        this.recordedBlobs = recordedBlobs;
    };

    handlePlayback = () => {
        this.setState({ doPlayback: true });
    };

    render() {
        if (this.state.doPlayback) {
            const media = {
                blob: new Blob(this.recordedBlobs, { type: "video/webm" }),
                mimeType: "video/webm"
            };
            return (
                <Playback
                    partnerId={346151}
                    uiconfId={43398481}
                    media={media}
                />
            );
        }
        return (
            <div>
                <Recorder
                    video={true}
                    audio={true}
                    stream={this.state.stream}
                    onRecordingEnd={this.handleRecordingEnd}
                    doRecording={this.state.doRecording}
                />
                <button id="startRecord" onClick={this.toggleRecording}>
                    {this.state.doRecording && <span>Stop Recording</span>}
                    {!this.state.doRecording && <span>Start Recording</span>}
                </button>
                <button onClick={this.handleUpload}>Use This</button>
                <button onClick={this.handlePlayback}>Playback</button>
            </div>
        );
    }
}

//TODO load script first, only on callback create the element
storiesOf("Playback", module)
    .addDecorator(story => <div style={{ width: 858, height: 483}}>{story()}</div>)
    .addDecorator(story => {
        return (
            <div>
                <script
                    type="text/javascript"
                    src="https://cdnapisec.kaltura.com/p/346151/embedPlaykitJs/uiconf_id/43398481"
                />
                {story()}
            </div>
        );
    })
    .add("render a playback component", () => {
        return (
            <div>
                <LoadData />
            </div>
        );
    });
