import { Component, h } from "preact";

const styles = require("./style.scss");

type Props = {
    onButtonClick: () => void;
};

type State = {
    currentTime: number; // in seconds
    clickedOnce: boolean;
};

/**
 * Handle the timer button while recording
 */
export class RecordingTimer extends Component<Props, State> {
    interval: number | undefined;

    constructor(props: Props) {
        super(props);
        this.state = { currentTime: 0, clickedOnce: false };
        this.clickHandler = this.clickHandler.bind(this);
    }

    componentDidMount() {
        const int: any = setInterval(() => {
            this.update();
        }, 1000);
        this.interval = int as number;
    }

    update() {
        this.setState({ currentTime: this.state.currentTime + 1 });
    }

    clickHandler() {
        if (this.state.clickedOnce) {
            return;
        }

        clearInterval(this.interval);
        this.setState({ clickedOnce: true }, () => {
            if (this.props.onButtonClick) {
                this.props.onButtonClick();
            }
        });
    }

    render(props: Props, state: State) {
        const { currentTime } = state;
        return (
            <div className={`timer ${styles["timer"]}`}>
                <button
                    type={"button"}
                    className={`timer-button ${styles["timer-button"]}`}
                    onClick={this.clickHandler}
                    tabIndex={0}
                >
                    <span className={styles["square"]} />
                    <span>{currentTime}</span>
                </button>
            </div>
        );
    }
}
