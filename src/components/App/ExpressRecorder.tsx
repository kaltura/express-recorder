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
import { UploadManager } from "../Uploader/UploadManager";
import { Translator } from "../Translator/Translator";
import fixWebmDuration from "fix-webm-duration";
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
    allowScreenShare?: boolean; // whether to enable screen sharing
    browserNotSupportedText?: string;
    maxRecordingTime?: number;
    showUploadUI?: boolean;
    translations?: Record<string, string>;
};

type State = {
    destroyed: boolean;
    stream?: MediaStream;
    screenStream?: MediaStream;
    doUpload: boolean;
    doRecording: boolean;
    doCountdown: boolean;
    doPlayback: boolean;
    abortUpload: boolean;
    recordedBlobs: Blob[];
    screenRecordedBlobs: Blob[];
    blob: Blob;
    screenRecordedBlob: Blob;
    error: string;
    constraints: MediaStreamConstraints;
    shareScreenOn: boolean;
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
            doUpload: false,
            doRecording: false,
            doCountdown: false,
            abortUpload: false,
            recordedBlobs: [],
            screenRecordedBlobs: [],
            blob: new Blob(),
            screenRecordedBlob: new Blob(),
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
            shareScreenOn: false
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
        if (this.state.screenStream) {
            this.state.screenStream.getTracks().forEach(function(track) {
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
        this.createStream(this.state.constraints, false);
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
                error: ""
            },
            () => {
                if (this.state.stream) {
                    this.state.stream.getTracks().forEach(function(track) {
                        track.stop();
                    });
                }
                if (!this.state.destroyed) {
                    this.createStream(this.state.constraints, this.state.shareScreenOn);
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

        this.setState({
            doUpload: true
        });
    };

    /**
     * triggered when recording is finished
     * @param recordedBlobs
     * @param duration
     * @param screenBlobs
     */
    handleRecordingEnd = (recordedBlobs: Blob[], duration: number, screenBlobs?: Blob[]) => {
        const blob = new Blob(recordedBlobs, { type: "video/webm" });
        // handle chrome blob duration issue
        fixWebmDuration(blob, duration, (fixedBlob: Blob) => {
            this.setState({ recordedBlobs: recordedBlobs, blob: fixedBlob });
            this.dispatcher.dispatchEvent(RecorderEvents.recordingEnded);
        });
        if (screenBlobs) {
            const screenBlobObject = new Blob(screenBlobs, { type: "video/webm" });
            fixWebmDuration(screenBlobObject, duration, (fixedBlob: Blob) => {
                this.setState({ screenRecordedBlobs: screenBlobs, screenRecordedBlob: fixedBlob });
            });
        }
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
            screenRecordedBlobs: [],
            doPlayback: false
        });
    };
    handleCountdownComplete = () => {
        if (this.state.doCountdown) {
            this.setState({ doCountdown: false, doRecording: true });
        }
    };
    handleSettingsChange = (
        screenOn: boolean,
        selectedCamera?: MediaDeviceInfo,
        selectedAudio?: MediaDeviceInfo
    ) => {
        // check if something has been changed
        const { constraints, shareScreenOn } = this.state;
        if (
            ((selectedCamera && constraints.video) || // check if video has turned on/off
                (!selectedCamera && !constraints.video)) &&
            ((selectedAudio && constraints.audio) || // check if audio has turned on/off
                (!selectedAudio && !constraints.audio)) &&
            (!selectedCamera || // check if device id has been changed
                (constraints.video &&
                    typeof constraints.video !== "boolean" &&
                    selectedCamera.deviceId === constraints.video.deviceId)) &&
            (!selectedAudio || // check if device id has been changed
                (constraints.audio &&
                    typeof constraints.audio !== "boolean" &&
                    selectedAudio.deviceId === constraints.audio.deviceId)) &&
            screenOn === shareScreenOn
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
        // update constraints state only if create stream has been succeeded
        this.createStream(newConstraints, screenOn);
    };

    createStream = (constraints: MediaStreamConstraints, screenOn: boolean) => {
        const { shareScreenOn } = this.state;
        this.modifyConstraints(constraints).then(finalConstraints => {
            if (!finalConstraints.video && !finalConstraints.audio) {
                this.setState({
                    error: this.translator.translate(
                        "Video and audio are disabled, at least one of them must be enabled."
                    )
                });
                return;
            }
            if (screenOn && screenOn !== shareScreenOn) {
                navigator.mediaDevices
                    // @ts-ignore
                    .getDisplayMedia({ video: true })
                    .then((screenStream: MediaStream) => {
                        this.setState({ screenStream: screenStream });
                    })
                    .catch((e: any) =>
                        this.handleError("Failed to allocate resource: " + e.message)
                    );
            }
            navigator.mediaDevices
                .getUserMedia(finalConstraints)
                .then((stream: MediaStream) => {
                    this.setState({
                        stream: stream,
                        constraints: finalConstraints,
                        shareScreenOn: screenOn
                    });
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
        const { shareScreenOn, screenRecordedBlob, blob } = this.state;
        const entryName = this.props.entryName ? this.props.entryName : this.getDefaultEntryName();
        if (shareScreenOn && screenRecordedBlob) {
            this.invokeDownload(screenRecordedBlob, "Screen-Recording-" + new Date());
        }
        this.invokeDownload(blob, entryName);
    };

    invokeDownload = (blob: Blob, name: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        // create hidden link with the file url and perform click to download the file.
        a.style.display = "none";
        a.href = url;
        a.download = name + ".webm";
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
            allowVideo = true,
            allowAudio = true,
            allowScreenShare = false
        } = props;
        const {
            doCountdown,
            doUpload,
            stream,
            screenStream,
            shareScreenOn,
            doRecording,
            abortUpload,
            recordedBlobs,
            doPlayback,
            error,
            constraints,
            blob,
            screenRecordedBlob,
            screenRecordedBlobs
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
                        childRecordedBlobs={screenRecordedBlobs}
                        entryName={entryName ? entryName : this.getDefaultEntryName()}
                        serviceUrl={serviceUrl}
                        ks={ks}
                        abortUpload={abortUpload}
                        showUploadUI={showUploadUI}
                        onCancel={this.cancelUpload}
                    />
                </div>
            );
        }
        return (
            <div className={`express-recorder ${styles["express-recorder"]}`}>
                <Recorder
                    video={constraints.video !== false}
                    stream={stream}
                    screenStream={screenStream}
                    onRecordingEnd={this.handleRecordingEnd}
                    doRecording={doRecording}
                    discard={doCountdown}
                    doPlayback={doPlayback}
                    partnerId={partnerId}
                    uiConfId={uiConfId}
                    onError={this.handleError}
                    screenShareOn={shareScreenOn}
                    blob={blob}
                    screenBlob={screenRecordedBlob}
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
                    {doRecording && (
                        <RecordingTimer
                            onButtonClick={this.handleStopClick}
                            maxRecordingTime={maxRecordingTime}
                            setStopButtonRef={this.setStopButtonRef}
                        />
                    )}
                    <div className={styles["settings-wrap"]}>
                        {!doPlayback && !doRecording && !doCountdown && (
                            <Settings
                                selectedCameraDevice={
                                    stream && stream.getVideoTracks().length > 0
                                        ? ({
                                              kind: "videoinput",
                                              label: stream.getVideoTracks()[0].label
                                          } as MediaDeviceInfo)
                                        : undefined
                                }
                                selectedAudioDevice={
                                    stream && stream.getAudioTracks().length > 0
                                        ? ({
                                              kind: "audioinput",
                                              label: stream.getAudioTracks()[0].label
                                          } as MediaDeviceInfo)
                                        : undefined
                                }
                                allowVideo={allowVideo}
                                allowAudio={allowAudio}
                                allowScreenShare={allowScreenShare}
                                onSettingsChanged={this.handleSettingsChange}
                                stream={stream}
                                screenShareOn={shareScreenOn}
                                onStartRecording={this.handleStartClick}
                            />
                        )}
                    </div>

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
