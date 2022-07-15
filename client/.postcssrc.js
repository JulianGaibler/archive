export const ident = "postcss";
export const map = false;
export const plugins = {
  "postcss-preset-env": {
    browsers: "Firefox >= 52, Chrome >= 57, Safari >= 11, iOS >= 11",
    autoprefixer: {
      flexbox: "no-2009",
    },
    stage: 3,
  },
  "postcss-normalize": {},
};
