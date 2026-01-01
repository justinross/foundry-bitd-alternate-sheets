export function strip(html) {
  let doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export function convertArrayToBooleanObject(arr) {
  if (!Array.isArray(arr)) return {};
  const obj = {};
  for (const key of arr) {
    obj[key] = true;
  }
  return obj;
}

export function convertBooleanObjectToArray(obj) {
  if (!obj) return [];
  return Object.keys(obj).filter((key) => obj[key]);
}

export function resolveDescription(entity) {
  if (!entity) return "";
  const system = entity.system || {};
  return (
    system.description_short ||
    system.description ||
    system.notes ||
    system.biography ||
    ""
  );
}
