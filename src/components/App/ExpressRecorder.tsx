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
import { Playback } from "../Playback/Playback";
import AnalyticsSender, { AnalyticsEventBaseArgs } from "../../services/analytics/AnalyticsSender";
import { ButtonClickAnalyticsEventType } from "../../services/analytics/ButtonClickAnalyticsEventType";

const styles = require("./style.scss");
// player is loaded to global scope, let TypeScript know about it
declare var KalturaPlayer: any;

export type ExpressRecorderProps = {
    ks: string;
    serviceUrl: string;

    /**
     * client tag for Kaltura API client
     */
    app: string;
    playerUrl: string;
    partnerId: number;

    /**
     * id of the player that will be used for playback
     */
    uiConfId: number;

    /**
     * conversion profile to use when creating the new entry
     */
    conversionProfileId?: number;
    entryName?: string;

    /**
     * allow recording video
     */
    allowVideo?: boolean;

    /**
     * allow recording audio
     */
    allowAudio?: boolean;

    /**
     * allow recording screen-share
     */
    allowScreenShare?: boolean;
    browserNotSupportedText?: string;
    maxRecordingTime?: number;
    showUploadUI?: boolean;
    translations?: Record<string, string>;

    analytics?: {
        analyticsEventBaseArgs: AnalyticsEventBaseArgs;
        analyticsServiceUrl: string;
    };
};

type State = {
    destroyed: boolean;
    cameraStream?: MediaStream; // stream of camera and audio
    screenStream?: MediaStream; // stream of screen share and audio (if camera is off)
    doUpload: boolean;
    doRecording: boolean;
    doCountdown: boolean;
    doPlayback: boolean;
    abortUpload: boolean;
    cameraBlob?: Blob;
    screenBlob?: Blob;
    error: string;
    constraints: MediaStreamConstraints;
    shareScreenOn: boolean;
    processing: boolean;
};

