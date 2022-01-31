import { Component, h } from "preact";
import { SettingsDevices } from "./Settings-devices";
import SettingsIcon from "./settings.svg";
import { AudioIndicator } from "../AudioIndicator/AudioIndicator";
import { Translator } from "../Translator/Translator";

const styles = require("./style.scss");

type Props = {
    onSettingsChanged?: (
        selectedCamera: MediaDeviceInfo | false,
        selectedAudio: MediaDeviceInfo | false
    ) => void;
    selectedCameraDevice?: MediaStreamTrack;
    selectedAudioDevice?: MediaStreamTrack;
    allowVideo: boolean;
    allowAudio: boolean;
    stream?: MediaStream | undefined;
};

type State = {
    isOpen: boolean;
    selectedCamera: MediaDeviceInfo | false;
    selectedAudio: MediaDeviceInfo | false;
    showCameraSettings: boolean;
    showAudioSettings: boolean;
    cameraOn: boolean;
    audioOn: boolean;
};

export enum ResourceTypes {
    VIDEO = "Camera",
    AUDIO = "Audio"
}

/**
 * Component to handle settings menu for resources and devices
 */
export class Settings extends Component<Props, State> {
    cameraDevicesInfo: MediaDeviceInfo[];
    audioDevicesInfo: MediaDeviceInfo[];
    menuBoxRef: Element | undefined;
    mainMenuRef: HTMLElement | undefined;

    constructor(props: Props) {
        super(props);

        let selectedCamera: any = false;
        if (props.selectedCameraDevice) {
            selectedCamera = {
                kind: "videoinput",
                label: props.selectedCameraDevice.label
            };
        }
        let selectedAudio: any = false;
        if (props.selectedAudioDevice) {
            selectedAudio = {
                kind: "audioinput",
                label: props.selectedAudioDevice.label
            };
        }
        this.state = {
            isOpen: false,
            selectedCamera: selectedCamera,
            selectedAudio: selectedAudio,
            showAudioSettings: false,
            showCameraSettings: false,
            cameraOn: props.allowVideo,
            audioOn: props.allowAudio
        };

        this.cameraDevicesInfo = [];
        this.audioDevicesInfo = [];
    }

    componentDidMount() {
        this.getDevices();
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        // get updated resources once stream is ready
        if (
            (!prevProps.selectedCameraDevice && this.props.selectedCameraDevice) ||
            (!prevProps.selectedAudioDevice && this.props.selectedAudioDevice)
        ) {
            let selectedCamera: any = false;
            if (this.props.selectedCameraDevice) {
                selectedCamera = {
                    kind: "videoinput",
                    label: this.props.selectedCameraDevice.label
                };
            }
            let selectedAudio: any = false;
            if (this.props.selectedAudioDevice) {
                selectedAudio = {
                    kind: "audioinput",
                    label: this.props.selectedAudioDevice.label
                };
            }

            this.setState({
                selectedCamera: selectedCamera,
                selectedAudio: selectedAudio
            });
        }

        if (
            this.cameraDevicesInfo.length === 0 ||
            this.cameraDevicesInfo[0].label === "" ||
            this.audioDevicesInfo.length === 0 ||
            this.audioDevicesInfo[0].label === ""
        ) {
            this.getDevices();
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

    toggleMenu = () => {
        const { isOpen } = this.state;
        this.setState({ isOpen: !isOpen }, () => {
            if (isOpen) {
                this.handleClose();
            } else {
                // handle drop down toggle click
                document.addEventListener("click", this.handleExternalClick, true);
                if (this.mainMenuRef) {
                    (this.mainMenuRef.children[0] as HTMLElement).focus();
                }
            }
        });
    };

    handleMenuIconKeyPressed = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            this.toggleMenu();
        }
    };

    getResourceSettings = (type: ResourceTypes) => {
        if (type === ResourceTypes.VIDEO) {
            this.setState({
                showCameraSettings: true,
                showAudioSettings: false
            });
        } else {
            this.setState({
                showCameraSettings: false,
                showAudioSettings: true
            });
        }
    };

    handleChooseDevice = (device: MediaDeviceInfo) => {
        if (device.kind === "videoinput") {
            this.setState({ selectedCamera: device }, () => {
                this.saveSettings();
            });
        } else {
            this.setState({ selectedAudio: device }, () => {
                this.saveSettings();
            });
        }
    };

    handleClose = () => {
        document.removeEventListener("click", this.handleExternalClick, true);

        this.setState({
            isOpen: false,
            showAudioSettings: false,
            showCameraSettings: false
        });
    };

