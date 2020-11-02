# Express-recorder
Web recorder based on <a href="https://webrtc.org/">WebRTC</a> and former project - <a href="https://github.com/kaltura/webrtc-krecord">webrtc-krecord</a>.<br />
Supported browsers: Chrome, Firfox, Opera.

## Dev install
1. git clone
2. npm install

## Run the project
clone index.template.ejs into index.ejs (Same dir) and fill in the needed properties.

execute - "npm run serve"

## Run with storybook
1. fill props in expressRecorder.stories.jsx </br>
2. yarn run storybook

## Create build release
1. update the package.json file with the new version
2. npm run build
3. copy files located under 'dist' folder to your project, or use the zip file with the version name.
4. attach the zip created (on the root of the project) to the release notes.

## Embedding into html page
`const component = Kaltura.ExpressRecorder.create('parent_div_id', {
       list of props for expressRecorder components in form of 'prop': 'value'
   });`

## deployment to Kaltura server
1. unzip `v<version number>.zip` (attached to version release notes) to `Kaltura-server/apps/expressrecorder/v<version number>`

## API
#### ExpressRecorder props:
<table>
    <tr>
        <th>name</th>
        <th>description</th> 
        <th>type</th>
        <th>required</th>
        <th>default</th>
    </tr>
    <tr>
        <td>ks</td>
        <td>kaltura session key</td> 
        <td>string</td>
        <td>yes</td>
        <td>---</td>
    </tr>
    <tr>
        <td>serviceUrl</td>
        <td>kaltura service url</td> 
        <td>string</td>
        <td>yes</td>
        <td>---</td>
    </tr>
    <tr>
        <td>app</td>
        <td>client tag</td> 
        <td>string</td>
        <td>yes</td>
        <td>---</td>
    </tr>
    <tr>
        <td>playerUrl</td>
        <td>kaltura player service url</td> 
        <td>string</td>
        <td>yes</td>
        <td>---</td>
    </tr>
    <tr>
        <td>partnerId</td>
        <td>kaltura partner id</td> 
        <td>number</td>
        <td>yes</td>
        <td>---</td>
    </tr>
    <tr>
        <td>uiConfId</td>
        <td>kaltura player id (player v3 required)</td> 
        <td>number</td>
        <td>yes</td>
        <td>---</td>
    </tr>
    <tr>
        <td>conversionProfileId</td>
        <td>the conversion profile id to be used on the created entry</td> 
        <td>number</td>
        <td>no</td>
        <td>1</td>
    </tr>
    <tr>
        <td>entryName</td>
        <td>name for the created entry</td> 
        <td>string</td>
        <td>no</td>
        <td>Video/Audio Recording - [date]</td>
    </tr>
    <tr>
        <td>allowVideo</td>
        <td>allow video streaming</td> 
        <td>boolean</td>
        <td>no</td>
        <td>true</td>
    </tr>
    <tr>
        <td>allowAudio</td>
        <td>allow audio streaming</td> 
        <td>boolean</td>
        <td>no</td>
        <td>true</td>
    </tr>
    <tr>
        <td>maxRecordingTime</td>
        <td>maximum time for recording in seconds</td> 
        <td>number</td>
        <td>no</td>
        <td>unlimited</td>
    </tr>
    <tr>
        <td>showUploadUI</td>
        <td>show upload progress and cancel button during upload</td> 
        <td>boolean</td>
        <td>no</td>
        <td>true</td>
    </tr>
</table>


#### Events:
##### Event Types:
* error: fired when errors occur. <code>event.detail.message holds error text</code> 
* recordingStarted: fired when countdown to recording starts
* recordingEnded: fired when recording ends
* recordingCancelled: fired after a recording is cancelled
* mediaUploadStarted: fires after entry has been created and media upload start. Returns entryId by event.detail.entryId
* mediaUploadProgress: describes upload progress. <code>event.detail.loaded</code> holds the amount of bytes loaded, <code>event.detail.total</code> holds the total amount of bytes to be loaded.  
* mediaUploadEnded: fires after media upload has been ended. Returns entryId by event.detail.entryId
* mediaUploadCancelled: fires when media upload has been canceled by the user. Returns entryId by event.detail.entryId

##### Listening to Events
`
const component = Kaltura.ExpressRecorder.create('parent_div_id', {...});
component.instance.addEventListener(eventType, callback);
`

#### Methods:
* <code>startRecording()</code>
clears existing recording if exists and starts the recording countdown.
* <code>stopRecording()</code>
stops an ongoing recording.
* <code>saveCopy()</code>
after recording exists, saves a local copy of the recorded media.
* <code>upload()</code>
uploads the latest recording to Kaltura.
* <code>cancelUpload()</code>
cancels an ongoing upload.
* <code>addEventListener(type: string, listener: (event: ExpressRecorderEvent) => void)</code>
allows listening to recorder events.
* <code>removeEventListener(type: string, callback: (event: ExpressRecorderEvent) => void)</code>
stops listening to recorder events.

# How you can help (guidelines for contributors) 
Thank you for helping Kaltura grow! If you'd like to contribute please follow these steps:
* Use the repository issues tracker to report bugs or feature requests
* Read [Contributing Code to the Kaltura Platform](https://github.com/kaltura/platform-install-packages/blob/master/doc/Contributing-to-the-Kaltura-Platform.md)
* Sign the [Kaltura Contributor License Agreement](https://agentcontribs.kaltura.org/)

# Where to get help
* Join the [Kaltura Community Forums](https://forum.kaltura.org/) to ask questions or start discussions
* Read the [Code of conduct](https://forum.kaltura.org/faq) and be patient and respectful

# Get in touch
You can learn more about Kaltura and start a free trial at: http://corp.kaltura.com    
Contact us via Twitter [@Kaltura](https://twitter.com/Kaltura) or email: community@kaltura.com  
We'd love to hear from you!

# License and Copyright Information
All code in this project is released under the [AGPLv3 license](http://www.gnu.org/licenses/agpl-3.0.html) unless a different license for a particular library is specified in the applicable library path.   

Copyright © Kaltura Inc. All rights reserved.   
Authors and contributors: See [GitHub contributors list](https://github.com/kaltura/YOURREPONAME/graphs/contributors).  

### Open Source Libraries
Review the [list of Open Source 3rd party libraries](https://github.com/kaltura/express-recorder/network/dependencies) used in this project.
