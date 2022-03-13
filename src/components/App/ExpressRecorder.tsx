import { Component, h } from "preact";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaConversionProfileType } from "kaltura-typescript-client/api/types/KalturaConversionProfileType";
import { KalturaClient } from "kaltura-typescript-client";
import { Recorder } from "../Recorder/Recorder";
import { CountdownTimer } from "../Countdown-timer/CountdownTimer";
import { RecordingTimer } from "../Recording-timer/RecordingTimer";
import { ErrorScreen } from "../Error-screen/ErrorScreen";
import { Settings } from "../Settings/Settings";
import { RecorderEvents } from "./RecorderEvents";
import PubSub, { ExpressRecorderEvent } from "../../services/PubSub";
import { UploadUI } from "../Uploader/UploadUI";
import { UploadManager } from "../Uploader/UploadManager";
import { Translator } from "../Translator/Translator";
const styles = require("./style.scss");
// player is loaded to global scope, let TypeScript know about it
declare var KalturaPlayer: any;

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
    translations?: Record<string, string>;
};

type State = {
    destroyed: boolean;
    stream: MediaStream | undefined;
    doUpload: boolean;
    doRecording: boolean;
    doCountdown: boolean;
    doPlayback: boolean;
    abortUpload: boolean;
    recordedBlobs: Blob[];
    error: string;
    constraints: MediaStreamConstraints;
    uploadStatus: { loaded: number; total: number };
};

