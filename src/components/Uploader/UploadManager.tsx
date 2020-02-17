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
};

type State = {
    loaded: number;
    abort: boolean;
};

/**
 * handle upload of recorded media
 */
export class UploadManager extends Component<Props, State> {
    static defaultProps = {
        abortUpload: false
    };

    entryId: string;
    totalSize: number;
    tokenId: string;
    cancellableUploadAction: CancelableAction<KalturaUploadToken> | undefined;

    constructor(props: Props) {
        super(props);

        this.entryId = "";
        this.totalSize = new Blob(props.recordedBlobs, {
            type: "video/webm"
        }).size;
        this.tokenId = "";

        this.state = {
            loaded: 0,
            abort: false
        };
        this.addMedia = this.addMedia.bind(this);
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        // if abort upload is externally requested
        if (this.props.abortUpload && !prevProps.abortUpload && !this.state.abort) {
            this.handleCancel();
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

        if (!client) {
            this.throwError(new Error("Cannot connect to Kaltura server"));
            return;
        }

        const requests: KalturaMultiRequest = new KalturaMultiRequest();

        const entry = new KalturaMediaEntry();
        entry.name = entryName;
        entry.mediaType = mediaType;
        entry.adminTags = "expressrecorder";

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
                        this.entryId = data[0].result.id;
                        this.tokenId = data[1].result.id;
                        if (onUploadStarted) {
                            onUploadStarted(this.entryId);
                        }
                        if (this.state.abort) {
                            this.handleCancel();
                        }
                        this.addMedia(this.tokenId);
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
     * Upload media file with given tokenId. Uses chunks if needed (file above 5MB)
     */
    addMedia(tokenId: string) {
        const { client, onUploadEnded, onUploadProgress } = this.props;
        if (!client) {
            this.throwError(new Error("Missing client object"));
            return;
        }
        if (this.state.abort) {
            return;
        }

        const blob = new Blob(this.props.recordedBlobs, { type: "video/webm" });
        const file = new File([blob], "name.webm");
        // keep request so it can be canceled
        const addMediaRequest = new UploadTokenUploadAction({
            uploadTokenId: tokenId,
            fileData: file
        });

        this.cancellableUploadAction = client.request(
            addMediaRequest.setProgress((loaded: number, total: number) => {
                if (!this.state.abort) {
                    this.setState({ loaded: loaded }); // loaded bytes until now
                    if (onUploadProgress) {
                        onUploadProgress(loaded, total);
                    }
                }
            })
        );
        this.cancellableUploadAction.then(
            data => {
                if (onUploadEnded) {
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
            if (this.entryId) {
                const request = new BaseEntryDeleteAction({
                    entryId: this.entryId
                });
                client.request(request).catch((e: Error) => {
                    this.throwError(e);
                });
            }
        }
    };

    throwError(error: Error) {
        if (this.props.onError) {
            this.props.onError(`${error.name} : ${error.message}`);
        }
    }

    render() {
        return <div />;
    }
}
