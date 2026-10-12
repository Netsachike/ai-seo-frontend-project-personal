import { createCn } from "cn/config";

/**
 * Class merger aware of Rankoya's type scale, so `text-h1` (size) and
 * `text-fg` (color) never cancel each other out.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "h3",
            "body",
            "body-lg",
            "small",
            "caption",
            "overline",
            "metric-xl",
            "metric",
            "mono",
          ],
        },
      ],
    },
  },
});