const VIDEO_CONSTRAINT = {
    frameRate: 15,
    height: 1080,
    width: 1920
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
    analyticsSender?: AnalyticsSender;

    constructor(props: ExpressRecorderProps) {
        super(props);

        this.state = {
            destroyed: false,
            doUpload: false,
            doRecording: false,
            doCountdown: false,
            abortUpload: false,
            doPlayback: false,
            error: "",
            processing: false,
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

        if (props.analytics) {
            this.analyticsSender = new AnalyticsSender(
                props.analytics.analyticsServiceUrl,
                props.analytics.analyticsEventBaseArgs
            );
        }

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
        const { cameraBlob, screenBlob } = this.state;
        if (cameraBlob || screenBlob) {
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
        const { doRecording } = this.state;
        if (!doRecording && !this.uploadedOnce) {
            this.saveFile();
        }
    };

    /**
     * upload the latest recording to Kaltura
     */
    upload = () => {
        const { doRecording, cameraBlob, screenBlob } = this.state;
        if (doRecording) {
            return;
        }
        if (!cameraBlob && !screenBlob) {
            return;
        }
        if (this.uploadedOnce) {
            return;
        }

        this.initiateUpload();
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
        // stop streams:
        this.stopStreams();
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

        this.stopStreams();
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
            const temp = MediaRecorder.isTypeSupported("video/webm");
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
                cameraBlob: undefined,
                screenBlob: undefined,
                doPlayback: false,
                error: "",
                shareScreenOn: false
            },
            () => {
                this.stopStreams();
                if (!this.state.destroyed) {
                    this.createStream(this.state.constraints, this.state.shareScreenOn);
                }
            }
        );
    };

    /**
     * stop all active streams - camera, audio and screen
     * @param screenOn - share screen is on/off
     */
    stopStreams = (screenOn?: boolean) => {
        const { cameraStream, screenStream } = this.state;
        if (cameraStream) {
            cameraStream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        if (screenStream && !screenOn) {
            screenStream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
    };
    handleError = (error: string) => {
        this.setState({ error: error });
        this.dispatcher.dispatchEvent(RecorderEvents.error, { message: error });
    };

    initiateUpload = () => {
        this.stopStreams();

        this.setState({
            doUpload: true
        });
        this.sendAnalytics("Use this", ButtonClickAnalyticsEventType.ADD);
    };

    /**
     * triggered when recording is finished
     * @param cameraBlobs
     * @param screenBlobs
     * @param duration
     */
    handleRecordingEnd = (duration: number, cameraBlobs?: Blob[], screenBlobs?: Blob[]) => {
        let processingCamera = !!cameraBlobs;
        let processingScreen = !!screenBlobs;

        const isProcessing = () => processingCamera || processingScreen;

        const processBlobs = (
            blobs: Blob[],
            key: "cameraBlob" | "screenBlob",
            setProcessingFlag: (value: boolean) => void
        ) => {
            const browserName = this.getBrowserName();
            const mimeType = browserName === "Safari" ? "video/mp4" : "video/webm";
            const finalBlob = new Blob(blobs, { type: mimeType });

            const updateState = (blob: Blob) => {
                setProcessingFlag(false);
                this.setState({
                    [key]: blob,
                    processing: isProcessing(),
                    doPlayback: !isProcessing()
                } as any);
                if (!isProcessing()) {
                    this.dispatcher.dispatchEvent(RecorderEvents.recordingEnded);
                }
            };
            if (mimeType === "video/webm") {
                fixWebmDuration(finalBlob, duration, updateState);
            } else {
                // Safari does not support fix-webm-duration
                updateState(finalBlob);
            }
        };

        this.setState({ processing: isProcessing() }, () => {
            if (cameraBlobs) {
                processBlobs(cameraBlobs, "cameraBlob", val => (processingCamera = val));
            }
            if (screenBlobs) {
                processBlobs(screenBlobs, "screenBlob", val => (processingScreen = val));
            }
        });
    };

    getBrowserName(): string {
        const userAgent = navigator.userAgent;
        //to avoid misidentifying Edge as Chrome
        if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
            return "Chrome";
        }
        //Chrome on macOS and iOS also includes "Safari" and "Chrome"
        else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
            return "Safari";
        } else if (userAgent.includes("Firefox")) {
            return "Firefox";
        } else if (userAgent.includes("Edg")) {
            return "Edge";
        } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
            return "Internet Explorer";
        } else {
            return "Unknown";
        }
    }
    getDefaultEntryName() {
        const { constraints, shareScreenOn } = this.state;
        if (constraints.video) {
            return this.translator.translate("Video Recording") + " - " + new Date();
        }
        if (shareScreenOn) {
            return this.translator.translate("Screen Recording") + " - " + new Date();
        }
        return this.translator.translate("Audio Recording") + " - " + new Date();
    }

    handleStartClick = () => {
        this.setBeforeunload(true);
        this.setState({ doCountdown: true });
        this.sendAnalytics("Start recording", ButtonClickAnalyticsEventType.LAUNCH);
        this.dispatcher.dispatchEvent(RecorderEvents.recordingStarted);
    };

    /**
     * when user requests to stop the recording
     */
    handleStopClick = () => {
        this.setState({ doRecording: false });
        this.sendAnalytics("Stop recording", ButtonClickAnalyticsEventType.CLOSE);
    };

    /**
     * triggered when recording is cancelled during countdown
     */
    handleCancelClick = () => {
        this.setState({ doCountdown: false });
        this.sendAnalytics("Cancel recording", ButtonClickAnalyticsEventType.CLOSE);
        this.dispatcher.dispatchEvent(RecorderEvents.recordingCancelled);
    };
    recordAgain = () => {
        this.setState({
            cameraBlob: undefined,
            screenBlob: undefined,
            doPlayback: false,
            processing: false
        });
        this.sendAnalytics("Record again", ButtonClickAnalyticsEventType.LAUNCH);
    };
    handleCountdownComplete = () => {
        if (this.state.doCountdown) {
            this.setState({ doCountdown: false, doRecording: true });
        }
    };

    handleSettingsChange = (
        deviceWasChanged: boolean,
        toggleWasChanged: boolean,
        screenOn: boolean,
        selectedCamera?: MediaDeviceInfo,
        selectedAudio?: MediaDeviceInfo
    ) => {
        // check if something has been changed
        if (!deviceWasChanged && !toggleWasChanged && screenOn === this.state.shareScreenOn) {
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

        if (this.state.cameraStream) {
            this.state.cameraStream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        // update constraints state only if create stream has been succeeded
        this.stopStreams(screenOn);
        this.createStream(newConstraints, screenOn, toggleWasChanged);
    };

    getScreenshareWithMicrophone = async () => {
        let screenStream;
        if (this.state.screenStream && this.state.screenStream.active) {
            screenStream = this.state.screenStream;
        } else {
            // @ts-ignore
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: VIDEO_CONSTRAINT,
                audio: false
            });
        }
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        return new MediaStream([audio.getTracks()[0], ...screenStream.getTracks()]);
    };

    createStream = (
        constraints: MediaStreamConstraints,
        screenOn: boolean,
        toggleChanged?: boolean
    ) => {
        this.modifyConstraints(constraints).then(finalConstraints => {
            const isCameraOn = finalConstraints.video || (finalConstraints.audio && !screenOn);
            const { screenStream } = this.state;
            this.setState((prevState: State) => {
                return {
                    constraints: finalConstraints,
                    cameraStream: isCameraOn ? prevState.cameraStream : undefined,
                    screenStream: !screenOn ? undefined : prevState.screenStream,
                    shareScreenOn: screenOn
                };
            });
            if (isCameraOn) {
                navigator.mediaDevices
                    .getUserMedia(finalConstraints)
                    .then((stream: MediaStream) => {
                        this.setState({
                            cameraStream: stream
                        });
                    })
                    .catch(e => {
                        this.handleError("Failed to allocate resource: " + e.message);
                    });
            }
            if (!screenStream && screenOn) {
                this.createScreenStream(finalConstraints, toggleChanged);
            }
        });
    };

    createScreenStream = (finalConstraints: MediaStreamConstraints, toggleChanged?: boolean) => {
        const { audio } = finalConstraints;
        if (!toggleChanged) {
            return;
        }

        if (audio) {
            this.getScreenshareWithMicrophone()
                .then((stream: MediaStream) => {
                    this.setState({
                        screenStream: stream,
                        shareScreenOn: true
                    });
                })
                .catch((e: any) => {
                    if (e.name === "NotAllowedError") {
                        //user cancelled
                        this.setState({
                            screenStream: undefined,
                            shareScreenOn: false
                        });
                        return;
                    }
                    this.handleError("Failed to allocate resource: " + e.message);
                });
            return;
        }

        navigator.mediaDevices
            // @ts-ignore
            .getDisplayMedia({ video: VIDEO_CONSTRAINT, audio: false })
            .then((screenStream: MediaStream) => {
                this.setState({
                    screenStream: screenStream,
                    shareScreenOn: true
                });
            })
            .catch((e: any) => {
                this.handleError("Failed to allocate resource: " + e.message);
            });
    };

    setBeforeunload = (addMessage: boolean = false) => {
        window.onbeforeunload = (e: Event) => {
            return addMessage ? "" : null;
        };
    };

    handleKeyboardControl = (e: any) => {
        const { doCountdown, doRecording, cameraBlob, screenBlob, doPlayback } = this.state;

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
            if (!doRecording && (cameraBlob || screenBlob) && !this.uploadedOnce) {
                this.initiateUpload();
            }
            return;
        }
    };

    saveFile = () => {
        const { shareScreenOn, screenBlob, cameraBlob } = this.state;
        const entryName = this.props.entryName ? this.props.entryName : this.getDefaultEntryName();
        if (shareScreenOn && screenBlob) {
            this.invokeDownload(screenBlob, "Screen-Recording-" + new Date());
        }
        if (cameraBlob) {
            this.invokeDownload(cameraBlob, entryName);
        }
        this.sendAnalytics("Download a copy", ButtonClickAnalyticsEventType.DOWNLOAD);
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

    sendAnalytics = (
        buttonName: string,
        buttonType: ButtonClickAnalyticsEventType,
        value?: string
    ) => {
        if (this.analyticsSender) {
            this.analyticsSender.sendAnalytics(buttonName, buttonType, value);
        }
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
            cameraStream,
            screenStream,
            shareScreenOn,
            doRecording,
            abortUpload,
            doPlayback,
            error,
            constraints,
            cameraBlob,
            screenBlob,
            processing
        } = state;
        if (doUpload && !this.uploadedOnce) {
            this.uploadedOnce = true;
        }
        const showPostRecordingActions =
            showUploadUI &&
            !doRecording &&
            !this.uploadedOnce &&
            (cameraBlob || screenBlob) &&
            !processing;

        const audioStream = cameraStream || screenStream;
        const selectedAudioDevice =
            audioStream && audioStream.getAudioTracks().length
                ? audioStream.getAudioTracks()[0]
                : undefined;

        const selectedCameraDevice =
            cameraStream && cameraStream.getVideoTracks().length > 0
                ? cameraStream.getVideoTracks()[0]
                : undefined;

        if (error !== "") {
            return (
                <div className={`express-recorder ${styles["express-recorder"]}`}>
                    <ErrorScreen text={error} onReset={this.resetApp} />
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
                        entryName={entryName ? entryName : this.getDefaultEntryName()}
                        serviceUrl={serviceUrl}
                        ks={ks}
                        abortUpload={abortUpload}
                        showUploadUI={showUploadUI}
                        onCancel={this.cancelUpload}
                        mediaType={
                            constraints.video || shareScreenOn
                                ? KalturaMediaType.video
                                : KalturaMediaType.audio
                        }
                        parentBlob={screenBlob ? screenBlob : cameraBlob}
                        childBlob={screenBlob ? cameraBlob : undefined}
                    />
                </div>
            );
        }
        return (
            <div
                className={`express-recorder ${styles["express-recorder"]} ${
                    constraints.video && !shareScreenOn ? styles["responsive-height"] : ""
                }`}
            >
                {processing ? (
                    <div
                        className={`express-recorder__processing ${styles["express-recorder__processing"]}`}
                    >
                        {this.translator.translate("Processing media, please wait..")}
                    </div>
                ) : null}
                {doPlayback && (cameraBlob || screenBlob) ? (
                    <div
                        className={`express-recorder__playback ${styles["express-recorder__playback"]}`}
                    >
                        <Playback
                            partnerId={partnerId}
                            uiconfId={uiConfId}
                            cameraMedia={cameraBlob}
                            screenMedia={screenBlob}
                            autoPlay={false}
                        />
                    </div>
                ) : null}
                {!doUpload && !doPlayback ? (
                    <Recorder
                        cameraStream={cameraStream}
                        screenStream={screenStream}
                        onRecordingEnd={this.handleRecordingEnd}
                        doRecording={doRecording}
                        discard={doCountdown}
                        onError={this.handleError}
                        screenShareOn={shareScreenOn}
                        constraint={constraints}
                    />
                ) : null}
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
                            onStop={this.handleStopClick}
                            maxRecordingTime={maxRecordingTime}
                            setStopButtonRef={this.setStopButtonRef}
                        />
                    )}
                    <div className={styles["settings-wrap"]}>
                        {!doPlayback && !doRecording && !doCountdown && (
                            <Settings
                                selectedCameraDevice={selectedCameraDevice}
                                selectedAudioDevice={selectedAudioDevice}
                                cameraOn={!!constraints.video}
                                audioOn={!!constraints.audio}
                                allowScreenShare={allowScreenShare}
                                onSettingsChanged={this.handleSettingsChange}
                                screenShareOn={shareScreenOn}
                                onStartRecording={this.handleStartClick}
                                allowVideo={allowVideo}
                                allowAudio={allowAudio}
                                sendAnalytics={this.sendAnalytics}
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
                    {showPostRecordingActions ? (
                        <div className={`${styles["express-recorder__bottom"]}`}>
                            <button
                                className={`xr_btn xr_btn__download ${styles["bottom__btn"]} ${styles["btn__clear"]} ${styles["btn__download"]} `}
                                onClick={this.saveFile}
                            >
                                {this.translator.translate("Download a Copy")}
                            </button>
                            <button
                                className={`xr_btn xr_btn__reset ${styles["bottom__btn"]} ${styles["btn__clear"]}`}
                                onClick={this.recordAgain}
                            >
                                {this.translator.translate("Record Again")}
                            </button>
                            <button
                                className={`xr_btn xr_btn-primary xr_btn__save ${styles["bottom__btn"]} ${styles["btn__save"]}`}
                                onClick={this.initiateUpload}
                                autofocus={true}
                            >
                                {this.translator.translate("Use This")}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }
}
