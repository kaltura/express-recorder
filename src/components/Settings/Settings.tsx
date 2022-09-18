import { Component, h } from "preact";
import { SettingsDevices } from "./Settings-devices";
import { AudioIndicator } from "../AudioIndicator/AudioIndicator";
import { Translator } from "../Translator/Translator";
import VideoIcon from "./assets/video.svg";
import AudioIcon from "./assets/audio.svg";
import ScreenIcon from "./assets/screen.svg";
import NoVideoIcon from "./assets/noVideo.svg";
import NoAudioIcon from "./assets/noAudio.svg";
import NoScreenIcon from "./assets/noScreen.svg";

const styles = require("./style.scss");
type Props = {
    onSettingsChanged?: (
        selectedCamera: MediaDeviceInfo | false,
        selectedAudio: MediaDeviceInfo | false,
        screenOn: boolean
    ) => void;
    selectedCameraDevice: MediaDeviceInfo | false;
    selectedAudioDevice: MediaDeviceInfo | false;
    allowVideo: boolean;
    allowAudio: boolean;
    screenShareOn: boolean;
    allowScreenShare: boolean;
    stream?: MediaStream | undefined;
    onStartRecording: () => void;
};
type State = {
    showSettingsOf: false | ResourceTypes;
    cameraOn: boolean;
    audioOn: boolean;
    screenOn: boolean;
};

export enum ResourceTypes {
    VIDEO = "Camera",
    AUDIO = "Audio",
    SCREEN_SHARE = "ScreenShare"
}

/**
 * Component to handle settings menu for resources and devices
 */
export class Settings extends Component<Props, State> {
    cameraDevicesInfo: MediaDeviceInfo[];
    audioDevicesInfo: MediaDeviceInfo[];
    menuBoxRef: Element | undefined;

    constructor(props: Props) {
        super(props);

        this.state = {
            showSettingsOf: false,
            cameraOn: props.allowVideo,
            audioOn: props.allowAudio,
            screenOn: props.screenShareOn
        };

        this.cameraDevicesInfo = [];
        this.audioDevicesInfo = [];
    }

    componentDidMount() {
        this.getDevices();
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (
            this.cameraDevicesInfo.length === 0 ||
            this.cameraDevicesInfo[0].label === "" ||
            this.audioDevicesInfo.length === 0 ||
            this.audioDevicesInfo[0].label === ""
        ) {
            this.getDevices();
        }

        if (this.state.showSettingsOf) {
            document.addEventListener("click", this.handleExternalClick, true);
        }
    }

    componentWillUnmount() {
        document.removeEventListener("click", this.handleExternalClick, true);
    }

    // handle global window click event
    handleExternalClick = (e: any) => {
        let element = e.target;

        do {
            if (element === this.menuBoxRef) {
                return;
            }
            element = element.parentElement || element.parentNode;
        } while (element !== null && element.nodeType === 1);

        this.handleClose();
    };

    /**
     * get available devices
     */
    getDevices = () => {
        if (navigator.mediaDevices) {
            navigator.mediaDevices.enumerateDevices().then((devices: MediaDeviceInfo[]) => {
                this.cameraDevicesInfo = devices.filter((item: any) => item.kind === "videoinput");
                this.audioDevicesInfo = devices.filter((item: any) => item.kind === "audioinput");
            });
        }
    };

    handleClose = () => {
        document.removeEventListener("click", this.handleExternalClick, true);

        this.setState({
            showSettingsOf: false
        });
    };

