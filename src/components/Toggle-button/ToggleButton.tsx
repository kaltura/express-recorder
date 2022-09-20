import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    id: string;
    name?: string;
    text: string;
    screenReaderText?: string;
    onClick?: (isOn: boolean) => void;
    isToggleOn: boolean;
    disabled?: boolean;
    onKeyPress?: () => void;
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
    }
    handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick(!this.props.isToggleOn);
        }
    };

    handleKeyPress = (e: KeyboardEvent) => {
        if (e.key !== "Space") {
            return;
        }
        this.handleClick();
        if (this.props.onKeyPress) {
            this.props.onKeyPress();
        }
    };

    render(props: Props) {
        const { text, id, name, screenReaderText, disabled, isToggleOn } = props;

        let sName = name;
        if (!sName) {
            sName = id;
        }

        let srText = screenReaderText;
        if (!srText && text) {
            srText = text;
        }

        return (
            <div class={`xr_toggle-button ${styles["toggle-button"]}`}>
                <div class={`xr_toggle-button__label ${styles["toggle-button__label"]}`}>
                    {text}
                </div>
                <div class={`xr_toggle-button__button ${styles["toggle-button__button"]}`}>
                    <div>
                        <input
                            type={"checkbox"}
                            name={sName}
                            id={id}
                            class={`xr_toggle-button__checkbox ${styles["toggle-button__checkbox"]} ${styles["screenreader-only"]}`}
                            onClick={this.handleClick}
                            checked={isToggleOn}
                            tabIndex={0}
                            disabled={disabled}
                            onKeyDown={this.handleKeyPress}
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
