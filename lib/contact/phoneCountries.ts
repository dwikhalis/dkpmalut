import worldCountries from "world-countries";

function getCallingCode(country: (typeof worldCountries)[number]) {
  if (country.idd.root === "+1") return "+1";
  if (country.cca2 === "KZ" || country.cca2 === "RU") return "+7";
  if (country.cca2 === "VA") return "+39";

  const suffix = country.idd.suffixes?.[0];
  return country.idd.root && suffix ? `${country.idd.root}${suffix}` : "";
}

export const contactPhoneCountries = worldCountries
  .map((country) => ({
    id: country.cca2,
    code: getCallingCode(country),
    flagUrl: `https://flagcdn.com/${country.cca2.toLowerCase()}.svg`,
    name: country.name.common,
  }))
  .filter((country) => country.code)
  .sort((first, second) => {
    if (first.id === "ID") return -1;
    if (second.id === "ID") return 1;
    return first.name.localeCompare(second.name, "en");
  });

export const DEFAULT_CONTACT_COUNTRY_ID = "ID";
export const DEFAULT_CONTACT_CALLING_CODE = "+62";

export function isContactCallingCode(value: string) {
  return contactPhoneCountries.some((country) => country.code === value);
}
