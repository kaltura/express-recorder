import { Component, h } from "preact";
const styles = require("./style.scss");

type Props = {
    initialValue: number;
    onCountdownComplete: () => void;
    radius?: number;
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
    circleRef: HTMLElement | undefined;

    constructor(props: Props) {
        super(props);
        this.state = { countdown: props.initialValue };
    }

    componentDidMount() {
        const { initialValue } = this.props;
        const id: any = setInterval(() => {
            this.update();
        }, 1000);
        this.interval = id as number;

        if (this.circleRef) {
            this.circleRef.style.animationDuration = initialValue + "s";
        }
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
        const { radius } = props;

        return (
            <div class={`countdown ${styles["countdown"]}`}>
                <div class={`countdown-number ${styles["countdown-number"]}`}>{countdown}</div>
                <svg class={styles["svg"]}>
                    <circle
                        class={styles["circle"]}
                        ref={circle => (this.circleRef = circle as HTMLElement)}
                        r={radius! - 2}
                        cx={radius}
                        cy={radius}
                    />
                </svg>
            </div>
        );
    }
}
