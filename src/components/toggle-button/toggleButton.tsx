import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    id: string;
    name?: string;
    text: string;
    screenReaderText?: string;
    onClick?: (isOn: boolean) => void;
    isToggleOn: boolean;
};

type State = {
    isToggleOn: boolean;
};

export class ToggleButton extends Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            isToggleOn: props.isToggleOn
        };
    }
    handleClick = () => {
        const { isToggleOn } = this.state;
        if (this.props.onClick) {
            this.props.onClick(!isToggleOn);
        }
        this.setState({ isToggleOn: !isToggleOn });
    };

    render(props: Props) {
        const { text, id, name, screenReaderText } = props;
        const {isToggleOn} = this.state;

        let sName = name;
        if (!sName) {
            sName = id;
        }

        let srText = screenReaderText;
        if (!srText && text) {
            srText = text;
        }

        return (
            <div class={`toggle-button ${styles["toggle-button"]}`}>
                <div
                    class={`toggle-button__label ${
                        styles["toggle-button__label"]
                    }`}
                >
                    {text}
                </div>
                <div
                    class={`toggle-button__button ${
                        styles["toggle-button__button"]
                    }`}
                >
                    <div>
                        <input
                            type={"checkbox"}
                            name={sName}
                            id={id}
                            class={`toggle-button__checkbox ${
                                styles["toggle-button__checkbox"]
                            } ${styles["screenreader-only"]}`}
                            onClick={this.handleClick}
                            checked={isToggleOn}
                        />
                        <label
                            for={id}
                            class={`toggle-button__checkbox-label ${
                                styles["toggle-button__checkbox-label"]
                            }`}
                        >
                            <span class={styles["screenreader-only"]}>
                                {srText}
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}
