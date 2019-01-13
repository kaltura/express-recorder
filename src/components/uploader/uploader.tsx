import { Component, h } from "preact";
import { BaseEntryUpdateContentAction } from "kaltura-typescript-client/api/types/BaseEntryUpdateContentAction";
import { KalturaMediaEntry } from "kaltura-typescript-client/api/types/KalturaMediaEntry";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaUploadedFileTokenResource } from "kaltura-typescript-client/api/types/KalturaUploadedFileTokenResource";
import { MediaAddAction } from "kaltura-typescript-client/api/types/MediaAddAction";
import { UploadTokenAddAction } from "kaltura-typescript-client/api/types/UploadTokenAddAction";
import {
    KalturaClient,
    KalturaMultiRequest,
    KalturaMultiResponse
} from "kaltura-typescript-client";
import { ProgressBar } from "../progress-bar/progressBar";
const styles = require("./style.scss");

type Props = {
    client: KalturaClient | undefined;
    onError: ((e: Error) => void) | undefined;
    mediaType: KalturaMediaType;
    recordedBlobs: Blob[];
    entryName: string;
    serviceUrl: string;
    ks: string;
    conversionProfileId?: number;
};

type State = {
    total: number;
    loaded: number;
};

/**
 * handle the upload of the recorder file including display of progress bar
 */
export class Uploader extends Component<Props, State> {
    entryId: string;
    oReq: XMLHttpRequest;

    constructor(props: Props) {
        super(props);
        this.entryId = "";
        this.oReq = new XMLHttpRequest();
        this.handleOnProgress = this.handleOnProgress.bind(this);
    }

    componentDidMount() {
        this.upload();
    }

    upload() {
        const {
            mediaType,
            recordedBlobs,
            entryName,
            conversionProfileId
        } = this.props;

        this.createEntry(
            mediaType,
            recordedBlobs,
            entryName,
            conversionProfileId
        );
    }

    /**
     * 1.Add entry 2.Add uploadToken 3.Attach media with token 4.Upload token with media
     * @param {KalturaMediaType} mediaType
     * @param {Blob[]} recordedBlobs
     * @param {string} entryName
     * @param {number} conversionProfileId
     */
    createEntry(
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        conversionProfileId?: number
    ) {
        const { client } = this.props;
        const requests: KalturaMultiRequest = new KalturaMultiRequest();

        const entry = new KalturaMediaEntry();
        entry.name = entryName;
        entry.mediaType = mediaType;
        //entry.adminTags = "expressrecorder";
        requests.requests.push(
            new MediaAddAction({
                entry: entry
            })
        );

        requests.requests.push(new UploadTokenAddAction());

        const resource = new KalturaUploadedFileTokenResource({
            token: ""
        }).setDependency(["token", 1, "id"]);
        requests.requests.push(
            new BaseEntryUpdateContentAction({
                entryId: "",
                resource: resource,
                conversionProfileId: conversionProfileId
            }).setDependency(["entryId", 0, "id"])
        );

        if (!client) {
            this.throwError(new Error("Missing client object"));
            return;
        }

        client
            .multiRequest(requests)
            .then(
                (data: KalturaMultiResponse | null) => {
                    if (!data || data.hasErrors()) {
                        this.throwError(
                            new Error(
                                "Failed to create media entry: " +
                                    +(data || data!.getFirstError())
                            )
                        );
                    } else {
                        this.entryId = data[0].result.id;
                        this.addMedia(data[1].result.id);
                    }
                },
                (err: Error) => {
                    this.throwError(
                        new Error("Failed to create media entry: " + err)
                    );
                }
            )
            .catch((err: Error) => {
                this.throwError(
                    new Error("Failed to create media entry: " + err)
                );
            });
    }

    addMedia(tokenId: string) {
        const { recordedBlobs, ks, serviceUrl } = this.props;
        const blob = new Blob(recordedBlobs, { type: "video/webm" });

        const formData = new FormData();
        formData.append("ks", ks);
        formData.append("fileData", blob as File);
        formData.append("uploadTokenId", tokenId);
        formData.append("resume", "false");
        formData.append("resumeAt", "0");
        formData.append("finalChunk", "true");

        const requestUrl =
            serviceUrl + "/api_v3/?service=uploadToken&action=upload&format=1";
        this.oReq.onloadend = this.handleOnEnd;
        this.oReq.upload.onprogress = this.handleOnProgress;
        this.oReq.upload.onloadstart = this.handleStart;
        this.oReq.open("POST", requestUrl, true);
        this.oReq.send(formData);
    }

    handleOnProgress = (event: ProgressEvent) => {
        this.setState({ loaded: event.loaded, total: event.total });
    };

    handleOnEnd = () => {
        const event = new CustomEvent("mediaUploadEnded", {
            detail: { entryId: this.entryId! }
        });
        window.dispatchEvent(event);
    };

    handleStart = () => {
        const eventStart = new CustomEvent("mediaUploadStarted");
        window.dispatchEvent(eventStart);
    };

    throwError(error: Error) {
        if (this.props.onError) {
            this.props.onError(error);
        }
    }

    handleCancel = () => {
        this.oReq.abort();
    };

    render() {
        const { total, loaded } = this.state;
        return (
            <div>
                <span className={`progress-bar ${styles["progress-bar"]}`}>
                    <ProgressBar loaded={loaded} total={total} />{" "}
                </span>
                <button className={`btn btn-cancel ${styles["btn"]}`} onClick={this.handleCancel}>
                    Cancel
                </button>
            </div>
        );
    }
}