const VIDEO_CONSTRAINT = {
    frameRate: 15,
    height: 483,
    width: 858
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
    translator: Translator;
    cancelButtonRef: HTMLElement | null;
    stopButtonRef: HTMLElement | null;

    constructor(props: ExpressRecorderProps) {
        super(props);

        this.state = {
            destroyed: false,
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

        this.translator = Translator.getTranslator();
        this.translator.init(props.translations);

        this.handleError = this.handleError.bind(this);
        this.initiateUpload = this.initiateUpload.bind(this);
        this.handleStartClick = this.handleStartClick.bind(this);
        this.checkProps = this.checkProps.bind(this);
        this.isBrowserCompatible = this.isBrowserCompatible.bind(this);

        this.cancelButtonRef = null;
        this.stopButtonRef = null;
    }

    setStopButtonRef = (ref: HTMLElement) => (this.stopButtonRef = ref);

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

    destroy = () => {
        // stop recording
        this.stopRecording();
        let state: any = { destroyed: true, doPlayback: false };
        // abort upload if any
        if (this.state.doUpload) {
            state["abortUpload"] = true;
        }
        // setState in callback because we want the app to render with the first props
        // so any upload will be cancelled, the to show the error screen.
        this.setState(state, () => {
            this.setState({ error: "Widget Destroyed" });
        });
        // stop stream:
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        // keyboard
        window.removeEventListener("keydown", this.handleKeyboardControl);
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

        // load player lib if uiConfId was provided, otherwise assume KalturaPlayer exists as global var
        if (uiConfId) {
            const tag = document.createElement("script");
            tag.async = true;
            tag.src = playerUrl + `/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiConfId}`;
            tag.type = "text/javascript";
            document.body.appendChild(tag);
        } else if (typeof KalturaPlayer === "undefined") {
            this.handleError(
                "Kaltura Player was not found in global scope and uiConfId prop was not provided"
            );
        }

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

        let message = "Missing props: ";
        if (!serviceUrl || !app || !ks || !partnerId) {
            message += !serviceUrl ? "serviceUrl; " : "";
            message += !app ? "app; " : "";
            message += !ks ? "ks; " : "";
            message += !partnerId ? "partnerId; " : "";
            this.handleError(message);
        } else if (uiConfId && !playerUrl) {
            message += !playerUrl ? "playerUrl; " : "";
            this.handleError(message);
        }
    };

    componentDidUpdate() {
        this.cancelButtonRef && this.cancelButtonRef.focus();
        this.stopButtonRef && this.stopButtonRef.focus();
    }

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

    resetApp = () => {
        this.uploadedOnce = false;
        this.setState(
            {
                doUpload: false,
                doRecording: false,
                doCountdown: false,
                abortUpload: false,
                recordedBlobs: [],
                doPlayback: false,
                error: "",
                uploadStatus: { loaded: 0, total: 0 }
            },
            () => {
                if (this.state.stream) {
                    this.state.stream.getTracks().forEach(function(track) {
                        track.stop();
                    });
                }
                if (!this.state.destroyed) {
                    this.createStream(this.state.constraints);
                }
            }
        );
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
            return this.translator.translate("Video Recording") + " - " + new Date();
        }
        return this.translator.translate("Audio Recording") + " - " + new Date();
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
    handleSettingsChange = (
        selectedCamera: MediaDeviceInfo | false,
        selectedAudio: MediaDeviceInfo | false
    ) => {
        // check if something has been changed
        const { constraints } = this.state;
        if (
            ((selectedCamera && constraints.video) || // check if video was turn on/off
                (!selectedCamera && !constraints.video)) &&
            ((selectedAudio && constraints.audio) || // check if audio was turn on/off
                (!selectedAudio && !constraints.audio)) &&
            (!selectedCamera || // check if device id has been changed
                (constraints.video &&
                    typeof constraints.video !== "boolean" &&
                    selectedCamera.deviceId === constraints.video.deviceId)) &&
            (!selectedAudio || // check if device id has been changed
                (constraints.audio &&
                    typeof constraints.audio !== "boolean" &&
                    selectedAudio.deviceId === constraints.audio.deviceId))
        ) {
            return;
        }

        let newConstraints: MediaStreamConstraints = { video: false, audio: false };
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

    createStream = (constraints: MediaStreamConstraints) => {
        this.modifyConstraints(constraints).then(finalConstraints => {
            if (!finalConstraints.video && !finalConstraints.audio) {
                this.setState({
                    error: this.translator.translate(
                        "Video and audio are disabled, at least one of them must be enabled."
                    )
                });
                return;
            }
            navigator.mediaDevices
                .getUserMedia(finalConstraints)
                .then((stream: MediaStream) => {
                    this.setState({ stream: stream, constraints: finalConstraints });
                })
                .catch(e => this.handleError("Failed to allocate resource: " + e.message));
        });
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

    /**
     * modify constraints according to client available devices (i.e video/audio inputs)
     */
    modifyConstraints = (constraints: MediaStreamConstraints) => {
        return navigator.mediaDevices
            .enumerateDevices()
            .then((devices: MediaDeviceInfo[]) => {
                constraints.video = !devices.some((item: any) => item.kind === "videoinput")
                    ? false
                    : constraints.video;
                constraints.audio = !devices.some((item: any) => item.kind === "audioinput")
                    ? false
                    : constraints.audio;
                return constraints;
            })
            .catch(() => constraints);
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

    render(props: ExpressRecorderProps, state: State) {
        const {
            partnerId,
            uiConfId,
            entryName,
            ks,
            serviceUrl,
            maxRecordingTime,
            showUploadUI,
            allowVideo,
            allowAudio
        } = props;
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
        } = state;

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
                            selectedCameraDevice={stream ? stream.getVideoTracks()[0] : undefined}
                            selectedAudioDevice={stream ? stream.getAudioTracks()[0] : undefined}
                            allowVideo={allowVideo!}
                            allowAudio={allowAudio!}
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
                            aria-label={this.translator.translate(
                                "Start Recording. recording will start in a three seconds delay"
                            )}
                            tabIndex={0}
                        />
                    )}
                    {doRecording && (
                        <RecordingTimer
                            onButtonClick={this.handleStopClick}
                            maxRecordingTime={maxRecordingTime}
                            setStopButtonRef={this.setStopButtonRef}
                        />
                    )}
                    {doCountdown && (
                        <button
                            className={`xr_controls__cancel ${styles["controls__cancel"]}`}
                            onClick={this.handleCancelClick}
                            tabIndex={0}
                            ref={node => (this.cancelButtonRef = node as HTMLMediaElement)}
                        >
                            {this.translator.translate("Cancel")}
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
                                    {this.translator.translate("Download a Copy")}
                                </button>
                                <button
                                    className={`xr_btn xr_btn__reset ${styles["bottom__btn"]} ${styles["btn__clear"]}`}
                                    onClick={this.recordAgain}
                                    tabIndex={0}
                                >
                                    {this.translator.translate("Record Again")}
                                </button>
                                <button
                                    className={`xr_btn xr_btn-primary xr_btn__save ${styles["bottom__btn"]} ${styles["btn__save"]}`}
                                    onClick={this.initiateUpload}
                                    tabIndex={0}
                                >
                                    {this.translator.translate("Use This")}
                                </button>
                            </div>
                        )}
                </div>
            </div>
        );
    }
}
