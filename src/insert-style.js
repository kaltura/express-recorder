module.exports = function(styleElement) {
    if (window.kalturaGlobalConfig && typeof window.kalturaGlobalConfig.stylesNonce === "string") {
        styleElement.setAttribute("nonce", window.kalturaGlobalConfig.stylesNonce);
    }

    document.head.appendChild(styleElement);
};
