import { Component, h } from "preact";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaConversionProfileType } from "kaltura-typescript-client/api/types/KalturaConversionProfileType";
import { KalturaClient } from "kaltura-typescript-client";
import { Uploader } from "../uploader/uploader";
import { Recorder } from "../recorder/recorder";
import { CountdownTimer } from "../countdown-timer/countdownTimer";
import { RecordingTimer } from "../recording-timer/recordingTimer";
import { ErrorScreen } from "../error-screen/errorScreen";
const DetectRTC = require("../../../node_modules/detectrtc");
const styles = require("./style.scss");

type Props = {
    ks: string;
    serviceUrl: string;
    app: string; // parent app for client creation
    playerUrl: string;
    partnerId: number;
    uiConfId: number; // playerId for playback
    conversionProfileId?: number; // conversion profile for media upload
    entryName?: string;
    allowVideo?: boolean; // whether to enable video recording
    allowAudio?: boolean; // whether to enable audio recording
    maxRecordingTime?: number;
};

type State = {
    stream: MediaStream | undefined;
    doUpload: boolean;
    doRecording: boolean;
    doCountdown: boolean;
    doPlayback: boolean;
    recordedBlobs: Blob[];
    error: string;
};

type Constraints = {
    video: object | boolean;
    audio: boolean;
};

/**
 * This is the main component of the widget - contains the main flow.
 */
export class ExpressRecorder extends Component<Props, State> {
    static defaultProps = {
        conversionProfileId: KalturaConversionProfileType.media,
        allowVideo: true,
        allowAudio: true
    };

    uploadedOnce: boolean = false; // to prevent user from continue recording after the record has been uploaded
    kClient: KalturaClient | undefined;

    constructor(props: Props) {
        super(props);

        this.state = {
            stream: undefined,
            doUpload: false,
            doRecording: false,
            doCountdown: false,
            recordedBlobs: [],
            doPlayback: false,
            error: ""
        };

        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
        this.handleStartClick = this.handleStartClick.bind(this);
        this.checkProps = this.checkProps.bind(this);
        this.isBrowserCompatible = this.isBrowserCompatible.bind(this);
    }

    componentDidMount() {
        const {
            allowVideo,
            allowAudio,
            serviceUrl,
            app,
            ks,
            playerUrl,
            uiConfId,
            partnerId
        } = this.props;

        this.checkProps();
        if (!this.isBrowserCompatible()) {
            return
        }

        const constraints: Constraints = {
            audio: allowAudio ? true : false,
            video: allowVideo ? { frameRate: "15" } : false
        };

        //create client for uploading
        this.kClient = new KalturaClient(
            {
                endpointUrl: serviceUrl,
                clientTag: app
            },
            {
                ks: ks
            }
        );

        if (!this.kClient) {
            this.setState({ error: "Cannot connect to Kaltura server" });
        }

        // load player lib
        const tag = document.createElement("script");
        tag.async = true;
        tag.src =
            playerUrl + `/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiConfId}`;
        tag.type = "text/javascript";
        document.body.appendChild(tag);

        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream: MediaStream) => {
                return this.handleSuccess(stream);
            })
            .catch(this.handleError);
    }

    checkProps = () => {
        const {
            serviceUrl,
            app,
            ks,
            playerUrl,
            uiConfId,
            partnerId
        } = this.props;

        if (
            !serviceUrl ||
            !app ||
            !ks ||
            !playerUrl ||
            !uiConfId ||
            !partnerId
        ) {
            let message = "Missing props: ";
            message += !serviceUrl ? "serviceUrl; " : "";
            message += !app ? "app; " : "";
            message += !ks ? "ks; " : "";
            message += !playerUrl ? "playerUrl; " : "";
            message += !uiConfId ? "uiConfId; " : "";
            message += !partnerId ? "partnerId; " : "";
            this.setState({ error: message });
        }
    };

    isBrowserCompatible = () => {
        const notSupportedError =
            "<b>Browser is not webRTC supported</b><br /><a href='https://webrtc.org/'>Click Here</a> to learn about supported browsers";
        if (!DetectRTC.isWebRTCSupported) {
            this.setState({ error: notSupportedError });
            return false;
        }

        try {
            const temp = MediaRecorder.isTypeSupported({ mimeType: "video/webm" });
        } catch (e) {
            this.setState({ error: notSupportedError });
            return false
        }

        return true
    };
    handleSuccess = (stream: MediaStream) => {
        this.setState({ stream: stream });
    };

    handleError = (error: MediaStreamError | Error) => {
        this.setState({
            error: error.name + ": " + (error.message ? error.message : "")
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
        const {
            partnerId,
            uiConfId,
            allowVideo,
            entryName,
            ks,
            serviceUrl,
            maxRecordingTime
        } = this.props;
        const {
            doCountdown,
            doUpload,
            stream,
            doRecording,
            recordedBlobs,
            doPlayback,
            error
        } = this.state;

        if (doUpload && !this.uploadedOnce) {
            this.uploadedOnce = true;
        }

        if (error != "") {
            return (
                <div
                    className={`express-recorder ${styles["express-recorder"]}`}
                >
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
                        stream={stream!}
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
                <div
                    className={`express-recorder__controls ${
                        styles["express-recorder__controls"]
                    }`}
                >
                    {!doRecording &&
                        !doCountdown &&
                        recordedBlobs.length === 0 && (
                            <button
                                className={`controls__start ${
                                    styles["controls__start"]
                                }`}
                                id="startRecord"
                                onClick={this.handleStartClick}
                                aria-label={"Start Recording"}
                                tabIndex={0}
                            />
                        )}
                    {doRecording && (
                        <RecordingTimer
                            onButtonClick={this.handleStopClick}
                            maxRecordingTime={maxRecordingTime}
                        />
                    )}
                    {doCountdown && (
                        <button
                            className={`controls__cancel ${
                                styles["controls__cancel"]
                            }`}
                            onClick={this.handleCancelClick}
                            tabIndex={0}
                        >
                            Cancel
                        </button>
                    )}
                    {!doRecording &&
                        recordedBlobs.length > 0 &&
                        !this.uploadedOnce && (
                            <div
                                className={`${
                                    styles["express-recorder__bottom"]
                                }`}
                            >
                                <button
                                    className={`btn btn__reset ${
                                        styles["bottom__btn"]
                                    } ${styles["btn__reset"]}`}
                                    onClick={this.handleResetClick}
                                    tabIndex={0}
                                >
                                    Record Again
                                </button>
                                {!this.uploadedOnce && (
                                    <button
                                        className={`btn btn-primary btn__save ${
                                            styles["bottom__btn"]
                                        } ${styles["btn__save"]}`}
                                        onClick={this.handleUpload}
                                        tabIndex={0}
                                    >
                                        Use This
                                    </button>
                                )}
                            </div>
                        )}
                    {doUpload && (
                        <div
                            className={`progress-bar ${styles["progress-bar"]}`}
                        >
                            <Uploader
                                client={this.kClient}
                                onError={this.handleError}
                                mediaType={
                                    allowVideo
                                        ? KalturaMediaType.video
                                        : KalturaMediaType.audio
                                }
                                recordedBlobs={recordedBlobs}
                                entryName={
                                    entryName
                                        ? entryName
                                        : this.getDefaultEntryName()
                                }
                                serviceUrl={serviceUrl}
                                ks={ks}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
