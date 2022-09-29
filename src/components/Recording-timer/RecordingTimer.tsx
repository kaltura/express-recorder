import { Component, h } from "preact";
import { StopIcon } from "./icons/stop";

const styles = require("./style.scss");

type Props = {
    onStop: () => void;
    maxRecordingTime?: number;
    setStopButtonRef: (ref: HTMLElement) => void;
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
    }

    componentDidMount() {
        const int: any = setInterval(() => {
            this.update();
        }, 1000);
        this.interval = int as number;
    }

    update() {
        const { maxRecordingTime } = this.props;
        if (maxRecordingTime && maxRecordingTime <= this.state.currentTime) {
            this.handleStop();
            return;
        }
        this.setState({ currentTime: this.state.currentTime + 1 });
    }

    handleStop = () => {
        if (this.state.clickedOnce) {
            return;
        }

        clearInterval(this.interval);
        this.setState({ clickedOnce: true }, () => {
            this.props.onStop();
        });
    };

    render(props: Props, state: State) {
        const { currentTime } = state;
        const hours = Math.floor(currentTime / 3600);
        const minutes = Math.floor((currentTime - hours * 3600) / 60);
        const seconds = currentTime - hours * 3600 - minutes * 60;
        let timeString = hours > 0 ? hours + ":" : "";
        timeString += minutes < 10 ? "0" + minutes : minutes;
        timeString += ":" + (seconds < 10 ? "0" + seconds : seconds);

        return (
            <div className={`xr_recording-timer ${styles["recording-timer"]}`}>
                <div className={`xr_recording-menu ${styles["recording-menu"]}`}>
                    <div>
                        <button
                            type={"button"}
                            className={`xr_timer-button ${styles["timer-button"]}`}
                            onClick={this.handleStop}
                            tabIndex={0}
                            ref={props.setStopButtonRef}
                        >
                            <StopIcon />
                        </button>
                    </div>
                    <div className={`xr_timer ${styles["timer"]}`}>{timeString}</div>
                </div>
            </div>
        );
    }
}
