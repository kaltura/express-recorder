import { Component, h } from "preact";
import { SettingsDevices } from "./settings-devices";
import SettingsIcon from "./settings.svg";
const styles = require("./style.scss");

type Props = {
    onSettingsChanged?: (selectedCamera: any, selectedAudio: any) => void;
    selectedCamera?: any;
    selectedAudio?: any;
    allowVideo: boolean;
    allowAudio: boolean;
};

type State = {
    isOpen: boolean;
    selectedCamera: any;
    selectedAudio: any;
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
    cameraDevicesInfo: any[];
    audioDevicesInfo: any[];
    menuBoxRef: Element | undefined;

    constructor(props: Props) {
        super(props);

        this.state = {
            isOpen: false,
            selectedCamera: props.selectedCamera,
            selectedAudio: props.selectedAudio,
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

    componentDidUpdate() {
        // get updated resources once stream is ready
        if (
            (!this.state.selectedCamera || !this.state.selectedAudio) &&
            this.props.selectedCamera
        ) {
            this.setState({
                selectedCamera: this.props.selectedCamera,
                selectedAudio: this.props.selectedAudio
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

    // handle global window click event
    handleExternalClick = (e: any) => {
        let element = e.target;

        do {
            if (element === this.menuBoxRef) {
                return;
            }
            element = element.parentElement || element.parentNode;
        } while (element !== null && element.nodeType === 1);

        this.toggleMenu();
    };

    getDevices = () => {
        // get available devices
        if (navigator.mediaDevices) {
            navigator.mediaDevices
                .enumerateDevices()
                .then((devices: object[]) => {
                    this.cameraDevicesInfo = devices.filter(
                        (item: any) => item.kind === "videoinput"
                    );
                    this.audioDevicesInfo = devices.filter(
                        (item: any) => item.kind === "audioinput"
                    );
                });
        }
    };
    toggleMenu = () => {
        const { isOpen } = this.state;
        this.setState({ isOpen: !isOpen }, () => {
            if (isOpen) {
                this.handleClose();
                document.removeEventListener(
                    "click",
                    this.handleExternalClick,
                    true
                );
            } else {
                // handle drop down toggle click
                document.addEventListener(
                    "click",
                    this.handleExternalClick,
                    true
                );
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

    handleChooseDevice = (device: any) => {
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
        this.setState({
            isOpen: false,
            showAudioSettings: false,
            showCameraSettings: false
        });
    };

    handleToggleChange = (isOn: boolean, type: ResourceTypes) => {
        const { cameraOn, audioOn } = this.state;
        this.setState(
            {
                cameraOn: type === ResourceTypes.VIDEO ? isOn : cameraOn,
                audioOn: type === ResourceTypes.AUDIO ? isOn : audioOn
            },
            () => {
                this.saveSettings();
            }
        );
    };

    saveSettings = () => {
        if (this.props.onSettingsChanged) {
            const camera = this.state.cameraOn
                ? this.state.selectedCamera
                : false;
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

    handleShowDeviceSettings = (e: KeyboardEvent, type: ResourceTypes) => {
        if (e.key === "Enter") {
            this.getResourceSettings(type);
        }
    };

    render() {
        const {
            isOpen,
            showCameraSettings,
            showAudioSettings,
            selectedAudio,
            selectedCamera,
            cameraOn,
            audioOn
        } = this.state;

        let devicesSettings = null;
        if (showAudioSettings || showCameraSettings) {
            devicesSettings = (
                <SettingsDevices
                    resourceName={
                        showCameraSettings
                            ? ResourceTypes.VIDEO
                            : ResourceTypes.AUDIO
                    }
                    devices={
                        showCameraSettings
                            ? this.cameraDevicesInfo
                            : this.audioDevicesInfo
                    }
                    isOn={showCameraSettings ? cameraOn : audioOn}
                    selected={
                        showCameraSettings ? selectedCamera : selectedAudio
                    }
                    onClose={() => {
                        this.handleBack();
                    }}
                    onChooseDevice={this.handleChooseDevice}
                    onToggleChange={(isOn: boolean) => {
                        this.handleToggleChange(
                            isOn,
                            showCameraSettings
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
                <div className={styles["settings-icon-wrap"]}>
                    <a
                        role={"button"}
                        onClick={this.toggleMenu}
                        onKeyPress={this.handleMenuIconKeyPressed}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        aria-label={"Settings"}
                        aria-controls="recorder-settings-menu"
                        tabIndex={0}
                    >
                        <SettingsIcon />
                    </a>
                </div>
                {isOpen && (
                    <div
                        id="recorder-settings-menu"
                        className={`settings-box ${styles["settings-box"]}`}
                    >
                        {!showCameraSettings && !showAudioSettings && (
                            <div
                                className={styles["resources-list"]}
                                role="menu"
                                aria-labelledby="dropdownMenu"
                            >
                                <a
                                    aria-label="Camera Settings"
                                    className={styles["resource-link"]}
                                    onClick={() => {
                                        this.getResourceSettings(
                                            ResourceTypes.VIDEO
                                        );
                                    }}
                                    onKeyPress={e => {
                                        this.handleShowDeviceSettings(
                                            e,
                                            ResourceTypes.VIDEO
                                        );
                                    }}
                                    tabIndex={0}
                                >
                                    <div className={styles["resources-item"]}>
                                        <div
                                            className={styles["resources-name"]}
                                        >
                                            Camera
                                        </div>
                                        <div
                                            className={styles["resource-label"]}
                                        >
                                            {selectedCamera
                                                ? selectedCamera.label
                                                : ""}
                                        </div>
                                        <div className={styles["arrow-wrap"]}>
                                            <i
                                                className={
                                                    styles["arrow-right"]
                                                }
                                            />
                                        </div>
                                    </div>
                                </a>
                                <a
                                    aria-label="Audio Settings"
                                    className={styles["resource-link"]}
                                    onClick={() => {
                                        this.getResourceSettings(
                                            ResourceTypes.AUDIO
                                        );
                                    }}
                                    onKeyPress={e => {
                                        this.handleShowDeviceSettings(
                                            e,
                                            ResourceTypes.AUDIO
                                        );
                                    }}
                                    tabIndex={0}
                                >
                                    <div className={styles["resources-item"]}>
                                        <div
                                            className={styles["resources-name"]}
                                        >
                                            Audio
                                        </div>
                                        <div
                                            className={styles["resource-label"]}
                                        >
                                            {selectedAudio
                                                ? selectedAudio.label
                                                : ""}
                                        </div>

                                        <div className={styles["arrow-wrap"]}>
                                            <i
                                                className={
                                                    styles["arrow-right"]
                                                }
                                            />
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
