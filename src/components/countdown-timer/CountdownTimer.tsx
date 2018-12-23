import {Component, h} from "preact";
import Timer = NodeJS.Timer;
const styles = require('./style.scss');

type Props = {
    initialValue:number;
    onCountdownComplete: () => void;
    radius?: number;
}

type State = {
    countdown:number;
}


export class CountdownTimer extends Component<Props, State>{

    static defaultProps = {
        radius: 20
    };

    interval:Timer | undefined;
    circleRef:HTMLElement | undefined;

    componentDidMount() {
        const {initialValue} = this.props;
        this.setState({countdown: initialValue});
        this.interval = setInterval(() => {
            this.update();
        }, 1000);

        if (this.circleRef) {
            this.circleRef.style.animationDuration = initialValue + "s";
        }
    }

    update() {
        const {countdown} = this.state;
        const {onCountdownComplete} = this.props;

        if (countdown <= 1) {
            // countdown done
            this.interval && clearInterval(this.interval);
            onCountdownComplete();
        }

        // update
        this.setState({countdown: countdown - 1});
    }

    render(props:Props, state:State) {
        const {countdown} = state;
        const {radius} = props;

        return (
            <div class={styles['countdown']}>
                <div class={styles['countdown-number']}>{countdown}</div>
                <svg class={styles['svg']}>
                    <circle class={styles['circle']} ref={circle => this.circleRef = circle as HTMLElement}
                        r={radius! - 2} cx={radius} cy={radius}></circle>
                </svg>
            </div>
        );
    }
}