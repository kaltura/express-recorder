import { h } from "preact";
import {
    BaseEntryUpdateContentAction,
    KalturaMediaEntry,
    KalturaMediaType,
    KalturaUploadedFileTokenResource,
    KalturaUploadToken,
    MediaAddAction,
    UploadTokenAddAction,
    UploadTokenUploadAction
} from "kaltura-typescript-client/api/types";
import {
    KalturaClient,
    KalturaMultiRequest,
    KalturaMultiResponse
} from "kaltura-typescript-client";

export class Uploader {
    client: KalturaClient | undefined;
    entryId: string | undefined;

    upload(
        client: KalturaClient,
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        callback: (entryId: string) => void
    ) {
        this.client = client;
        this.createEntry(mediaType, recordedBlobs, entryName, callback);
    }

    /**
     * 1.Add entry 2.Add uploadToken 3.Attach media with token 4.Upload token with media
     * @param {KalturaMediaType} mediaType
     * @param {Blob[]} recordedBlobs
     * @param {string} entryName
     * @param {(entryId: number) => void} callback
     */
    createEntry(
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string,
        callback: (entryId: string) => void
    ) {
        const requests: KalturaMultiRequest = new KalturaMultiRequest();

        const entry = new KalturaMediaEntry();
        entry.name = entryName;
        entry.mediaType = mediaType;
        entry.adminTags = "expressrecorder";
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
                resource: resource
            }).setDependency(["entryId", 0, "id"])
        );

        this.client!
            .multiRequest(requests)
            .then(
                (data: KalturaMultiResponse | null) => {
                    if (!data || data.hasErrors()) {
                        console.log(
                            "Failed to create media entry: " +
                            + (data || data!.getFirstError())
                        );
                    } else {
                        this.entryId = data[0].result.id;
                        this.addMedia(
                            recordedBlobs,
                            data![1].result.id,
                            entryName,
                            callback
                        );
                    }
                },
                (err: Error) => {
                    console.log("Failed to create media entry: " + err);
                }
            )
            .catch((err: Error) => {
                console.log("Failed to create media entry: " + err);
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

        this.client!.request(request).then(
            (data: KalturaUploadToken | null) => {
                if (data) {
                    callback(this.entryId!);
                }
            },
            (err: Error) => {
                console.log("failed to upload media: " + err);
            }
        );
    }
}
