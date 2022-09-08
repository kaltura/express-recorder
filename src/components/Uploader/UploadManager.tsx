import { Component, h } from "preact";
import { BaseEntryUpdateContentAction } from "kaltura-typescript-client/api/types/BaseEntryUpdateContentAction";
import { KalturaMediaEntry } from "kaltura-typescript-client/api/types/KalturaMediaEntry";
import { KalturaMediaType } from "kaltura-typescript-client/api/types/KalturaMediaType";
import { KalturaUploadedFileTokenResource } from "kaltura-typescript-client/api/types/KalturaUploadedFileTokenResource";
import { MediaAddAction } from "kaltura-typescript-client/api/types/MediaAddAction";
import { BaseEntryDeleteAction } from "kaltura-typescript-client/api/types/BaseEntryDeleteAction";
import { UploadTokenUploadAction } from "kaltura-typescript-client/api/types/UploadTokenUploadAction";
import { UploadTokenAddAction } from "kaltura-typescript-client/api/types/UploadTokenAddAction";
import { CancelableAction } from "kaltura-typescript-client/cancelable-action";
import {
    KalturaClient,
    KalturaMultiRequest,
    KalturaMultiResponse
} from "kaltura-typescript-client";
import { KalturaUploadToken } from "kaltura-typescript-client/api/types";
import { UploadUI } from "./UploadUI";

type Props = {
    client: KalturaClient | undefined;
    onError?: (error: string) => void;
    onUploadStarted?: (entryId: string) => void;
    onUploadEnded?: (entryId: string) => void;
    onUploadCancelled?: () => void;
    onUploadProgress?: (loaded: number, total: number) => void;
    mediaType: KalturaMediaType;
    recordedBlobs: Blob[];
    entryName: string;
    serviceUrl: string;
    ks: string;
    conversionProfileId?: number;
    abortUpload?: boolean;
    childRecordedBlobs?: Blob[];
    showUploadUI?: boolean;
    onCancel: () => void;
};

type State = {
    loaded: number;
    abort: boolean;
    total: number;
    doChildUpload: boolean;
    uploadDone: boolean;
};

/**
 * handle upload of recorded media
 */
export class UploadManager extends Component<Props, State> {
    static defaultProps = {
        abortUpload: false
    };

    childEntryId: string;
    entryId: string;

    cancellableUploadAction: CancelableAction<KalturaUploadToken> | undefined;

    constructor(props: Props) {
        super(props);

        this.entryId = "";
        this.childEntryId = "";

        this.state = {
            loaded: 0,
            abort: false,
            doChildUpload: false,
            uploadDone: false,
            total: 0
        };
        this.addMedia = this.addMedia.bind(this);
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        // if abort upload is externally requested
        if (this.props.abortUpload && !prevProps.abortUpload && !this.state.abort) {
            this.handleCancel();
        }
        if (this.state.doChildUpload && this.state.doChildUpload !== prevState.doChildUpload) {
            this.upload();
        }
    }

    componentDidMount() {
        this.upload();
    }

    /**
     * 1.Add entry
     * 2.Add uploadToken
     * 3.Attach media with token
     * 4.Upload token with media
     */
    upload() {
        const { mediaType, entryName, conversionProfileId, onUploadStarted, client } = this.props;
        const { doChildUpload } = this.state;

        if (!client) {
            this.throwError(new Error("Cannot connect to Kaltura server"));
            return;
        }

        const requests: KalturaMultiRequest = new KalturaMultiRequest();

        const entry = new KalturaMediaEntry();
        entry.name = entryName;
        entry.mediaType = mediaType;
        entry.adminTags = "expressrecorder";
        entry.parentEntryId = doChildUpload ? this.entryId : "";

        // 1.Add entry
        requests.requests.push(
            new MediaAddAction({
                entry: entry
            })
        );

        // 2.Add uploadToken
        requests.requests.push(new UploadTokenAddAction());

        const resource = new KalturaUploadedFileTokenResource({
            token: ""
        }).setDependency(["token", 1, "id"]);
        // 3.Attach media with token
        requests.requests.push(
            new BaseEntryUpdateContentAction({
                entryId: "",
                resource: resource,
                conversionProfileId: conversionProfileId
            }).setDependency(["entryId", 0, "id"])
        );

        client
            .multiRequest(requests)
            .then(
                (data: KalturaMultiResponse | null) => {
                    if (!data || data.hasErrors()) {
                        this.throwError(
                            new Error(
                                "Failed to create media entry: " + (data && data.getFirstError())
                            )
                        );
                    } else {
                        // 4.Upload token with media
                        if (doChildUpload) {
                            this.childEntryId = data[0].result.id;
                        } else {
                            this.entryId = data[0].result.id;
                        }
                        if (onUploadStarted && !doChildUpload) {
                            onUploadStarted(this.entryId);
                        }
                        if (this.state.abort) {
                            this.handleCancel();
                        }
                        this.addMedia(data[1].result.id);
                    }
                },
                (err: Error) => {
                    this.throwError(
                        new Error("Failed to create media entry - reject request: " + err.message)
                    );
                }
            )
            .catch((err: Error) => {
                this.throwError(
                    new Error("Failed to create media entry - multirequest failed: " + err.message)
                );
            });
    }

