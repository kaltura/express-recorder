# Express-recorder
Web recorder based on <a href="https://webrtc.org/">WebRTC</a> and former project - <a href="https://github.com/kaltura/webrtc-krecord">webrtc-krecord</a>.<br />
Supported browsers: Chrome, Firfox, Opera.

## Dev install
1. git clone
2. npm install

## Run the project
npm start

## Run with storybook
1. fill props in expressRecorder.stories.jsx </br>
2. yarn run storybook

## Create build release
1. npm run build
2. copy files located under build folder to your project.

## Embedding into html page
`<script type="text/props">{
    [list of props for expressRecorder components in form of 'prop': 'value']
}</script><script async src="path-to-bundle.js"></script>`

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
        <td>kaltura player id</td> 
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
</table>

#### Events:
* mediaUploadStarted: fires after entry has been created and media upload start. Returns entryId by event.detail.entryId
* mediaUploadEnded: fires after media upload has been ended. Returns entryId by event.detail.entryId
* mediaUploadCanceled: fires when media upload has been canceled by the user. Returns entryId by event.detail.entryId
