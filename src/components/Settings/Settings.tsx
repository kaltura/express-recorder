import { Component, h } from "preact";
import { SettingsDevices } from "./Settings-devices";
import { Translator } from "../Translator/Translator";
import { VideoIcon, NoAudioIcon, NoScreenIcon, NoVideoIcon, ScreenIcon, AudioIcon } from "./icons";

const styles = require("./style.scss");
type Props = {
    onSettingsChanged: (
        deviceWasChanged: boolean,
        toggleWasChanged: boolean,
        screenOn: boolean,
        selectedCamera?: MediaDeviceInfo,
        selectedAudio?: MediaDeviceInfo
    ) => void;
    selectedCameraDevice?: MediaStreamTrack;
    selectedAudioDevice?: MediaStreamTrack;
    cameraOn: boolean;
    audioOn: boolean;
    screenShareOn: boolean;
    allowScreenShare: boolean;
    onStartRecording: () => void;
    allowVideo: boolean;
    allowAudio: boolean;
};
type State = {
    showSettingsOf?: ResourceTypes;
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

    /**
     * handle global window click event
     */
    handleExternalClick = (e: any) => {
        let element = e.target;

        do {
            if (element === this.menuBoxRef) {
                // clicked inside settings menu, do nothing
                return;
            }
            element = element.parentElement || element.parentNode;
        } while (element !== null && element.nodeType === 1);

        // clicked elsewhere on the screen, close menu
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

    getDeviceByLabel = (label: string, deviceType: ResourceTypes) => {
        if (deviceType === ResourceTypes.AUDIO) {
            return this.audioDevicesInfo.find((device: MediaDeviceInfo) => {
                return device.label === label;
            });
        }
        if (deviceType === ResourceTypes.VIDEO) {
            return this.cameraDevicesInfo.find((device: MediaDeviceInfo) => {
                return device.label === label;
            });
        }
    };

    handleClose = () => {
        document.removeEventListener("click", this.handleExternalClick, true);

        this.setState({
            showSettingsOf: undefined
        });
    };

    /**
     *
     * @param isOn boolean, new value for the toggle control
     * @param resourceType  ResourceTypes, the type of the control that changed
     */
    handleToggleChange = (isOn: boolean, resourceType: ResourceTypes) => {
        const { onSettingsChanged, cameraOn, audioOn, screenShareOn } = this.props;

        let newCameraOn = resourceType === ResourceTypes.VIDEO ? isOn : cameraOn;
        let newAudioOn = resourceType === ResourceTypes.AUDIO ? isOn : audioOn;

        const camera = newCameraOn ? this.getCurrentDevice(ResourceTypes.VIDEO) : undefined;
        const audio = newAudioOn ? this.getCurrentDevice(ResourceTypes.AUDIO) : undefined;
        const screen = resourceType === ResourceTypes.SCREEN_SHARE ? isOn : screenShareOn;

        onSettingsChanged(false, true, screen, camera, audio);

        this.handleClose();
    };

    getCurrentDevice = (type: ResourceTypes) => {
        const { selectedCameraDevice, selectedAudioDevice } = this.props;
        if (type === ResourceTypes.VIDEO) {
            return selectedCameraDevice
                ? this.getDeviceByLabel(selectedCameraDevice.label, ResourceTypes.VIDEO)
                : this.cameraDevicesInfo[0];
        }
        if (type === ResourceTypes.AUDIO) {
            return selectedAudioDevice
                ? this.getDeviceByLabel(selectedAudioDevice.label, ResourceTypes.AUDIO)
                : this.audioDevicesInfo[0];
        }
    };

    _getCameraDevice = (device: MediaDeviceInfo) => {
        if (device.kind === "videoinput") {
            return device;
        }
        return this.getCurrentDevice(ResourceTypes.VIDEO);
    };
    _getAudioDevice = (device: MediaDeviceInfo) => {
        if (device.kind === "audioinput") {
            return device;
        }
        return this.getCurrentDevice(ResourceTypes.AUDIO);
    };

    handleChooseDevice = (device: MediaDeviceInfo) => {
        const { onSettingsChanged, cameraOn, audioOn, screenShareOn } = this.props;

        onSettingsChanged(
            true,
            false,
            screenShareOn,
            cameraOn ? this._getCameraDevice(device) : undefined,
            audioOn ? this._getAudioDevice(device) : undefined
        );

        this.handleClose();
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

    /**
     * Close/open resource settings according to clicked element.
     */
    toggleSettingsShow = (clickedResource: ResourceTypes) => {
        const { showSettingsOf } = this.state;

        if (showSettingsOf === clickedResource) {
            this.handleClose();
            return;
        }
        this.setState({ showSettingsOf: clickedResource });
    };

    render() {
        const {
            audioOn,
            cameraOn,
            allowScreenShare,
            onStartRecording,
            screenShareOn,
            allowAudio,
            allowVideo
        } = this.props;
        const { showSettingsOf } = this.state;
        const translator = Translator.getTranslator();
        const disableStart = !screenShareOn && !audioOn && !cameraOn;

        let devicesSettings = null;
        if (showSettingsOf === ResourceTypes.SCREEN_SHARE) {
            // show submenu for screen share
            devicesSettings = (
                <SettingsDevices
                    resourceName={ResourceTypes.SCREEN_SHARE}
                    devices={[]}
                    isOn={screenShareOn}
                    disabled={false} // can only turn off if both are available, so we won't end up with none
                    onChooseDevice={this.handleChooseDevice}
                    onToggleChange={(isOn: boolean) => {
                        this.handleToggleChange(isOn, ResourceTypes.SCREEN_SHARE);
                    }}
                    onClose={() => this.handleClose()}
                />
            );
        } else if (
            showSettingsOf === ResourceTypes.AUDIO ||
            showSettingsOf === ResourceTypes.VIDEO
        ) {
            // show submenu for audio or video
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
                    selected={this.getCurrentDevice(
                        showSettingsOf === ResourceTypes.VIDEO
                            ? ResourceTypes.VIDEO
                            : ResourceTypes.AUDIO
                    )}
                    onChooseDevice={this.handleChooseDevice}
                    onToggleChange={(isOn: boolean) => {
                        this.handleToggleChange(
                            isOn,
                            showSettingsOf === ResourceTypes.VIDEO
                                ? ResourceTypes.VIDEO
                                : ResourceTypes.AUDIO
                        );
                    }}
                    onClose={() => this.handleClose()}
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
                        data-title={translator.translate("Camera Settings")}
                    >
                        <span className={styles["sr-only"]}>
                            {translator.translate("Camera Settings")}
                        </span>
                        <div className={styles["resources-item"]}>
                            <div
                                className={styles["resources-icon"]}
                                aria-hidden="true"
                                role="img"
                                aria-label={translator.translate("Camera Settings")}
                            >
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
                        data-title={translator.translate("Audio Settings")}
                    >
                        <span className={styles["sr-only"]}>
                            {translator.translate("Audio Settings")}
                        </span>
                        <div className={styles["resources-item"]}>
                            <div
                                className={styles["resources-icon"]}
                                aria-hidden="true"
                                role="img"
                                aria-label={translator.translate("Audio Settings")}
                            >
                                {audioOn && <AudioIcon />}
                                {!audioOn && <NoAudioIcon />}
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
                            data-title={translator.translate("Screen Share Settings")}
                        >
                            <span className={styles["sr-only"]}>
                                {translator.translate("Screen Share Settings")}
                            </span>
                            <div className={styles["resources-item"]}>
                                <div
                                    className={styles["resources-icon"]}
                                    role="img"
                                    aria-label={translator.translate("Screen Share Settings")}
                                >
                                    {screenShareOn && <ScreenIcon />}
                                    {!screenShareOn && <NoScreenIcon />}
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
                        className={`xr_controls__start ${
                            styles["controls__start"]
                        } ${disableStart && styles["controls__start--disabled"]}`}
                        id="startRecord"
                        onClick={disableStart ? undefined : onStartRecording}
                        aria-label={translator.translate(
                            "Start Recording. recording will start in a three seconds delay"
                        )}
                        tabIndex={0}
                        data-title={translator.translate("Start Recording")}
                    />
                </div>
            </div>
        );
    }
}
