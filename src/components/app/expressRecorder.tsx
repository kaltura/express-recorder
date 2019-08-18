import { Component, h } from "preact";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaConversionProfileType } from "kaltura-typescript-client/api/types/KalturaConversionProfileType";
import { KalturaClient } from "kaltura-typescript-client";
import { Recorder } from "../recorder/recorder";
import { CountdownTimer } from "../countdown-timer/countdownTimer";
import { RecordingTimer } from "../recording-timer/recordingTimer";
import { ErrorScreen } from "../error-screen/errorScreen";
import { Settings } from "../settings/settings";
import { RecorderEvents } from "./RecorderEvents";
import PubSub, { ExpressRecorderEvent } from "../../services/PubSub";
import { UploadUI } from "../uploader/uploadUI";
import { UploadManager } from "../uploader/uploadManager";
const styles = require("./style.scss");

export type ExpressRecorderProps = {
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
    browserNotSupportedText?: string;
    maxRecordingTime?: number;
    showUploadUI?: boolean;
};

type State = {
    stream: MediaStream | undefined;
    doUpload: boolean;
    doRecording: boolean;
    doCountdown: boolean;
    doPlayback: boolean;
    abortUpload: boolean;
    recordedBlobs: Blob[];
    error: string;
    constraints: Constraints;
    uploadStatus: { loaded: number; total: number };
};

export type Constraints = {
    video: any | boolean;
    audio: any | boolean;
};

const VIDEO_CONSTRAINT = {
    frameRate: "15",
    height: "483",
    width: "858"
};

/**
 * This is the main component of the widget - contains the main flow.
 */
export class ExpressRecorder extends Component<ExpressRecorderProps, State> {
    static defaultProps = {
        conversionProfileId: KalturaConversionProfileType.media,
        allowVideo: true,
        allowAudio: true,
        showUploadUI: true
    };

    uploadedOnce: boolean = false; // to prevent user from continue recording after the record has been uploaded
    kClient: KalturaClient | undefined;
    dispatcher: PubSub = new PubSub(this);

    constructor(props: ExpressRecorderProps) {
        super(props);

        this.state = {
            stream: undefined,
            doUpload: false,
            doRecording: false,
            doCountdown: false,
            abortUpload: false,
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
            },
            uploadStatus: { loaded: 0, total: 0 }
        };

