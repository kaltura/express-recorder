import { h, Component } from "preact";
import { storiesOf } from "@storybook/react";
import { Recorder } from "../Recorder/Recorder";
import { Uploader } from "./Uploader";
import { react } from "preact";
import { KalturaClient } from "kaltura-typescript-client";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/index";

class LoadData extends Component {
    state = {
        stream: null,
        uploadMedia: false
    };

    recordedBlobs;

    constructor(props) {
        super(props);

        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
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

    handleUpload = recorderBlobs => {
        this.recordedBlobs = recorderBlobs;
        this.setState({ uploadMedia: true });
    };

    render() {
        if (this.state.uploadMedia) {
        	if (this.executed)
			{
				throw new Error("already executed");
			}

        	this.executed = true;

            const uploader = new Uploader();
            const kClient = new KalturaClient(
				{
					endpointUrl: "https://www.kaltura.com",
					clientTag: "kms_client"
				},
                {
                    ks: "djJ8MjMyNjgyMXyDMqaJUz7sLkXsAcqlMlEFvgmJ_vaap181wfuq9tMjzIRlejMmp-m2KwmpVbV-ZbIIgCH2dZv17PA-U72V_YrvrGF0BQ7bOd36DSmla54v4JJLXbsQtrtIAhNRrzq6boex7G5Vnp4UTHrJpv2_xu4oqbRrNA-T-jsZSeoXFw_5rA=="
                }
            );
            uploader.upload(
                kClient,
				KalturaMediaType.video,
                this.recordedBlobs,
				"Uploader test"
            );
        }
        return (
            <div>
                <Recorder
                    video={true}
                    audio={true}
                    stream={this.state.stream}
                    handleUpload={this.handleUpload}
                />
            </div>
        );
    }
}

storiesOf("Uploader", module).add("upload recorded", () => <LoadData />);
