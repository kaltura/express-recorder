import { h, Component } from "preact";
import { storiesOf } from "@storybook/react";
import { react } from "preact";
import { AudioIndicator } from "./AudioIndicator";

class LoadData extends Component {
    state = {
        stream: null,
        doRecording: false
    };

    constructor(props) {
        super(props);

        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    componentDidMount() {
        const constraints = {
            audio: true,
            video: true
        };

        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then(stream => {
                return this.handleSuccess(stream);
            })
            .catch(this.handleError);
    }

    handleSuccess = s => {
        console.log("getUserMedia() got stream: ", s);
        this.setState({ stream: s });
    };

    handleError = error => {
        console.log("handleError : " + error);
    };

    render() {
        return (
            <div>
                <AudioIndicator
                    stream={this.state.stream}
                />
            </div>
        );
    }
}

storiesOf("Audio Level", module).add("simple audio level", () => <LoadData />);