    /**
     *
     * @param isOn boolean, new value for the toggle control
     * @param resourceType  ResourceTypes, the type of the control that changed
     */
    handleToggleChange = (isOn: boolean, resourceType: ResourceTypes) => {
        const { cameraOn, audioOn } = this.state;

        let newCameraOn = resourceType === ResourceTypes.VIDEO ? isOn : cameraOn;
        let newAudioOn = resourceType === ResourceTypes.AUDIO ? isOn : audioOn;

        // do not allow both camera and audio to be turned off
        newCameraOn = !isOn && resourceType === ResourceTypes.AUDIO ? true : newCameraOn;
        newAudioOn = !isOn && resourceType === ResourceTypes.VIDEO ? true : newAudioOn;

        this.setState((prevState: State) => {
            return {
                cameraOn: newCameraOn,
                audioOn: newAudioOn,
                screenOn: resourceType === ResourceTypes.SCREEN_SHARE ? isOn : prevState.screenOn
            };
        });

        if (this.props.onSettingsChanged) {
            const camera = newCameraOn
                ? this.props.selectedCameraDevice || this.cameraDevicesInfo[0]
                : false;
            const audio = newAudioOn
                ? this.props.selectedAudioDevice || this.audioDevicesInfo[0]
                : false;
            this.props.onSettingsChanged(camera, audio, this.state.screenOn);
        }
    };

    handleChooseDevice = (device: MediaDeviceInfo) => {
        if (this.props.onSettingsChanged) {
            const camera = device.kind === "videoinput" && this.state.cameraOn ? device : false;
            const audio = device.kind === "audioinput" && this.state.audioOn ? device : false;
            this.props.onSettingsChanged(camera, audio, this.state.screenOn);
        }
    };

    handleKeyboardInput = (e: KeyboardEvent, type: ResourceTypes) => {
        switch (e.key) {
            case "Enter":
            case "ArrowRight":
            case " ":
                this.setState({ showSettingsOf: type });
                break;
            case "ArrowDown":
                const nextMenuItem = (e.target as HTMLElement).nextSibling;
                if (nextMenuItem) {
                    (nextMenuItem as HTMLElement).focus();
                }
                break;
            case "ArrowUp":
                const prevMenuItem = (e.target as HTMLElement).previousSibling;
                if (prevMenuItem) {
                    (prevMenuItem as HTMLElement).focus();
                }
                break;
            default:
        }
    };

    toggleSettingsShow = (clickedResource: ResourceTypes) => {
        const { showSettingsOf } = this.state;

        if (showSettingsOf === clickedResource) {
            this.setState({ showSettingsOf: false });
            return;
        }
        this.setState({ showSettingsOf: clickedResource });
    };

