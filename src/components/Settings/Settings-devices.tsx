import { Component, h } from "preact";
import { ToggleButton } from "../Toggle-button/ToggleButton";
import { Translator } from "../Translator/Translator";
import { CheckIcon } from "./icons";

const styles = require("./style.scss");

type Props = {
    resourceName: string;
    devices: MediaDeviceInfo[];
    onChooseDevice: (device: MediaDeviceInfo) => void;
    isOn: boolean;
    disabled?: boolean;
    selected?: MediaDeviceInfo;
    onToggleChange: (isOn: boolean) => void;
};

type State = {};

/**
 * Component to display devices for one resource (camera / audio)
 */
export class SettingsDevices extends Component<Props, State> {
    static defaultProps = {
        disabled: false
    };

    menuRef: HTMLElement | undefined;

    componentDidMount() {
        this.removeRedundantPopups();
        this.focusOnToggleIfPossible();
    }
    componentDidUpdate() {
        this.focusOnToggleIfPossible();
    }

    focusOnToggleIfPossible = () => {
        if (this.menuRef && this.menuRef.children[0]) {
            const toggleElement = (this.menuRef.children[0] as HTMLElement).getElementsByTagName(
                "input"
            );
            toggleElement.length > 0 && toggleElement[0].focus();
        }
    };

    removeRedundantPopups = () => {
        const popups = Array.from(document.querySelectorAll(".device-label"));
        popups.map((element: any) => {
            for (let i = 0; i < element.children.length; i++) {
                if (element.children[i].classList.contains("device-label__popup")) {
                    element.children[i].style.visibility =
                        element.scrollWidth === element.offsetWidth ? "hidden" : "";
                    break;
                }
            }
        });
    };

    handleItemClick = (item: MediaDeviceInfo) => {
        this.props.onChooseDevice(item);
    };

    handleItemPress = (e: KeyboardEvent, item: MediaDeviceInfo) => {
        if (e.key === "Enter" || e.key === " ") {
            this.handleItemClick(item);
        }
        this.handleKeyboardInput(e);
    };

    handleToggleClick = () => {
        this.props.onToggleChange(!this.props.isOn);
    };

    handleKeyboardInput = (e: KeyboardEvent) => {
        switch (e.key) {
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
        const { resourceName, devices, disabled, isOn, selected } = this.props;
        const translator = Translator.getTranslator();

        const resourcesList = devices.map((item: MediaDeviceInfo, index: number) => {
            let selectedClass = "";
            let isSelected = false;
            if (isOn && selected && item.label === selected.label) {
                selectedClass = styles["selected-device"];
                isSelected = true;
            }
            return (
                <div
                    key={index.toString()}
                    onClick={isOn && !isSelected ? () => this.handleItemClick(item) : undefined}
                    onKeyDown={e => this.handleItemPress(e, item)}
                    className={
                        selectedClass +
                        " device-label " +
                        styles["device-label"] +
                        " " +
                        (!isOn ? styles["device-disabled"] : "")
                    }
                    tabIndex={0}
                >
                    <span className={styles["sr-only"]}>{resourceName}</span>
                    <span className={styles["device-label"]}>{item.label}</span>
                    {isSelected ? (
                        <span className={styles["sr-only"]}>
                            {translator.translate("currently selected")}
                        </span>
                    ) : null}
                    {isSelected ? (
                        <span
                            className={
                                "device-label__selected-icon " +
                                styles["device-label__selected-icon"]
                            }
                        >
                            <CheckIcon />
                        </span>
                    ) : null}
                    <div className={"device-label__popup " + styles["device-label__popup"]}>
                        {item.label}
                    </div>
                </div>
            );
        });
        return (
            <div
                className={`device-settings-wrap ${styles["device-settings-wrap"]}`}
                ref={node => (this.menuRef = node)}
            >
                <ToggleButton
                    id={resourceName}
                    text={translator.translate(resourceName)}
                    onClick={this.handleToggleClick}
                    isToggleOn={isOn}
                    disabled={disabled}
                    onKeyPress={this.handleToggleClick}
                />
                {resourcesList.length > 0 ? <hr className={styles["settings-line"]} /> : null}
                <div className={styles["devices-list"]} aria-live="polite">
                    {resourcesList}
                </div>
            </div>
        );
    }
}
