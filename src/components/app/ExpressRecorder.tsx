import { Component, h } from "preact";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaConversionProfileType } from "kaltura-typescript-client/api/types/KalturaConversionProfileType";
import { KalturaClient } from "kaltura-typescript-client";
import { Uploader } from "../../utils/uploader/uploader";
import { Recorder } from "../recorder/recorder";
import { CountdownTimer } from "../countdown-timer/CountdownTimer";
import { RecordingTimer } from "../recording-timer/RecordingTimer";
const styles = require("./style.scss");

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
    showCountdown: boolean;
    recordedBlobs: Blob[];
};

export class ExpressRecorder extends Component<Props, State> {
    static defaultProps = {
        conversionProfileId: KalturaConversionProfileType.media,
        allowVideo: true,
        allowAudio: true
    };

    uploadedOnce: boolean = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            stream: new MediaStream(),
            uploadMedia: false,
            doRecording: this.props.doRecording
                ? this.props.doRecording
                : false,
            showCountdown: false,
            recordedBlobs: []
        };

        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
        this.handleStartClick = this.handleStartClick.bind(this);
    }

    componentDidMount() {
        const { allowVideo, allowAudio } = this.props;

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

    handleRecordingEnd = (recordedBlobs: Blob[]) => {
        this.setState({ recordedBlobs: recordedBlobs });
    };

    uploadMedia = () => {
        const { ks, serviceUrl, app } = this.props;
        const { recordedBlobs } = this.state;
        const uploader = new Uploader();
        const kClient = new KalturaClient(
            {
                endpointUrl: serviceUrl,
                clientTag: app
            },
            {
                ks: ks
            }
        );

        uploader.upload(
            kClient,
            KalturaMediaType.video,
            recordedBlobs,
            "Uploader test",
            (entryId: string) => {
                console.log("done upload media. entryId: " + entryId);
            },
            (e: Error) => {
                console.log(e);
            }
        );
    };

    handleStartClick = () => {
        this.setState({ showCountdown: true });
    };
    handleStopClick = () => {
        this.setState({ doRecording: false });
    };
    handleCancelClick = () => {
        this.setState({ showCountdown: false });
    };
    handleResetClick = () => {
        this.setState({recordedBlobs: [], showCountdown: true})
    };
    handleCountdownComplete = () => {
        if (this.state.showCountdown) {
            this.setState({ showCountdown: false, doRecording: true });
        }
    };

    render() {
        const { entryName } = this.props;
        const {
            showCountdown,
            uploadMedia,
            stream,
            doRecording,
            recordedBlobs
        } = this.state;

        if (uploadMedia) {
            if (this.uploadedOnce) {
                throw new Error("already executed");
            }
            this.uploadedOnce = true;
            this.uploadMedia();
        }

        return (
            <div className={`express-recorder ${styles["express-recorder"]}`}>
                <div>
                    <Recorder
                        video={true}
                        audio={true}
                        stream={stream}
                        onRecordingEnd={this.handleRecordingEnd}
                        doRecording={doRecording}
                        discard={showCountdown}
                    />
                </div>
                {showCountdown && (
                    <div className={styles["express-recorder__countdown"]}>
                        <CountdownTimer
                            initialValue={3}
                            onCountdownComplete={this.handleCountdownComplete}
                        />
                    </div>
                )}
                <div className={styles["express-recorder__controls"]}>
                    {!doRecording && !showCountdown && recordedBlobs.length === 0 && (
                        <button
                            className={styles["controls__start"]}
                            id="startRecord"
                            onClick={this.handleStartClick}
                            label={"Start Recording"}
                            aria-label="Start Recording"
                        />
                    )}
                    {doRecording && (
                        <RecordingTimer onButtonClick={this.handleStopClick} />
                    )}
                    {showCountdown && (
                        <button
                            className={`controls__cancel ${
                                styles["controls__cancel"]
                            }`}
                            onClick={this.handleCancelClick}
                            aria-lable="Cancel"
                        >
                            Cancel
                        </button>
                    )}
                </div>
                {!doRecording && recordedBlobs.length > 0 && (
                    <div className={`${styles["express-recorder__bottom"]}`}>
                        <button
                            className={`${styles["bottom__btn"]} ${
                                styles["btn__reset"]
                            }`}
                            onClick={this.handleResetClick}
                            aria-lable="Record Again"
                        >
                            Record Again
                        </button>
                        <button
                            className={`${styles["bottom__btn"]} ${
                                styles["btn__save"]
                            }`}
                            onClick={this.handleUpload}
                            aria-label="Use This"
                        >
                            Use This
                        </button>
                    </div>
                )}
            </div>
        );
    }
}
