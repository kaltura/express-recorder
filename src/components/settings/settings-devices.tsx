import { Component, h } from "preact";
import { ToggleButton } from "../toggle-button/toggleButton";
const styles = require("./style.scss");

type Props = {
    resourceName: string;
    devices: object[]; // MediaDeviceInfo[]
    onChooseDevice: (device: object) => void; // device: MediaDeviceInfo
    isOn: boolean;
    selected: any;
    onClose: () => void;
    onToggleChange: (isOn: boolean) => void;
};

type State = {
    isOn: boolean;
    selectedDevice: any;
};

/**
 * Component to display devices for one resource (camera / audio)
 */
export class SettingsDevices extends Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            isOn: props.isOn,
            selectedDevice: props.selected
        };
    }

    handleItemClick = (item: any) => {
        this.setState({ selectedDevice: item }, () => {
            this.props.onChooseDevice(item);
        });
    };

    handleToggleClick = (isOn: boolean) => {
        this.setState({ isOn: isOn }, () => {
            if (this.props.onToggleChange) {
                this.props.onToggleChange(isOn);
            }
        });
    };

    handleClose = () => {
        this.props.onClose();
    };

    render() {
        const { resourceName, devices } = this.props;
        const { isOn, selectedDevice } = this.state;

        const resourcesList = devices.map((item: any, index: number) => {
            let selectedClass = "not-selected-device";
            let isSelected = false;
            if (selectedDevice && item.label === selectedDevice.label) {
                selectedClass = "selected-device";
                isSelected = true;
            }
            return (
                <div
                    key={index.toString()}
                    onClick={
                        !isSelected
                            ? () => this.handleItemClick(item)
                            : undefined
                    }
                    className={
                        styles[selectedClass] + " " + styles["device-label"]
                    }
                >
                    <span>{item.label}</span>
                    <div className={styles["device-label__popup"]}>
                        {item.label}
                    </div>
                </div>
            );
        });
        return (
            <div>
                <a
                    aria-label="Back to Settings"
                    onClick={this.handleClose}
                >
                    <i className={styles["arrow-left"]} />
                </a>
                <ToggleButton
                    id={resourceName}
                    text={resourceName}
                    onClick={this.handleToggleClick}
                    isToggleOn={isOn}
                />
                <hr className={styles["settings-line"]} />
                <div className={styles["devices-list"]}>{resourcesList}</div>
            </div>
        );
    }
}
