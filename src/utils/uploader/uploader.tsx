import { h } from "preact";
import {
    BaseEntryUpdateContentAction,
    KalturaMediaEntry,
    KalturaMediaType,
    KalturaUploadedFileTokenResource,
    MediaAddAction,
    UploadTokenAddAction,
    UploadTokenUploadAction
} from "kaltura-typescript-client/api/types";
import { KalturaClient, KalturaMultiRequest } from "kaltura-typescript-client";

export class Uploader {
    client: KalturaClient = new KalturaClient();

    upload(
        client: KalturaClient,
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string
    ) {
        this.client = client;
        this.createEntry(mediaType, recordedBlobs, entryName);
    }

    /**
     * 1.Add entry 2.Add uploadToken 3.Attach media with token 4.Upload token with media
     * @param {KalturaMediaType} mediaType
     * @param {Blob[]} recordedBlobs
     * @param {string} entryName
     */
    createEntry(
        mediaType: KalturaMediaType,
        recordedBlobs: Blob[],
        entryName: string
    ) {

        let requests: KalturaMultiRequest = new KalturaMultiRequest();

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

        this.client
            .multiRequest(requests)
            .then(
                (data: any) => {
                    if (!data!.hasErrors()) {
                        console.log(
                            "Media entry has been created successfully"
                        );
                        this.addMedia(recordedBlobs, data![1].result.id, entryName);
                    } else {
                        console.log(
                            "Failed to create media entry: " +
                                +data!.hasErrors()
                        );
                    }
                },
                (err: any) => {
                    console.log("Failed to create media entry: " + err);
                }
            )
            .catch((err: any) => {
                console.log("Failed to create media entry: " + err);
            });
    }

    addMedia(recordedBlobs: Blob[], tokenId: string, entryName: string) {
        const file = new File(recordedBlobs, entryName + '.mp4');
        const request = new UploadTokenUploadAction({
            uploadTokenId: tokenId,
            fileData: file,
            resume: false,
            resumeAt: undefined,
            finalChunk: true
        });

        this.client.request(request).then(
            (data: any) => {
                if (data) {
                    console.log("done upload media");
                }
            },
            (err: any) => {
                console.log("failed to upload media: " + err);
            }
        );
    }
}
