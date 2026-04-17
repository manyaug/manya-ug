/**
 * MANYA UNIVERSAL GLOBE LOGIC
 * Domain rules for map projections, quiz validation, and puzzle mechanics.
 */

export const CONTINENT_MAP = {
  "africa": ["012","024","204","072","854","108","120","132","140","148","174","178","180","262","818","226","232","748","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","768","788","800","834","894","716","732"],
  "north_africa": ["012","818","434","504","729","788","732"],
  "west_africa": ["204","854","132","384","270","288","324","624","430","466","478","562","566","686","694","768"],
  "east_africa": ["108","174","262","232","231","404","450","454","480","508","646","690","706","728","800","834","894","716"],
  "central_africa": ["024","120","140","148","178","180","226","266","678"],
  "southern_africa": ["072","748","426","516","710"],
  "horn_africa": ["262","232","231","706"],
  "namerica": ["124","840","484","304","084","188","222","320","340","558","591","028","044","052","192","212","214","308","332","388","630","780"],
  "samerica": ["032","068","076","152","170","218","238","328","600","604","740","858","862","254"],
  "europe": ["008","020","040","112","056","070","100","191","203","208","233","246","250","276","300","348","352","372","380","428","438","440","442","470","498","499","528","807","578","616","620","642","643","674","688","703","705","724","752","756","804","826","336"],
  "asia": ["004","051","031","048","050","064","096","116","156","196","268","356","360","364","368","376","392","400","398","414","417","418","422","458","462","496","104","524","408","512","586","608","634","682","702","410","144","760","158","762","764","626","792","795","784","860","704","887"],
  "australia": ["036","242","554","598","090","548","882","296","583","584","585"],
  "antarctica": ["010","260"]
};

/**
 * Validates a quiz answer.
 */
export const validateQuizAnswer = (selected, correct) => {
    return selected === correct;
};

/**
 * Validates a puzzle piece placement.
 * Uses Geo-distance between dropped point and target.
 * Requires d3-geo (passed in to keep logic pure from direct dependencies if needed, 
 * or just standard math if we prefer).
 */
export const validatePiecePlacement = (coords, target, threshold = 0.45) => {
    // Standard Haversine or simple distance is enough for most "correctness" 
    // but we'll use a simplified distance here if we want to avoid d3-geo dependency in pure logic.
    // However, since we have no d3 here, let's assume standard Haversine or 
    // expect the distance to be pre-calculated by the caller using d3.geoDistance.
    // For now, let's stay consistent with the monolithic implementation.
    return (d3Distance) => d3Distance < threshold;
};

/**
 * Returns list of matching country IDs for a given highlight key.
 */
export const getHighlightIds = (highlightKey) => {
    return CONTINENT_MAP[highlightKey] || (Array.isArray(highlightKey) ? highlightKey : [highlightKey]);
};
