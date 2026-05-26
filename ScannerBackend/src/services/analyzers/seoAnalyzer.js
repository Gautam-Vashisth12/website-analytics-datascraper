function findMetaContent(rawData, name) {
  const tag = rawData.metaTags.find(
    (meta) => meta.name && meta.name.toLowerCase() === name
  );

  return tag?.content || null;
}

function findMetaByProperty(rawData, property) {
  return rawData.metaTags.find(
    (meta) => meta.property && meta.property.toLowerCase() === property
  );
}

function analyzeSEO(rawData) {
  const description = findMetaContent(rawData, "description");
  const robots = findMetaContent(rawData, "robots");
  const imageCount = rawData.images.length;
  const imagesWithAlt = rawData.images.filter((image) => image.alt?.trim()).length;
  const missingAltCount = imageCount - imagesWithAlt;
  const imageAltCoverage =
    imageCount === 0 ? 100 : Math.round((imagesWithAlt / imageCount) * 100);
  const titleLength = rawData.title ? rawData.title.trim().length : 0;
  const descriptionLength = description ? description.trim().length : 0;
  const openGraphTags = rawData.metaTags.filter((meta) =>
    meta.property?.toLowerCase().startsWith("og:")
  );
  const hasOpenGraph = Boolean(
    findMetaByProperty(rawData, "og:title") ||
      findMetaByProperty(rawData, "og:description") ||
      findMetaByProperty(rawData, "og:image")
  );

  return {
    title: rawData.title,
    hasTitle: Boolean(rawData.title),
    titleLength,
    titleLengthStatus:
      titleLength === 0 ? "missing" : titleLength < 30 || titleLength > 60 ? "review" : "good",
    description,
    hasMetaDescription: Boolean(description),
    descriptionLength,
    h1Count: rawData.h1Texts.length,
    h1Texts: rawData.h1Texts,
    hasMultipleH1: rawData.h1Texts.length > 1,
    canonicalUrl: rawData.canonicalUrl,
    hasCanonical: Boolean(rawData.canonicalUrl),
    robots,
    hasRobotsMeta: Boolean(robots),
    hasOpenGraph,
    openGraphTagCount: openGraphTags.length,
    hasFavicon: rawData.icons.length > 0,
    imageAltCoverage,
    imagesWithAlt,
    missingAltCount,
    imageCount,
  };
}

module.exports = {
  analyzeSEO,
};
