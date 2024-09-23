import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    id: string;
    name?: string;
    text: string;
    screenReaderText?: string;
    onClick?: (isOn: boolean) => void;
    onClose: () => void;
    isToggleOn: boolean;
    disabled?: boolean;
    toggleRef?: (element: HTMLElement | null) => void;
    containerRef?: (element: HTMLElement | null) => void;
};

type State = {};

/**
 * show toggle button. used in settings box to turn on/off resource
 */
export class ToggleButton extends Component<Props, State> {
    static defaultProps = {
        disabled: false
    };

    constructor(props: Props) {
        super(props);

        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick(!this.props.isToggleOn);
        }
    };

    /**
     * keydown handler
     * @param e
     */
    handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === " ") {
            e.preventDefault();
            this.handleClick();
        } else if (e.key === "Escape") {
            e.preventDefault();
            this.props.onClose();
        }
    };

    render(props: Props) {
        const {
            text,
            id,
            name,
            screenReaderText,
            disabled,
            isToggleOn,
            containerRef,
            toggleRef
        } = props;

        let sName = name;
        if (!sName) {
            sName = id;
        }

        let srText = screenReaderText;
        if (!srText && text) {
            srText = text;
        }

        return (
            <div
                ref={containerRef}
                onKeyDown={this.handleKeyDown}
                tabIndex={0}
                class={`xr_toggle-button ${styles["toggle-button"]}`}
            >
                <div class={`xr_toggle-button__label ${styles["toggle-button__label"]}`}>
                    {text}
                </div>
                <div class={`xr_toggle-button__button ${styles["toggle-button__button"]}`}>
                    <div>
                        <input
                            type={"checkbox"}
                            name={sName}
                            id={id}
                            ref={toggleRef}
                            class={`xr_toggle-button__checkbox ${styles["toggle-button__checkbox"]} ${styles["screenreader-only"]}`}
                            onClick={this.handleClick}
                            checked={isToggleOn}
                            tabIndex={-1}
                            disabled={disabled}
                        />
                        <label
                            for={id}
                            class={`xr_toggle-button__checkbox-label ${styles["toggle-button__checkbox-label"]}`}
                        >
                            <span class={styles["screenreader-only"]}>{srText}</span>
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}
