import { h, Component } from "preact";
import { storiesOf } from "@storybook/react";
import { Recorder } from "../../components/recorder/recorder";
import { Uploader } from "./uploader";
import { react } from "preact";
import { KalturaClient } from "kaltura-typescript-client";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/index";

class LoadData extends Component {
    state = {
        stream: null,
        uploadMedia: false,
        doRecording: false
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
        console.log("getUserMedia() got stream: ", s);
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

    handleDataAvailable = event => {
        if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
        }
    };

    render() {
        if (this.state.uploadMedia) {
            if (this.executed) {
                throw new Error("already executed");
            }

            this.executed = true;

            const uploader = new Uploader();
            const kClient = new KalturaClient(
                {
                    endpointUrl: "https://www.kaltura.com",
                    clientTag: "kms_client"
                },
                {
                    ks:
                        "djJ8MjMyNjgyMXzWAZO0pKZ5_CNbLyYK3QaJbNPx0ZtgyLDY5UXFMtzibXOIs22KO45MCiYKYUdBLHvQH2uRCPDIa78w5dWAVuLoaBN4a6AQA-bh-Rh3TkDRyhGf2L7jZ95kqlcdT9WKFYiNgZuZeAPLTHd-ghGL1rFoCZpxGvtsRHR5RAfCUGe1cw=="
                }
            );
            uploader.upload(
                kClient,
                KalturaMediaType.video,
                this.recordedBlobs,
                "Uploader test",
                entryId => {
                    console.log("done upload media. entryId: " + entryId);
                }
            );
        }

        return (
            <div>
                <Recorder
                    video={true}
                    audio={true}
                    stream={this.state.stream}
                    onDataAvailable={this.handleDataAvailable}
                    doRecording={this.state.doRecording}
                />
                <button id="startRecord" onClick={this.toggleRecording}>
                    {this.state.doRecording && <span>Stop Recording</span>}
                    {!this.state.doRecording && <span>Start Recording</span>}
                </button>
                <button onClick={this.handleUpload}>Use This</button>
            </div>
        );
    }
}

storiesOf("Uploader", module).add("upload recorded", () => <LoadData />);
