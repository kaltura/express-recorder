<?php

$config = parse_ini_file('./embed-config.ini');

if ($config === false) {
  echo "Missing or invalid config file. Please copy `embed-config.ini.dist` to `embed-config.ini` and try again.";
  die;
}

$serviceUrl = $config['SERVICE_URL'] ?? 'https://www.kaltura.com';
$partnerId = $config['PARTNER_ID'] ?? 1000;
$adminSecret = $config['ADMIN_SECRET'] ?? '';
$expiry = $config['KS_EXPIRY'] ?? 60 * 60 * 24;
$userId = $config['USER_ID'] ?? '';
$uiConfId = $config['UI_CONF_ID'] ?? '';
$appName = $config['APP_NAME'] ?? '';
$appDomain = $config['APP_DOMAIN'] ?? '';
$privacyContext = $config['PRIVACY_CONTEXT'] ?? '';
$sessionType = $config['SESSION_TYPE'] ?? 0;

$sessionStartUrl = "$serviceUrl/api_v3/service/session/action/start/format/1/secret/$adminSecret/partnerId/$partnerId/type/$sessionType/expiry/$expiry/userId/$userId";

$privileges = [
  'editadmintags:*',
  "appid:$appName-$appDomain",
];

if ($privacyContext) {
  $privileges[] = "privacycontext:$privacyContext";
}

$privileges = implode(',', $privileges);
$sessionStartUrl .= "/privileges/$privileges";

$ks = file_get_contents($sessionStartUrl);
?>
<!DOCTYPE html>
<html>

<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'nonce-random' <?php echo $serviceUrl; ?> https://fonts.googleapis.com/css2 https://fonts.gstatic.com data:">
  <meta http-equiv="csp-nonce" content="random">
  <script nonce="random">
    globalThis.kalturaGlobalConfig ||= {};
    globalThis.kalturaGlobalConfig.scriptsNonce = 'random';
    globalThis.kalturaGlobalConfig.stylesNonce = 'random';
  </script>
</head>

<body>
  <div>
    <h1>Record Yourself Demo!</h1>
  </div>
  <div>
    <p>Just hit record, say hello, and watch the recording before you upload.</p>
    <div id="rec">
    </div>
    <script src="../dist/express-recorder.js" nonce="random"></script>
    <script nonce="random">
      Kaltura.ExpressRecorder.create('rec', {
        "ks": <?php echo $ks; ?>,
        "serviceUrl": "<?php echo $serviceUrl; ?>",
        "app": "<?php echo $appName; ?>",
        "playerUrl": "<?php echo $serviceUrl; ?>",
        "partnerId": "<?php echo $partnerId; ?>",
        "uiConfId": "<?php echo $uiConfId; ?>",
        "entryName": "custom entry name",
        "scriptNonce": "random",
      });
    </script>
  </div>
  <script type="text/javascript" nonce="random">
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