    /**
     *
     * @param isOn boolean, new value for the toggle control
     * @param resourceType  ResourceTypes, the type of the control that changed
     */
    handleToggleChange = (isOn: boolean, resourceType: ResourceTypes) => {
        let { cameraOn, audioOn } = this.state;

        // do not allow both camera and audio to be turned off
        cameraOn = !isOn && resourceType === ResourceTypes.AUDIO ? true : cameraOn;
        audioOn = !isOn && resourceType === ResourceTypes.VIDEO ? true : audioOn;

        this.setState(
            {
                cameraOn: resourceType === ResourceTypes.VIDEO ? isOn : cameraOn,
                audioOn: resourceType === ResourceTypes.AUDIO ? isOn : audioOn
            },
            () => {
                this.saveSettings();
            }
        );
    };

    saveSettings = () => {
        if (this.props.onSettingsChanged) {
            const camera = this.state.cameraOn ? this.state.selectedCamera : false;
            const audio = this.state.audioOn ? this.state.selectedAudio : false;
            this.props.onSettingsChanged(camera, audio);
        }
    };

    handleBack = () => {
        this.setState({
            showAudioSettings: false,
            showCameraSettings: false
        });
    };

    handleKeyboardInput = (e: KeyboardEvent, type: ResourceTypes) => {
        switch (e.key) {
            case "Enter":
            case "ArrowRight":
                this.getResourceSettings(type);
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

    render() {
        const { stream, allowAudio, allowVideo } = this.props;
        const {
            isOpen,
            showCameraSettings,
            showAudioSettings,
            selectedAudio,
            selectedCamera,
            cameraOn,
            audioOn
        } = this.state;
        const translator = Translator.getTranslator();

        let devicesSettings = null;
        if (showAudioSettings || showCameraSettings) {
            devicesSettings = (
                <SettingsDevices
                    resourceName={showCameraSettings ? ResourceTypes.VIDEO : ResourceTypes.AUDIO}
                    devices={showCameraSettings ? this.cameraDevicesInfo : this.audioDevicesInfo}
                    isOn={showCameraSettings ? cameraOn : audioOn}
                    disabled={!(allowVideo && allowAudio)} // can only turn off if both are available, so we won't end up with none
                    selected={showCameraSettings ? selectedCamera : selectedAudio}
                    onBack={() => {
                        this.handleBack();
                    }}
                    onChooseDevice={this.handleChooseDevice}
                    onToggleChange={(isOn: boolean) => {
                        this.handleToggleChange(
                            isOn,
                            showCameraSettings ? ResourceTypes.VIDEO : ResourceTypes.AUDIO
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
                <div
                    className={`${styles["settings-icon"]}  ${
                        styles[isOpen ? "settings-icon-open" : "settings-icon-close"]
                    }`}
                    onClick={this.toggleMenu}
                >
                    <a
                        role={"button"}
                        onKeyPress={this.handleMenuIconKeyPressed}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        aria-label={translator.translate("Settings")}
                        aria-controls="recorder-settings-menu"
                        tabIndex={0}
                    >
                        <SettingsIcon />
                    </a>
                </div>
                {isOpen && (
                    <div
                        id="recorder-settings-menu"
                        className={`xr_settings-box ${styles["settings-box"]}`}
                    >
                        {!showCameraSettings && !showAudioSettings && (
                            <div
                                className={styles["resources-list"]}
                                role="menu"
                                aria-labelledby="dropdownMenu"
                                ref={node => (this.mainMenuRef = node)}
                            >
                                <a
                                    className={styles["resource-link"]}
                                    onClick={() => {
                                        this.getResourceSettings(ResourceTypes.VIDEO);
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
                                        <div
                                            className={styles["resources-name"]}
                                            aria-hidden="true"
                                        >
                                            {translator.translate("Camera")}
                                        </div>
                                        <div className={styles["resource-label"]}>
                                            {selectedCamera ? selectedCamera.label : ""}
                                        </div>
                                        <div className={styles["arrow-wrap"]}>
                                            <i className={styles["arrow-right"]} />
                                        </div>
                                    </div>
                                </a>
                                <a
                                    className={styles["resource-link"]}
                                    onClick={() => {
                                        this.getResourceSettings(ResourceTypes.AUDIO);
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
                                        <div className={styles["resources-name"]}>
                                            <span aria-hidden="true">
                                                {translator.translate("Audio")}
                                            </span>
                                            {stream && (
                                                <div className={styles["settings-audio-indicator"]}>
                                                    <AudioIndicator
                                                        stream={stream}
                                                        audioOn={audioOn}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles["resource-label"]}>
                                            {selectedAudio ? selectedAudio.label : ""}
                                        </div>

                                        <div className={styles["arrow-wrap"]}>
                                            <i className={styles["arrow-right"]} />
                                        </div>
                                    </div>
                                </a>
                            </div>
                        )}
                        {devicesSettings}
                    </div>
                )}
            </div>
        );
    }
}
