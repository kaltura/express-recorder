import { Component, h } from "preact";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaConversionProfileType } from "kaltura-typescript-client/api/types/KalturaConversionProfileType";
import { KalturaClient } from "kaltura-typescript-client";
import { Uploader } from "../../utils/uploader/uploader";
import { Recorder } from "../recorder/recorder";
import { CountdownTimer } from "../countdown-timer/CountdownTimer";
import { RecordingTimer } from "../recording-timer/RecordingTimer";
import { ErrorScreen } from "../error-screen/error-screen";
const styles = require("./style.scss");

type Props = {
    ks: string;
    serviceUrl: string;
    app: string;
    conversionProfileId?: KalturaConversionProfileType;
    entryName?: string;
    allowVideo?: boolean;
    allowAudio?: boolean;
    partnerId: number;
    uiConfId: number;
};

type State = {
    stream: MediaStream;
    doUpload: boolean;
    doRecording: boolean;
    doCountdown: boolean;
    doPlayback: boolean;
    recordedBlobs: Blob[];
    error: string | undefined;
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
            doUpload: false,
            doRecording: false,
            doCountdown: false,
            recordedBlobs: [],
            doPlayback: false,
            error: undefined
        };

        // load player lib
        const tag = document.createElement("script");
        tag.async = true;
        tag.src = `https://cdnapisec.kaltura.com/p/${
            props.partnerId
        }/embedPlaykitJs/uiconf_id/${props.uiConfId}`;
        tag.type = "text/javascript";
        document.body.appendChild(tag);

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
        this.setState({ stream: stream });
    };

    handleError = (error: MediaStreamError | Error) => {
        this.setState({
            error: "Failed: " + error.name + ": " + error.message
        });
    };

    handleUpload = () => {
        this.setState({ doUpload: true });
    };

    handleRecordingEnd = (recordedBlobs: Blob[]) => {
        this.setState({ recordedBlobs: recordedBlobs });
    };

    getDefaultEntryName() {
        const { allowVideo } = this.props;
        if (allowVideo) {
            return "Video Recording - " + new Date();
        } else {
            return "Audio Recording - " + new Date();
        }
    }

    uploadMedia = () => {
        const { ks, serviceUrl, app, entryName } = this.props;
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
            entryName ? entryName : this.getDefaultEntryName(),
            (entryId: string) => {
                console.log("done upload media. entryId: " + entryId);
            },
            (e: Error) => {
                this.handleError(e);
            }
        );

        this.setState({ doUpload: false });
    };

    handleStartClick = () => {
        this.setState({ doCountdown: true });
    };
    handleStopClick = () => {
        this.setState({ doRecording: false, doPlayback: true });
    };
    handleCancelClick = () => {
        this.setState({ doCountdown: false });
    };
    handleResetClick = () => {
        this.uploadedOnce = false;
        this.setState({
            recordedBlobs: [],
            doCountdown: true,
            doPlayback: false
        });
    };
    handleCountdownComplete = () => {
        if (this.state.doCountdown) {
            this.setState({ doCountdown: false, doRecording: true });
        }
    };

    render() {
        const { partnerId, uiConfId } = this.props;
        const {
            doCountdown,
            doUpload,
            stream,
            doRecording,
            recordedBlobs,
            doPlayback,
            error
        } = this.state;

        if (doUpload) {
            this.uploadedOnce = true;
            this.uploadMedia();
        }

        if (error) {
            return (
                <div class={`express-recorder ${styles["express-recorder"]}`}>
                    {error && <ErrorScreen text={error} />}
                </div>
            );
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
                        discard={doCountdown}
                        doPlayback={doPlayback}
                        partnerId={partnerId}
                        uiConfId={uiConfId}
                    />
                </div>
                {doCountdown && (
                    <div className={styles["express-recorder__countdown"]}>
                        <CountdownTimer
                            initialValue={3}
                            onCountdownComplete={this.handleCountdownComplete}
                        />
                    </div>
                )}
                <div className={styles["express-recorder__controls"]}>
                    {!doRecording &&
                        !doCountdown &&
                        recordedBlobs.length === 0 && (
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
                    {doCountdown && (
                        <button
                            className={`controls__cancel ${
                                styles["controls__cancel"]
                            }`}
                            onClick={this.handleCancelClick}
                            aria-label="Cancel"
                        >
                            Cancel
                        </button>
                    )}
                    {!doRecording && recordedBlobs.length > 0 && (
                        <div
                            className={`${styles["express-recorder__bottom"]}`}
                        >
                            <button
                                className={`${styles["bottom__btn"]} ${
                                    styles["btn__reset"]
                                }`}
                                onClick={this.handleResetClick}
                                aria-label="Record Again"
                            >
                                Record Again
                            </button>
                            {!this.uploadedOnce && (
                                <button
                                    className={`${styles["bottom__btn"]} ${
                                        styles["btn__save"]
                                    }`}
                                    onClick={this.handleUpload}
                                    aria-label="Use This"
                                >
                                    Use This
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
