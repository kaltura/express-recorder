import { h } from "preact";
import { BaseEntryUpdateContentAction } from 'kaltura-typescript-client/api/types/BaseEntryUpdateContentAction';
import { KalturaMediaEntry } from 'kaltura-typescript-client/api/types/KalturaMediaEntry';
import { KalturaMediaType } from 'kaltura-typescript-client/api/types/KalturaMediaType';
import { KalturaUploadedFileTokenResource } from 'kaltura-typescript-client/api/types/KalturaUploadedFileTokenResource';
import { KalturaUploadToken } from 'kaltura-typescript-client/api/types/KalturaUploadToken';
import { MediaAddAction } from 'kaltura-typescript-client/api/types/MediaAddAction';
import { UploadTokenAddAction } from 'kaltura-typescript-client/api/types/UploadTokenAddAction';
import { UploadTokenUploadAction } from 'kaltura-typescript-client/api/types/UploadTokenUploadAction';
import {
    KalturaClient,
    KalturaMultiRequest,
    KalturaMultiResponse
} from "kaltura-typescript-client";

export class Uploader {
    client: KalturaClient | undefined;
    entryId: string | undefined;
    onError: ((e: Error) => void) | undefined;

    upload(
        client: KalturaClient,
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        callback: (entryId: string) => void,
        onError: (e: Error) => void,
        conversionProfileId?: number
    ) {
        this.client = client;
        this.onError = onError ? onError : undefined;
        this.createEntry(mediaType, recordedBlobs, entryName, callback, conversionProfileId);
    }

    /**
     * 1.Add entry 2.Add uploadToken 3.Attach media with token 4.Upload token with media
     * @param {KalturaMediaType} mediaType
     * @param {Blob[]} recordedBlobs
     * @param {string} entryName
     * @param {(entryId: number) => void} callback
     * @param {number} conversionProfileId
     */
    createEntry(
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        callback: (entryId: string) => void,
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
                            entryName,
                            callback
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

    addMedia(
        recordedBlobs: Blob[],
        tokenId: string,
        entryName: string,
        callback: (entryId: string) => void
    ) {
        const file = new File(recordedBlobs, entryName);
        const request = new UploadTokenUploadAction({
            uploadTokenId: tokenId,
            fileData: file,
            resume: false,
            resumeAt: undefined,
            finalChunk: true
        });

        if (!this.client) {
            this.throwError(new Error("Missing client object"));
            return;
        }
        this.client.request(request).then(
            (data: KalturaUploadToken | null) => {
                if (data) {
                    if (!this.entryId) {
                        this.throwError(new Error("Failed to create entry"));
                        return;
                    }
                    callback(this.entryId);
                }
            },
            (err: Error) => {
                this.throwError(new Error("failed to upload media: " + err));
            }
        );
    }

    throwError(error: Error) {
        if (this.onError) {
            this.onError(error);
        }
    }
}
