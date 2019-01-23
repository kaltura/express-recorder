import { Component, h } from "preact";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaConversionProfileType } from "kaltura-typescript-client/api/types/KalturaConversionProfileType";
import { KalturaClient } from "kaltura-typescript-client";
import { Uploader } from "../uploader/uploader";
import { Recorder } from "../recorder/recorder";
import { CountdownTimer } from "../countdown-timer/countdownTimer";
import { RecordingTimer } from "../recording-timer/recordingTimer";
import { ErrorScreen } from "../error-screen/errorScreen";
import { Settings } from "../settings/settings";
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
    constraints: Constraints;
};

export type Constraints = {
    video: any | boolean;
    audio: any | boolean;
};

const VIDEO_CONSTRAINT = {
    frameRate: { max: "20" },
    height: "483",
    width: "858"
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
            error: "",
            constraints: {
                video:
                    props.allowVideo !== false
                        ? {
                              ...VIDEO_CONSTRAINT
                          }
                        : false,
                audio: props.allowAudio !== false
            }
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
            serviceUrl,
            app,
            ks,
            playerUrl,
            uiConfId,
            partnerId
        } = this.props;

        this.checkProps();
        if (!this.isBrowserCompatible()) {
            return;
        }

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

        this.createStream(this.state.constraints);
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

        let isWebRTCSupported = false;
        [
            "RTCPeerConnection",
            "webkitRTCPeerConnection",
            "mozRTCPeerConnection",
            "RTCIceGatherer"
        ].forEach(function(item) {
            if (isWebRTCSupported) {
                return;
            }

            if (item in window) {
                isWebRTCSupported = true;
            }
        });

        if (!isWebRTCSupported) {
            this.setState({ error: notSupportedError });
            return false;
        }

        // MediaRecorder does not supported by Edge
        try {
            const temp = MediaRecorder.isTypeSupported({
                mimeType: "video/webm"
            });
        } catch (e) {
            this.setState({ error: notSupportedError });
            return false;
        }

        return true;
    };
    handleSuccess = (stream: MediaStream) => {
        this.setState({ stream: stream });
    };

    handleError = (error: string) => {
        this.setState({ error: error });
    };

    handleUpload = () => {
        this.setState({ doUpload: true });
    };

    handleRecordingEnd = (recordedBlobs: Blob[]) => {
        this.setState({ recordedBlobs: recordedBlobs });
    };

    getDefaultEntryName() {
        const { constraints } = this.state;
        if (constraints.video) {
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
    handleSettingsChange = (selectedCamera: any, selectedAudio: any) => {
        // check if something has been changed
        const { constraints } = this.state;
        if (
            ((selectedCamera && constraints.video) || // check if video was turn on/off
                (!selectedCamera && !constraints.video)) &&
            ((selectedAudio && constraints.audio) || // check if audio was turn on/off
                (!selectedAudio && !constraints.audio)) &&
            (!selectedCamera || // check if have different device IDs
                selectedCamera.deviceId === constraints.video.deviceId) &&
            (!selectedAudio || // check if have different device IDs
                selectedAudio.deviceId === constraints.audio.deviceId)
        ) {
            return;
        }

        let newConstraints: Constraints = { video: false, audio: false };
        if (selectedCamera) {
            newConstraints.video = {
                deviceId: selectedCamera.deviceId,
                ...VIDEO_CONSTRAINT
            };
        }
        if (selectedAudio) {
            newConstraints.audio = { deviceId: selectedAudio.deviceId };
        }

        this.createStream(newConstraints);
        this.setState({ constraints: newConstraints });
    };

    createStream = (constraints: Constraints) => {
        if (!constraints.video && !constraints.audio) {
            this.setState({
                error:
                    "Video and audio are disabled, at least one of them must be enabled."
            });
            return;
        }
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream: MediaStream) => {
                return this.handleSuccess(stream);
            })
            .catch(e =>
                this.handleError("Failed to allocate resource: " + e.message)
            );
    };

    render() {
        const {
            partnerId,
            uiConfId,
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
            error,
            constraints
        } = this.state;

        if (doUpload && !this.uploadedOnce) {
            this.uploadedOnce = true;
        }

        if (error !== "") {
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
                <div className={styles["settings-wrap"]}>
                    <Settings
                        selectedCamera={
                            stream ? stream.getVideoTracks()[0] : undefined
                        }
                        selectedAudio={
                            stream ? stream.getAudioTracks()[0] : undefined
                        }
                        allowVideo={constraints.video !== false}
                        allowAudio={constraints.audio !== false}
                        onSettingsChanged={this.handleSettingsChange}
                    />
                </div>
                <div>
                    <Recorder
                        video={constraints.video !== false}
                        stream={stream!}
                        onRecordingEnd={this.handleRecordingEnd}
                        doRecording={doRecording}
                        discard={doCountdown}
                        doPlayback={doPlayback}
                        partnerId={partnerId}
                        uiConfId={uiConfId}
                        onError={this.handleError}
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
                                    constraints.video
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
