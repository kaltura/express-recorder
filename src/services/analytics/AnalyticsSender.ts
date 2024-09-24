import { ButtonClickAnalyticsEventType } from "./ButtonClickAnalyticsEventType";
import { version } from "../../version";

export type AnalyticsEventBaseArgs = {
    partnerId: number;

    /**
     * ks with encrypted user id
     */
    ks?: string;

    /**
     * host app session id
     */
    sessionId?: string;

    /**
     * if host app is a virtual event, this is the event id
     */
    virtualEventId?: string;
};

export default class AnalyticsSender {
    config: AnalyticsEventBaseArgs;

    /**
     * analytics server endpoint, ie, https://analytics.kaltura.com
     */
    serviceUrl: string;

    constructor(serviceUrl: string, config: AnalyticsEventBaseArgs) {
        this.serviceUrl = serviceUrl;
        this.config = config;
    }

    sendAnalytics(buttonName: string, buttonType: ButtonClickAnalyticsEventType, value?: string) {
        // base url structure
        const url = this.serviceUrl + "/api_v3/index.php?";

        // gather event data:
        let eventData: Record<string, string> = {
            ...((this.config as unknown) as Record<string, string>), // there are numbers here
            service: "analytics",
            action: "trackEvent",
            eventType: "10002",
            kalturaApplication: "14", // => 'Express Capture' TODO if there is client enum
            kalturaApplicationVer: version,
            referrer: document.referrer,
            buttonType: buttonType.toString(),
            buttonName: buttonName
        };
        if (value) {
            eventData = {
                ...eventData,
                buttonValue: value
            };
        }
        const searchParams = new URLSearchParams(eventData).toString();

        // send to API
        navigator.sendBeacon(url + searchParams);
    }
}
