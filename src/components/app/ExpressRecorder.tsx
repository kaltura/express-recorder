import { Component, h } from "preact";
import { KalturaMediaType } from 'kaltura-typescript-client/api/types/KalturaMediaType';
import { KalturaConversionProfileType } from 'kaltura-typescript-client/api/types/KalturaConversionProfileType';
import { KalturaClient } from "kaltura-typescript-client";
import { Uploader } from "../../utils/uploader/uploader";
import { Recorder } from "../recorder/recorder";

type Props = {
    ks: string;
    serviceUrl: string;
    app: string;
    conversionProfileId?: KalturaConversionProfileType;
    entryName?: string;
    allowVideo?: boolean;
    allowAudio?: boolean;
    doRecording?: boolean;
};

type State = {
    stream: MediaStream;
    uploadMedia: boolean;
    doRecording: boolean;
};

export class ExpressRecorder extends Component<Props, State> {

    static defaultProps = {
        conversionProfileId: KalturaConversionProfileType.media,
        allowVideo: true,
        allowAudio: true
    };

    recordedBlobs: Blob[] = [];
    uploadedOnce: boolean = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            stream: new MediaStream(),
            uploadMedia: false,
            doRecording: this.props.doRecording ? this.props.doRecording : false
        };

        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
    }

    componentDidMount() {
        const {allowVideo, allowAudio} = this.props;

        const constraints = {
            audio: allowAudio,
            video: allowVideo
        };

        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then(stream => {
                return this.handleSuccess(stream);
            })
            .catch(this.handleError);
    }

    handleSuccess = (stream: MediaStream) => {
        console.log("getUserMedia() got stream: ", stream);
        this.setState({ stream: stream });
    };

    handleError = (error: MediaStreamError) => {
        console.log("handleError : " + error);
    };

    handleUpload = () => {
        this.setState({ uploadMedia: true });
    };

    toggleRecording = () => {
        this.setState((prevState: State) => {
            return { doRecording: !prevState.doRecording };
        });
    };

    handleRecordingEnd = (recordedBlobs: Blob[]) => {
        this.recordedBlobs = recordedBlobs;
    };

    createClient = () => {
        const {ks, serviceUrl, app} = this.props;
        return new KalturaClient(
            {
                endpointUrl: serviceUrl,
                clientTag: app
            },
            {
                ks: ks
            }
        );
    };

    render() {
        const {entryName} = this.props;

        if (this.state.uploadMedia) {
            if (this.uploadedOnce) {
                throw new Error("already executed");
            }

            this.uploadedOnce = true;

            const uploader = new Uploader();
            const kClient = this.createClient();

            uploader.upload(
                kClient,
                KalturaMediaType.video,
                this.recordedBlobs,
                "Uploader test",
                (entryId: string) => {
                    console.log("done upload media. entryId: " + entryId);
                },
                (e:Error) => {console.log(e)}
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
            </div>
        );
    }
}
