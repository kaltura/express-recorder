import { h, Component } from "preact";
import { storiesOf } from "@storybook/react";
import { Recorder } from "./Recorder";
import { react } from 'preact';

class LoadData extends Component {
    state = {
        stream: null
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
            .then((stream) => {return this.handleSuccess(stream)})
            .catch(this.handleError);
    }

    handleSuccess = (s) => {
        console.log("getUserMedia() got stream: ", s);
        this.setState({stream: s})
    };

    handleError = (error) => {
        console.log("handleError : " + error);
    };

    render() {
        return <Recorder video={true} audio={true} stream={this.state.stream}/>
    }
}

storiesOf("Recorder", module).add("simple recorder", () => (<LoadData />));