    render() {
        const {
            stream,
            allowAudio,
            allowVideo,
            allowScreenShare,
            onStartRecording,
            selectedAudioDevice,
            selectedCameraDevice
        } = this.props;
        const { cameraOn, audioOn, screenOn, showSettingsOf } = this.state;
        const translator = Translator.getTranslator();

        let devicesSettings = null;
        if (showSettingsOf === ResourceTypes.SCREEN_SHARE) {
            devicesSettings = (
                <SettingsDevices
                    resourceName={ResourceTypes.SCREEN_SHARE}
                    devices={[]}
                    isOn={screenOn}
                    disabled={false} // can only turn off if both are available, so we won't end up with none
                    selected={false}
                    onChooseDevice={this.handleChooseDevice}
                    onToggleChange={(isOn: boolean) => {
                        this.handleToggleChange(isOn, ResourceTypes.SCREEN_SHARE);
                    }}
                />
            );
        } else if (
            showSettingsOf === ResourceTypes.AUDIO ||
            showSettingsOf === ResourceTypes.VIDEO
        ) {
            devicesSettings = (
                <SettingsDevices
                    resourceName={
                        showSettingsOf === ResourceTypes.VIDEO
                            ? ResourceTypes.VIDEO
                            : ResourceTypes.AUDIO
                    }
                    devices={
                        showSettingsOf === ResourceTypes.VIDEO
                            ? this.cameraDevicesInfo
                            : this.audioDevicesInfo
                    }
                    isOn={showSettingsOf === ResourceTypes.VIDEO ? cameraOn : audioOn}
                    disabled={!(allowVideo && allowAudio)} // can only turn off if both are available, so we won't end up with none
                    selected={
                        showSettingsOf === ResourceTypes.VIDEO
                            ? selectedCameraDevice
                            : selectedAudioDevice
                    }
                    onChooseDevice={this.handleChooseDevice}
                    onToggleChange={(isOn: boolean) => {
                        this.handleToggleChange(
                            isOn,
                            showSettingsOf === ResourceTypes.VIDEO
                                ? ResourceTypes.VIDEO
                                : ResourceTypes.AUDIO
                        );
                    }}
                />
            );
        }

        return (
            <div
                className={`express-recorder__settings ${styles["settings"]}`}
                ref={node => (this.menuBoxRef = node)}
            >
                {devicesSettings}
                <div
                    className={styles["resources-list"]}
                    role="menu"
                    aria-labelledby="dropdownMenu"
                >
                    <div
                        className={styles["resource-link"]}
                        onClick={() => {
                            this.toggleSettingsShow(ResourceTypes.VIDEO);
                        }}
                        onKeyDown={e => {
                            this.handleKeyboardInput(e, ResourceTypes.VIDEO);
                        }}
                        tabIndex={0}
                        role="menuitem"
                    >
                        <span className={styles["sr-only"]}>
                            {translator.translate("Camera Settings")}
                        </span>
                        <div className={styles["resources-item"]}>
                            <div className={styles["resources-icon"]} aria-hidden="true">
                                {cameraOn && <VideoIcon />}
                                {!cameraOn && <NoVideoIcon />}
                            </div>
                            <div className={styles["arrow-wrap"]}>
                                {showSettingsOf !== ResourceTypes.VIDEO && (
                                    <i className={styles["arrow-up"]} />
                                )}
                                {showSettingsOf === ResourceTypes.VIDEO && (
                                    <i className={styles["arrow-down"]} />
                                )}
                            </div>
                        </div>
                    </div>
                    <div
                        className={styles["resource-link"]}
                        onClick={() => {
                            this.toggleSettingsShow(ResourceTypes.AUDIO);
                        }}
                        onKeyDown={e => {
                            this.handleKeyboardInput(e, ResourceTypes.AUDIO);
                        }}
                        tabIndex={0}
                        role="menuitem"
                    >
                        <span className={styles["sr-only"]}>
                            {translator.translate("Audio Settings")}
                        </span>
                        <div className={styles["resources-item"]}>
                            <div className={styles["resources-icon"]} aria-hidden="true">
                                {audioOn && <AudioIcon />}
                                {!audioOn && <NoAudioIcon />}
                                {/*stream && (
                                        <div className={styles["settings-audio-indicator"]}>
                                            <AudioIndicator stream={stream} audioOn={audioOn} />
                                        </div>
                                    )*/}
                            </div>
                            <div className={styles["arrow-wrap"]}>
                                {showSettingsOf !== ResourceTypes.AUDIO && (
                                    <i className={styles["arrow-up"]} />
                                )}
                                {showSettingsOf === ResourceTypes.AUDIO && (
                                    <i className={styles["arrow-down"]} />
                                )}
                            </div>
                        </div>
                    </div>
                    {allowScreenShare && (
                        <div
                            className={styles["resource-link"]}
                            onClick={() => {
                                this.toggleSettingsShow(ResourceTypes.SCREEN_SHARE);
                            }}
                            onKeyDown={e => {
                                this.handleKeyboardInput(e, ResourceTypes.SCREEN_SHARE);
                            }}
                            tabIndex={0}
                            role="menuitem"
                        >
                            <span className={styles["sr-only"]}>
                                {translator.translate("Screen Share Settings")}
                            </span>
                            <div className={styles["resources-item"]}>
                                <div className={styles["resources-icon"]}>
                                    {screenOn && <ScreenIcon />}
                                    {!screenOn && <NoScreenIcon />}
                                </div>
                                <div className={styles["arrow-wrap"]}>
                                    {showSettingsOf !== ResourceTypes.SCREEN_SHARE && (
                                        <i className={styles["arrow-up"]} />
                                    )}
                                    {showSettingsOf === ResourceTypes.SCREEN_SHARE && (
                                        <i className={styles["arrow-down"]} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        className={`xr_controls__start ${styles["controls__start"]}`}
                        id="startRecord"
                        onClick={onStartRecording}
                        aria-label={translator.translate(
                            "Start Recording. recording will start in a three seconds delay"
                        )}
                        tabIndex={0}
                    />
                </div>
            </div>
        );
    }
}
