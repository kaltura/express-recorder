import { h, Component } from "preact";

export interface CustomComponentProps {
    isHappy: boolean;
}

interface CustomComponentState {
    blink: boolean;
}

export class CustomComponent extends Component<CustomComponentProps, CustomComponentState> {
    static defaultProps = {
        isHappy: true
    };
    state: CustomComponentState = {
        blink: false
    };

    toggleBlinking = () => {
        this.setState((prevState: CustomComponentState) => ({ blink: !prevState.blink }));
    };

    componentWillUnmount(): void {
        console.log("component was unmounted");
    }

    render() {
        const { isHappy } = this.props;
        const { blink } = this.state;

        return (
            <div>
                <p style={{ "font-size": "80px" }}>
                    {blink ? ";" : ":"}
                    {isHappy ? ")" : "("}
                </p>
            </div>
        );
    }
}
