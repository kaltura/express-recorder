import { Component, h } from "preact";
import { ToggleButton } from "../Toggle-button/ToggleButton";
import { Translator } from "../Translator/Translator";
import { CheckIcon } from "./icons";

const styles = require("./style.scss");

type Props = {
    resourceName: string;
    devices: MediaDeviceInfo[];

    /**
     * triggered when a device is selected from the list
     * @param device
     */
    onChooseDevice: (device: MediaDeviceInfo) => void;

    /**
     * is the resource currently on
     */
    isOn: boolean;
    disabled?: boolean;

    /**
     * currently selected device
     */
    selected?: MediaDeviceInfo;

    /**
     * triggered when a resource is turned on/off
     * @param isOn
     */
    onToggleChange: (isOn: boolean) => void;

    onClose: () => void;
};

type State = {};

/**
 * Component to display devices menu for one resource (camera / audio)
 */
export class SettingsDevices extends Component<Props, State> {
    static defaultProps = {
        disabled: false
    };

    menuRef: HTMLElement | undefined;
    toggleRef?: HTMLElement | null = null;
    containerRef?: HTMLElement | null = null;

    componentDidMount() {
        this.removeRedundantPopups();
        this.focusOnToggleIfPossible();
    }
    componentDidUpdate() {
        this.focusOnToggleIfPossible();
    }

    focusOnToggleIfPossible = () => {
        if (this.menuRef && this.menuRef.children[0] && this.containerRef) {
            this.containerRef.focus();
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
        switch (e.key) {
            case "Enter": // intentional case falldown
            case " ":
                this.handleItemClick(item);
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
            case "Escape":
                this.props.onClose();
                break;
            default:
        }
    };

    handleToggleClick = () => {
        this.props.onToggleChange(!this.props.isOn);
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
            /**
             * Positions the tooltip for a menu item dynamically, especially when the menu is zoomed
             * and scrolling is active. Adjusts the tooltip's position and size based on the screen width.
             * @param event - The event triggered when interacting with a menu item.
             */
            function showTooltip(event: any) {
                const label = event.currentTarget;
                const tooltip = label.querySelector(".device-label__popup");

                const rect = label.getBoundingClientRect();
                if (window.innerWidth <= 427) {
                    tooltip.style.top = `${rect.top - 10}px`;
                    tooltip.style.left = `${rect.left - rect.width / 2}px`;
                    tooltip.style.transform = "translateY(50%)";
                    tooltip.style.width = "60%";
                }
                if (window.innerWidth <= 320) {
                    tooltip.style.left = `${rect.left - rect.width}px`;
                }
            }
            return (
                <div
                    key={index.toString()}
                    onClick={isOn && !isSelected ? () => this.handleItemClick(item) : undefined}
                    onKeyDown={e => this.handleItemPress(e, item)}
                    onMouseOver={showTooltip}
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
                    onClose={() => this.props.onClose()}
                    isToggleOn={isOn}
                    toggleRef={node => (this.toggleRef = node)}
                    containerRef={node => (this.containerRef = node)}
                    disabled={disabled}
                />
                <div className={styles["devices-list"]} aria-live="polite">
                    {resourcesList}
                </div>
            </div>
        );
    }
}