    /**
     * Upload media file with given tokenId. Use chunks if needed (file above 5MB)
     */
    addMedia(tokenId: string) {
        const {
            client,
            onUploadEnded,
            onUploadProgress,
            recordedBlobs,
            childRecordedBlobs
        } = this.props;
        const { doChildUpload } = this.state;
        if (!client) {
            this.throwError(new Error("Missing client object"));
            return;
        }
        if (this.state.abort) {
            return;
        }

        const blob = new Blob(doChildUpload ? childRecordedBlobs : recordedBlobs, {
            type: "video/webm"
        });
        const file = new File([blob], "name.webm");
        // keep request so it can be canceled
        const addMediaRequest = new UploadTokenUploadAction({
            uploadTokenId: tokenId,
            fileData: file
        });

        this.cancellableUploadAction = client.request(
            addMediaRequest.setProgress((loaded: number, total: number) => {
                if (!this.state.abort) {
                    this.setState({ loaded: loaded, total: total }); // loaded bytes until now
                    if (onUploadProgress) {
                        onUploadProgress(loaded, total);
                    }
                }
            })
        );
        this.cancellableUploadAction.then(
            data => {
                if (childRecordedBlobs && !doChildUpload) {
                    this.setState({ doChildUpload: true, loaded: 0, total: 0 });
                    return;
                }
                if (onUploadEnded) {
                    this.setState({ uploadDone: true });
                    onUploadEnded(this.entryId);
                }
            },
            (e: Error) => {
                this.throwError(e);
            }
        );
    }

    handleCancel = () => {
        const { client, onUploadCancelled } = this.props;

        if (!client) {
            this.throwError(new Error("Missing client object"));
            return;
        }

        this.setState({ abort: true });

        // Cancel request if not finished yet
        if (this.cancellableUploadAction) {
            this.cancellableUploadAction.cancel();
        }

        // Delete created entry if exists
        this.deleteEntry();
        if (onUploadCancelled) {
            onUploadCancelled();
        }
    };

    deleteEntry = () => {
        const { client } = this.props;
        if (client) {
            const requests: KalturaMultiRequest = new KalturaMultiRequest();

            if (this.entryId) {
                requests.requests.push(
                    new BaseEntryDeleteAction({
                        entryId: this.entryId
                    })
                );
            }
            if (this.childEntryId) {
                requests.requests.push(
                    new BaseEntryDeleteAction({
                        entryId: this.childEntryId
                    })
                );
            }

            client
                .multiRequest(requests)
                .then(
                    (data: KalturaMultiResponse | null) => null,
                    (err: Error) => {
                        this.throwError(
                            new Error(
                                "Failed to delete media entry - reject request: " + err.message
                            )
                        );
                    }
                )
                .catch((err: Error) => {
                    this.throwError(
                        new Error(
                            "Failed to delete media entry - multirequest failed: " + err.message
                        )
                    );
                });
        }
    };

    throwError(error: Error) {
        if (this.props.onError) {
            this.props.onError(`${error.name} : ${error.message}`);
        }
    }

    render() {
        const { showUploadUI, onCancel, childRecordedBlobs } = this.props;
        const { loaded, total, abort, doChildUpload, uploadDone } = this.state;
        let text = "";
        if (childRecordedBlobs && childRecordedBlobs.length) {
            text = !doChildUpload ? "1/2" : "2/2";
        }

        if (showUploadUI) {
            return (
                <UploadUI
                    loaded={loaded}
                    total={total}
                    abort={abort}
                    uploadDone={uploadDone}
                    onCancel={onCancel}
                    additionalText={text}
                />
            );
        }
        return <div />;
    }
}
