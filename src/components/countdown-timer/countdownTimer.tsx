import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    initialValue: number;
    onCountdownComplete: () => void;
};

type State = {
    countdown: number;
};

/**
 * Component to show countdown from X to 0. uses for delay between clicking on start recording to the actual recording
 */
export class CountdownTimer extends Component<Props, State> {
    static defaultProps = {
        radius: 44
    };

    interval: number | undefined;

    constructor(props: Props) {
        super(props);
        this.state = { countdown: props.initialValue };
    }

    componentDidMount() {
        const id: any = setInterval(() => {
            this.update();
        }, 1000);
        this.interval = id as number;
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    update() {
        const { countdown } = this.state;
        const { onCountdownComplete } = this.props;

        if (countdown <= 1) {
            // countdown done
            this.interval && clearInterval(this.interval);
            onCountdownComplete();
        }

        // update
        this.setState({ countdown: countdown - 1 });
    }

    render(props: Props, state: State) {
        const { countdown } = state;

        return (
            <div class={`xr_countdown ${styles["countdown"]}`}>
                <div className={`xr_countdown-number ${styles["countdown-number"]}`}>
                    {countdown}
                </div>
                <div className={`xr_circle ${styles["circle"]}`} />
            </div>
        );
    }
}
