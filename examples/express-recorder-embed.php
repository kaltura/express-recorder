<?php
//This PHP part of the code goes on your backend - never include API secret keys in front end code
$partnerId = REPLACEME; //https://kmc.kaltura.com/index.php/kmcng/settings/integrationSettings
$apiAdminSecret = 'REPLACEME'; //https://kmc.kaltura.com/index.php/kmcng/settings/integrationSettings (Admin Secret)
$expire=60*60*24; //one day
$uniqueUserId = 'someUniqueUserId'; //Make sure this is set to your real user IDs so that Analytics and Entitlements will really be tracked according to your business needs
$uiconfId = REPLACEME; //https://kmc.kaltura.com/index.php/kmcng/studio/v3
$appName = 'expressrecorder'; //used to designate your application name, this can be used in the Analytics later to differentiate usage across different apps (such as website vs. mobile iOS vs. mobile Android vs. partner site)
$appDomain = 'my.appdomain.com'; // the domain to track this playback session to
//generate the Kaltura Session for secure and tracked playback session
$privacyContext = null; //'YourCategoryName'; //if your entries are inside a category with a defined privacyContext, this must be specified too
$sessionType = 0; // 0 for USER Session, 2 for Admin Session
$sessionStartRESTAPIUrl = 'https://cdnapisec.kaltura.com/api_v3/service/session/action/start/format/1/secret/'.$apiAdminSecret.'/partnerId/'.$partnerId.'/type/'.$sessionType.'/expiry/'.$expire.'/userId/'.$uniqueUserId.'/privileges/editadmintags:*,appid:'.$appName.'-'.$appDomain.($privacyContext != null ? ',privacycontext:'.$privacyContext : '');
$ks = file_get_contents($sessionStartRESTAPIUrl);
?>
<!DOCTYPE html>
<html>
<head>
	
</head>
<body>

	<div>
		<h1>Record Yourself Demo!</h1>
	</div>
	<div>
		<p>Just hit record, say hello, and watch the recording before you upload.</p>
		<div id="rec">
			<script type="text/props">
				{                 
					"ks": <?php echo $ks; ?>,
			        "serviceUrl": "https://cdnapisec.kaltura.com",
			        "app": "<?php echo $appName; ?>",
			        "playerUrl": "https://cdnapisec.kaltura.com",
			        "partnerId": "<?php echo $partnerId; ?>",
			        "uiConfId":  "<?php echo $uiconfId; ?>",
			        "entryName": "custom entry name"
			    }
			</script>
			<script async src="https://www.kaltura.com/apps/expressrecorder/v1.0.20/bundle.js"></script>
		</div>
	</div>
	<script type="text/javascript">
		window.addEventListener("mediaUploadStarted", function(e) {
			console.log(e.detail);
		});
		window.addEventListener("mediaUploadEnded", function(e) {
			console.log(e.detail);
		});
		window.addEventListener("mediaUploadCanceled", function(e) {
			console.log(e.detail);
		});
	</script>

</body>

</html>
