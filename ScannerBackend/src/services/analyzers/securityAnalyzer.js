function analyzeSecurity(rawData) {
  const csp = rawData.headers["content-security-policy"] || null;
  const xFrame = rawData.headers["x-frame-options"] || null;
  const hsts = rawData.headers["strict-transport-security"] || null;
  const contentTypeOptions = rawData.headers["x-content-type-options"] || null;
  const referrerPolicy = rawData.headers["referrer-policy"] || null;
  const permissionsPolicy = rawData.headers["permissions-policy"] || null;
  const usesHttps = rawData.finalUrl.startsWith("https://");
  const pageOrigin = new URL(rawData.finalUrl).origin;
  const insecureForms = rawData.forms.filter((form) => {
    if (!form.action) {
      return !usesHttps;
    }

    return form.action.startsWith("http://");
  });
  const mixedContentAssets = [
    ...rawData.images.map((asset) => asset.src),
    ...rawData.scripts.map((asset) => asset.src),
    ...rawData.stylesheets.map((asset) => asset.href),
    ...rawData.iframes.map((asset) => asset.src),
  ].filter((assetUrl) => usesHttps && assetUrl?.startsWith("http://"));
  const inlineScripts = rawData.scripts.filter((script) => !script.src && script.content);
  const externalScripts = rawData.scripts.filter((script) => script.src);
  const thirdPartyScripts = externalScripts.filter((script) => {
    try {
      return new URL(script.src).origin !== pageOrigin;
    } catch {
      return false;
    }
  });
  const suspiciousScriptSources = thirdPartyScripts.filter((script) =>
    /(^|\.)free|track|pixel|ads|analytics|doubleclick|bit\.ly|tinyurl/i.test(script.src)
  );

  return {
    usesHttps,
    csp,
    hasCsp: Boolean(csp),
    xFrame,
    hasXFrameOptions: Boolean(xFrame),
    hsts,
    hasHsts: Boolean(hsts),
    contentTypeOptions,
    hasContentTypeOptions: Boolean(contentTypeOptions),
    referrerPolicy,
    hasReferrerPolicy: Boolean(referrerPolicy),
    permissionsPolicy,
    hasPermissionsPolicy: Boolean(permissionsPolicy),
    missingSecurityHeaders: {
      csp: !csp,
      xFrameOptions: !xFrame,
      hsts: usesHttps && !hsts,
      xContentTypeOptions: !contentTypeOptions,
      referrerPolicy: !referrerPolicy,
      permissionsPolicy: !permissionsPolicy,
    },
    insecureFormCount: insecureForms.length,
    insecureForms,
    iframeCount: rawData.iframes.length,
    iframes: rawData.iframes,
    mixedContentCount: mixedContentAssets.length,
    mixedContentAssets,
    inlineScriptCount: inlineScripts.length,
    externalScriptCount: externalScripts.length,
    thirdPartyScriptCount: thirdPartyScripts.length,
    thirdPartyScripts: thirdPartyScripts.map((script) => script.src),
    suspiciousScriptCount: suspiciousScriptSources.length,
    suspiciousScriptSources: suspiciousScriptSources.map((script) => script.src),
  };
}

module.exports = {
  analyzeSecurity,
};
