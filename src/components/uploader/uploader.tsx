import { h } from "preact";
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

export class Uploader {
    client: KalturaClient | undefined;
    entryId: string | undefined;
    onError: ((e: Error) => void) | undefined;
    serviceUrl: string | undefined;
    ks: string | undefined;
    onEnd: ((entryId: string) => void) = (entryId: string) => {
        return;
    };
    onProgress: (percent: number) => void = (percent: number) => {
        return;
    };

    upload(
        client: KalturaClient,
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        onEnd: (entryId: string) => void,
        onError: (e: Error) => void,
        onProgress: (percent: number) => void,
        serviceUrl: string,
        ks: string,
        conversionProfileId?: number
    ) {
        this.client = client;
        this.onError = onError ? onError : undefined;
        this.serviceUrl = serviceUrl;
        this.ks = ks;
        this.onEnd = onEnd;
        this.onProgress = onProgress;

        this.handleOnProgress = this.handleOnProgress.bind(this);

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
     * @param {(entryId: number) => void} onEnd
     * @param {number} conversionProfileId
     */
    createEntry(
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        conversionProfileId?: number
    ) {
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

        if (!this.client) {
            this.throwError(new Error("Missing client object"));
            return;
        }

        this.client
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
                        this.addMedia(
                            recordedBlobs,
                            data[1].result.id,
                            entryName
                        );
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

    addMedia(recordedBlobs: Blob[], tokenId: string, entryName: string) {
        const oReq = new XMLHttpRequest();
        const aaa = recordedBlobs.concat(
            recordedBlobs,
            recordedBlobs,
            recordedBlobs,
            recordedBlobs,
            recordedBlobs,
            recordedBlobs,
            recordedBlobs
        );
        const blob = new Blob(aaa, { type: "video/webm" });

        const formData = new FormData();
        formData.append("ks", this.ks!);
        formData.append("fileData", blob as File);
        formData.append("uploadTokenId", tokenId);
        formData.append("resume", "false");
        formData.append("resumeAt", "0");
        formData.append("finalChunk", "true");

        const requestUrl =
            this.serviceUrl +
            "/api_v3/?service=uploadToken&action=upload&format=1";
        oReq.onloadend = this.handleOnEnd;
        oReq.upload.onprogress = this.handleOnProgress;
        oReq.open("POST", requestUrl, true);
        oReq.send(formData);
    }

    handleOnProgress = (event: ProgressEvent) => {
        const loadedPercent = (event.loaded * 100) / event.total;
        const loaded = this.bytesToSize(event.loaded);
        const total = this.bytesToSize(event.total);
        this.onProgress(loadedPercent);
    };

    handleOnEnd = () => {
        this.onEnd(this.entryId!);
    };

    bytesToSize = (bytes: number) => {
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        if (bytes === 0) {
            return "0 Bytes";
        }
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i === 0) {
            return bytes + " " + sizes[i];
        }
        return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
    };

    throwError(error: Error) {
        if (this.onError) {
            this.onError(error);
        }
    }
}
