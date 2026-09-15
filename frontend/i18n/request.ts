import { getRequestConfig } from "next-intl/server";

import { getLocale } from "@/lib/i18n/locale";

/**
 * next-intl without i18n routing: the locale comes from the cookie rather than
 * from a path segment. See lib/i18n/locale.ts for why.
 */
export default getRequestConfig(async () => {
  const locale = await getLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
