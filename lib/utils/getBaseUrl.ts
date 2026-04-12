export const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not defined");
  }

  return url;
};