        this.saveStream = this.saveStream.bind(this);
        this.handleError = this.handleError.bind(this);
        this.initiateUpload = this.initiateUpload.bind(this);
        this.handleStartClick = this.handleStartClick.bind(this);
        this.checkProps = this.checkProps.bind(this);
        this.isBrowserCompatible = this.isBrowserCompatible.bind(this);
    }

    /* =====================================================================
     * start Public API
     * ======================================================================
     */

    /**
     * clear any existing recording and start a new one
     */
    startRecording = () => {
        const { recordedBlobs } = this.state;
        if (recordedBlobs.length) {
            this.recordAgain();
        }
        this.handleStartClick();
    };

    /**
     * stop the active recording
     */
    stopRecording = () => {
        const { doRecording, doCountdown } = this.state;
        if (doCountdown) {
            this.handleCancelClick();
        }
        if (doRecording) {
            this.handleStopClick();
        }
    };

    /**
     * get a local copy of the latest recording
     */
    saveCopy = () => {
        const { doRecording, recordedBlobs } = this.state;
        if (!doRecording && recordedBlobs.length > 0 && !this.uploadedOnce) {
            this.saveFile();
        }
    };

    /**
     * upload the latest recording to Kaltura
     */
    upload = () => {
        const { doRecording, recordedBlobs } = this.state;
        if (!doRecording && recordedBlobs.length > 0 && !this.uploadedOnce) {
            this.initiateUpload();
        }
    };

    /**
     * cancel an on-going upload
     */
    cancelUpload = () => {
        const { doUpload } = this.state;
        if (doUpload) {
            this.setState({ abortUpload: true });
        }
    };

    /* =====================================================================
     * end Public API
     * ======================================================================
     */

    addEventListener(type: string, listener: (event: ExpressRecorderEvent) => void) {
        this.dispatcher.addEventListener(type, listener);
    }

    removeEventListener(type: string, callback: (event: ExpressRecorderEvent) => void) {
        this.dispatcher.removeEventListener(type, callback);
    }

    componentDidMount() {
        const { serviceUrl, app, ks, playerUrl, uiConfId, partnerId } = this.props;
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
            this.handleError("Cannot connect to Kaltura server");
        }

        // load player lib
        const tag = document.createElement("script");
        tag.async = true;
        tag.src = playerUrl + `/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiConfId}`;
        tag.type = "text/javascript";
        document.body.appendChild(tag);

        window.addEventListener("keydown", this.handleKeyboardControl);

        if (this.state.stream) {
            this.state.stream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        this.createStream(this.state.constraints);
    }

    checkProps = () => {
        const { serviceUrl, app, ks, playerUrl, uiConfId, partnerId } = this.props;

        if (!serviceUrl || !app || !ks || !playerUrl || !uiConfId || !partnerId) {
            let message = "Missing props: ";
            message += !serviceUrl ? "serviceUrl; " : "";
            message += !app ? "app; " : "";
            message += !ks ? "ks; " : "";
            message += !playerUrl ? "playerUrl; " : "";
            message += !uiConfId ? "uiConfId; " : "";
            message += !partnerId ? "partnerId; " : "";
            this.handleError(message);
        }
    };

    isBrowserCompatible = () => {
        const notSupportedError = this.props.browserNotSupportedText
            ? this.props.browserNotSupportedText
            : "<b>Browser is not webRTC supported</b><br /><a href='https://webrtc.org/'>Click Here</a> to learn about supported browsers";

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
            this.handleError(notSupportedError);
            return false;
        }

        // MediaRecorder does not supported by Edge
        try {
            const temp = MediaRecorder.isTypeSupported({
                mimeType: "video/webm"
            });
        } catch (e) {
            this.handleError(notSupportedError);
            return false;
        }

        return true;
    };
    saveStream = (stream: MediaStream, constraints: Constraints) => {
        this.setState({ stream: stream, constraints: constraints });
    };

    resetApp = () => {
        this.uploadedOnce = false;
        this.setState({
            doUpload: false,
            doRecording: false,
            doCountdown: false,
            abortUpload: false,
            recordedBlobs: [],
            doPlayback: false,
            error: "",
            uploadStatus: { loaded: 0, total: 0 }
        });
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        this.createStream(this.state.constraints);
    };

    handleError = (error: string) => {
        this.setState({ error: error });
        this.dispatcher.dispatchEvent(RecorderEvents.error, { message: error });
    };

    initiateUpload = () => {
        const videoTracks = this.state.stream ? this.state.stream.getVideoTracks() : [];
        const audioTracks = this.state.stream ? this.state.stream.getAudioTracks() : [];

        // Release video and media devices
        videoTracks.forEach((item: MediaStreamTrack) => {
            item.stop();
        });
        audioTracks.forEach((item: MediaStreamTrack) => {
            item.stop();
        });

        this.setState({ doUpload: true });
    };

    /**
     * triggered when recording is finished
     * @param recordedBlobs
     */
    handleRecordingEnd = (recordedBlobs: Blob[]) => {
        this.setState({ recordedBlobs: recordedBlobs });
        this.dispatcher.dispatchEvent(RecorderEvents.recordingEnded);
    };

    getDefaultEntryName() {
        const { constraints } = this.state;
        if (constraints.video) {
            return "Video Recording - " + new Date();
        }
        return "Audio Recording - " + new Date();
    }

    handleStartClick = () => {
        this.setBeforeunload(true);
        this.setState({ doCountdown: true });
        this.dispatcher.dispatchEvent(RecorderEvents.recordingStarted);
    };

    /**
     * when user requests to stop the recording
     */
    handleStopClick = () => {
        this.setState({ doRecording: false, doPlayback: true });
    };

    /**
     * triggered when recording is cancelled during countdown
     */
    handleCancelClick = () => {
        this.setState({ doCountdown: false });
        this.dispatcher.dispatchEvent(RecorderEvents.recordingCancelled);
    };
    recordAgain = () => {
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
            (!selectedCamera || // check if device id has been changed
                selectedCamera.deviceId === constraints.video.deviceId) &&
            (!selectedAudio || // check if device id has been changed
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

        if (this.state.stream) {
            this.state.stream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        this.createStream(newConstraints);
    };

    createStream = (constraints: Constraints) => {
        if (!constraints.video && !constraints.audio) {
            this.setState({
                error: "Video and audio are disabled, at least one of them must be enabled."
            });
            return;
        }
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream: MediaStream) => {
                this.saveStream(stream, constraints);
            })
            .catch(e => this.handleError("Failed to allocate resource: " + e.message));
    };

    setBeforeunload = (addMessage: boolean = false) => {
        window.onbeforeunload = (e: Event) => {
            return addMessage ? "" : null;
        };
    };

    handleKeyboardControl = (e: any) => {
        const { doCountdown, doRecording, recordedBlobs, doPlayback } = this.state;

        // start record on Alt + Shift (Meta for mac) + R
        if (e.altKey && (e.shiftKey || e.metaKey) && e.code === "KeyR") {
            e.preventDefault();
            if (!doRecording && !doCountdown) {
                if (!doPlayback) {
                    this.handleStartClick();
                } else {
                    this.recordAgain();
                }
            }
            return;
        }

        // stop record on Alt + Shift (Meta for mac) + S
        if (e.altKey && (e.shiftKey || e.metaKey) && e.code === "KeyS") {
            e.preventDefault();
            if (doRecording) {
                this.handleStopClick();
            }
            return;
        }

        // upload record on Alt + Shift (Meta for mac) + U
        if (e.altKey && (e.shiftKey || e.metaKey) && e.code === "KeyU") {
            e.preventDefault();
            if (!doRecording && recordedBlobs.length > 0 && !this.uploadedOnce) {
                this.initiateUpload();
            }
            return;
        }
    };

    saveFile = () => {
        const blob = new Blob(this.state.recordedBlobs, { type: "video/webm" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const entryName = this.props.entryName ? this.props.entryName : this.getDefaultEntryName();

        // create hidden link with the file url and perform click to download the file.
        a.style.display = "none";
        a.href = url;
        a.download = entryName + ".webm";
        document.body.appendChild(a);
        a.click();

        // release the existing object URL - let the browser know not to keep the reference to the file any longer
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    handleUploadStarted = (entryId: string) => {
        this.dispatcher.dispatchEvent(RecorderEvents.mediaUploadStarted, { entryId: entryId });
    };
    handleUploadEnded = (entryId: string) => {
        this.dispatcher.dispatchEvent(RecorderEvents.mediaUploadEnded, { entryId: entryId });
        this.setBeforeunload(false);
        this.resetApp();
    };
    handleUploadCancelled = () => {
        this.dispatcher.dispatchEvent(RecorderEvents.mediaUploadCancelled);
        this.resetApp();
    };
    handleUploadProgress = (loaded: number, total: number) => {
        const status = {
            loaded: loaded,
            total: total
        };
        this.setState({ uploadStatus: status });
        this.dispatcher.dispatchEvent(RecorderEvents.mediaUploadProgress, status);
    };

    render() {
        const {
            partnerId,
            uiConfId,
            entryName,
            ks,
            serviceUrl,
            maxRecordingTime,
            showUploadUI
        } = this.props;
        const {
            doCountdown,
            doUpload,
            stream,
            doRecording,
            abortUpload,
            recordedBlobs,
            doPlayback,
            error,
            constraints,
            uploadStatus
        } = this.state;

        if (doUpload && !this.uploadedOnce) {
            this.uploadedOnce = true;
        }

        if (error !== "") {
            return (
                <div className={`express-recorder ${styles["express-recorder"]}`}>
                    <ErrorScreen text={error} />
                </div>
            );
        }
        if (doUpload) {
            return (
                <div className={`express-recorder ${styles["express-recorder"]}`}>
                    <UploadManager
                        client={this.kClient}
                        onError={this.handleError}
                        onUploadStarted={this.handleUploadStarted}
                        onUploadEnded={this.handleUploadEnded}
                        onUploadCancelled={this.handleUploadCancelled}
                        onUploadProgress={this.handleUploadProgress}
                        mediaType={
                            constraints.video ? KalturaMediaType.video : KalturaMediaType.audio
                        }
                        recordedBlobs={recordedBlobs}
                        entryName={entryName ? entryName : this.getDefaultEntryName()}
                        serviceUrl={serviceUrl}
                        ks={ks}
                        abortUpload={abortUpload}
                    />
                    {showUploadUI && (
                        <UploadUI
                            loaded={uploadStatus.loaded}
                            total={uploadStatus.total}
                            abort={abortUpload}
                            onCancel={this.cancelUpload}
                        />
                    )}
                </div>
            );
        }
        return (
            <div className={`express-recorder ${styles["express-recorder"]}`}>
                <div className={styles["settings-wrap"]}>
                    {!doPlayback && !doRecording && (
                        <Settings
                            selectedCamera={stream ? stream!.getVideoTracks()[0] : undefined}
                            selectedAudio={stream ? stream!.getAudioTracks()[0] : undefined}
                            allowVideo={constraints.video !== false}
                            allowAudio={constraints.audio !== false}
                            onSettingsChanged={this.handleSettingsChange}
                            stream={stream}
                        />
                    )}
                </div>
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
                {doCountdown && (
                    <div className={styles["express-recorder__countdown"]}>
                        <CountdownTimer
                            initialValue={3}
                            onCountdownComplete={this.handleCountdownComplete}
                        />
                    </div>
                )}
                <div
                    className={`express-recorder__controls ${styles["express-recorder__controls"]}`}
                >
                    {!doRecording && !doCountdown && !doPlayback && (
                        <button
                            className={`xr_controls__start ${styles["controls__start"]}`}
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
                            className={`xr_controls__cancel ${styles["controls__cancel"]}`}
                            onClick={this.handleCancelClick}
                            tabIndex={0}
                        >
                            Cancel
                        </button>
                    )}
                    {showUploadUI &&
                        !doRecording &&
                        recordedBlobs.length > 0 &&
                        !this.uploadedOnce && (
                            <div className={`${styles["express-recorder__bottom"]}`}>
                                <button
                                    className={`xr_btn xr_btn__download ${styles["bottom__btn"]} ${styles["btn__clear"]} ${styles["btn__download"]} `}
                                    onClick={this.saveFile}
                                    tabIndex={0}
                                >
                                    Download a Copy
                                </button>
                                <button
                                    className={`xr_btn xr_btn__reset ${styles["bottom__btn"]} ${styles["btn__clear"]}`}
                                    onClick={this.recordAgain}
                                    tabIndex={0}
                                >
                                    Record Again
                                </button>
                                <button
                                    className={`xr_btn xr_btn-primary xr_btn__save ${styles["bottom__btn"]} ${styles["btn__save"]}`}
                                    onClick={this.initiateUpload}
                                    tabIndex={0}
                                >
                                    Use This
                                </button>
                            </div>
                        )}
                </div>
            </div>
        );
    }
}
