function getNormalizedHeaders(rawData) {
  const headers = rawData.finalHeaders || rawData.headers || {};

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
}

function findMetaCsp(rawData) {
  const metaTags = rawData.metaTags || [];
  const metaCsp = metaTags.find((meta) => {
    const httpEquiv = meta.httpEquiv || meta["http-equiv"];
    return httpEquiv?.toLowerCase() === "content-security-policy";
  });

  if (metaCsp?.content) {
    return metaCsp.content;
  }

  const html = rawData.html || "";
  const metaMatch = html.match(
    /<meta\b[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/i
  );

  if (!metaMatch) {
    return null;
  }

  const contentMatch = metaMatch[0].match(/\bcontent=["']([^"']+)["']/i);
  return contentMatch?.[1] || "";
}

function createHeaderSource(value, source = "http-header") {
  return {
    present: Boolean(value),
    source: value ? source : null,
  };
}

function analyzeSecurity(rawData) {
  const headers = getNormalizedHeaders(rawData);
  const httpCsp = headers["content-security-policy"] || null;
  const metaCsp = httpCsp ? null : findMetaCsp(rawData);
  const csp = httpCsp || metaCsp || null;
  const cspSource = httpCsp ? "http-header" : metaCsp ? "meta-tag" : null;
  const xFrame = headers["x-frame-options"] || null;
  const hsts = headers["strict-transport-security"] || null;
  const contentTypeOptions = headers["x-content-type-options"] || null;
  const referrerPolicy = headers["referrer-policy"] || null;
  const permissionsPolicy = headers["permissions-policy"] || null;
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
    cspHeaderSource: createHeaderSource(csp, cspSource),
    xFrame,
    hasXFrameOptions: Boolean(xFrame),
    xFrameHeaderSource: createHeaderSource(xFrame),
    hsts,
    hasHsts: Boolean(hsts),
    hstsHeaderSource: createHeaderSource(hsts),
    contentTypeOptions,
    hasContentTypeOptions: Boolean(contentTypeOptions),
    contentTypeOptionsHeaderSource: createHeaderSource(contentTypeOptions),
    referrerPolicy,
    hasReferrerPolicy: Boolean(referrerPolicy),
    referrerPolicyHeaderSource: createHeaderSource(referrerPolicy),
    permissionsPolicy,
    hasPermissionsPolicy: Boolean(permissionsPolicy),
    permissionsPolicyHeaderSource: createHeaderSource(permissionsPolicy),
    headerSource: {
      csp: createHeaderSource(csp, cspSource),
      hsts: createHeaderSource(hsts),
      xContentTypeOptions: createHeaderSource(contentTypeOptions),
      xFrameOptions: createHeaderSource(xFrame),
      referrerPolicy: createHeaderSource(referrerPolicy),
      permissionsPolicy: createHeaderSource(permissionsPolicy),
    },
    securityDebug: {
      headersSeen: rawData.securityDebug?.headersSeen || Object.keys(headers),
      documentResponseCount: rawData.securityDebug?.documentResponseCount || 0,
      responseUrls: rawData.securityDebug?.responseUrls || [],
    },
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
