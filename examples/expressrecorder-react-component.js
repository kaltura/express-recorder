import React, { Component} from 'react';
let counter = 0;

/**
 * This component depends on having Kaltura's Express Recorder JS on the page.
 * You should include the JS lib in your index.html header, for example:
 * <script src="https://www.kaltura.com/apps/expressrecorder/latest/express-recorder.js"></script>
 * 
 * Mandatory props:
 * ks - a valid KS (KalturaSessionType.USER) to be used by the recorder to create the video entry in Kaltura
 *       NOTE that the KS should have 'editadmintags:*' as privilege otherwise express recorder will not be able to create the entry
 * partnerId - your Kaltura account ID (aka partner ID)
 * uiconfId - ID of a Kaltura player (v7) to be used for preview
 * 
 * Optional props:
 * serviceUrl - pass if your Kaltura API server is not on www.kaltura.com
 * playerUrl - pass if you want to load the player not via Kaltura CDN (needed for on-prem/CE deployments)
 * conversionProfileId - pass if you want the recordings to use specific transcoding profile
 * maxRecordingTime - pass if you want to cap the time the user can record a single video
 * 
 * The props implemented here are just an example. You can choose to expose additional props or replace some of these with hardcoded values - all depending on your needs.
 * 
 */
class  ExpressRecorder extends Component {
    elementId = '';
    component = null;
    constructor(props) {
        super(props);
        counter++;
        // element ID is dynamic using an external counter, so that it is possible to place multiple instances on one page
        this.elementId = "recorder" +counter;
    }

    _handleUploadProgress = () => {
        console.log("uploadProgress handler called - replace this with your logic");
    }

    _uploadCancelHandler = () => {
        console.log("uploadCancel handler called - replace this with your logic");
    }

    _uploadDoneHandler = () => {
        console.log("uploadDone handler called - replace this with your logic");
    }

    _uploadStartHandler = () => {
        console.log("uploadStart handler called - replace this with your logic");
    }

    _handleRecordingEnded = () => {
        console.log("recordingEnded handler called - replace this with your logic");
    }

    _createComponent = () => {
        if(!window.Kaltura || !window.Kaltura.ExpressRecorder) {
            console.warn("Kaltura Express Recorder not loaded to page");
            return;
        }
        this.component = window.Kaltura.ExpressRecorder.create(this.elementId,
        {
            // the following options are basic. Learn about more options that are supported here - https://github.com/kaltura/express-recorder/blob/master/README.md
            "ks": this.props.ks,
            "partnerId": this.props.partnerId,
            "uiConfId": this.props.uiconfId,

            "serviceUrl": (this.props.serviceUrl? this.props.serviceUrl: 'https://www.kaltura.com'),
            "playerUrl": (this.props.playerUrl? this.props.playerUrl: 'https://cdnapisec.kaltura.com'),
            "conversionProfileId": (this.props.conversionProfileId? this.props.conversionProfileId: null),
            "maxRecordingTime": (this.props.maxRecordingTime? this.props.maxRecordingTime: null),

            "app": "myAppName",
            "showUploadUI":  true
        });

        // There are more events that are sent from the library. see full list here - https://github.com/kaltura/express-recorder/blob/master/README.md
        this.component.instance.addEventListener("mediaUploadProgress", this._handleUploadProgress);
        this.component.instance.addEventListener("mediaUploadCancelled", this._uploadCancelHandler);
        this.component.instance.addEventListener("mediaUploadEnded", this._uploadDoneHandler);
        this.component.instance.addEventListener("mediaUploadStarted", this._uploadStartHandler);
        this.component.instance.addEventListener("recordingEnded", this._handleRecordingEnded);
    }

    _destroyComponent = () => {
        if(this.component) {
            if(this.component.instance) {
                this.component.instance.removeEventListener("mediaUploadProgress");
                this.component.instance.removeEventListener("mediaUploadCancelled");
                this.component.instance.removeEventListener("mediaUploadEnded");
                this.component.instance.removeEventListener("mediaUploadStarted");
                this.component.instance.removeEventListener("recordingEnded");
            }
            this.component.destroy();
            this.component = null;
        }
    }
    componentDidMount() {
        this._createComponent(); 
    }

    componentDidUpdate() {
        this._destroyComponent();
        this._createComponent();
    }

    componentWillUnmount() {
        this._destroyComponent();
    }

    render() {
        { /* styling example in the element - replace with your styling using the same method or other (cssmodules?) */}
        return (
            <div style={{width: '560px', height: '316px'}} id={this.elementId}>
            </div>
        )
    }

}

export default ExpressRecorder
