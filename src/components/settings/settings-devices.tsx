import { Component, h } from "preact";
import { ToggleButton } from "../toggle-button/toggleButton";
const styles = require("./style.scss");

type Props = {
    resourceName: string;
    devices: object[]; // MediaDeviceInfo[]
    onChooseDevice: (device: object) => void; // device: MediaDeviceInfo
    isOn: boolean;
    selected: any;
    onBack: () => void;
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

    componentDidMount() {
        this.removeRedundantPopups();
    }

    removeRedundantPopups = () => {
        const popups = Array.from(document.querySelectorAll(".device-label"));
        popups.map((element: any) => {
            for (let i = 0; i < element.children.length; i++) {
                if (
                    element.children[i].classList.contains(
                        "device-label__popup"
                    )
                ) {
                    element.children[i].style.visibility =
                        element.scrollWidth === element.offsetWidth
                            ? "hidden"
                            : "";
                    break;
                }
            }
        });
    };

    handleItemClick = (item: any) => {
        this.setState({ selectedDevice: item }, () => {
            this.props.onChooseDevice(item);
            this.handleBack();
        });
    };

    handleItemPress = (e: KeyboardEvent, item: any) => {
        if (e.key === "Enter") {
            this.handleItemClick(item);
        }
    };

    handleToggleClick = (isOn: boolean) => {
        this.setState({ isOn: isOn }, () => {
            if (this.props.onToggleChange) {
                this.props.onToggleChange(isOn);
            }
        });
    };

    handleBack = () => {
        this.props.onBack();
    };

    handleBackIconKeyPressed = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            this.handleBack();
        }
    };

    render() {
        const { resourceName, devices } = this.props;
        const { isOn, selectedDevice } = this.state;

        const resourcesList = devices.map((item: any, index: number) => {
            let selectedClass = "";
            let isSelected = false;
            if (isOn && selectedDevice && item.label === selectedDevice.label) {
                selectedClass = styles["selected-device"];
                isSelected = true;
            }
            return (
                <div
                    key={index.toString()}
                    onClick={
                        isOn && !isSelected
                            ? () => this.handleItemClick(item)
                            : undefined
                    }
                    onKeyPress={e => this.handleItemPress(e, item)}
                    className={
                        selectedClass +
                        " device-label " +
                        styles["device-label"] +
                        " " +
                        (!isOn ? styles["device-disabled"] : "")
                    }
                    tabIndex={0}
                >
                    <span>{item.label}</span>
                    <div
                        className={
                            "device-label__popup " +
                            styles["device-label__popup"]
                        }
                    >
                        {item.label}
                    </div>
                </div>
            );
        });
        return (
            <div>
                <a
                    aria-label="Back to Settings"
                    onClick={this.handleBack}
                    onKeyPress={this.handleBackIconKeyPressed}
                    className={styles["settings-arrow-wrap"]}
                    tabIndex={0}
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
