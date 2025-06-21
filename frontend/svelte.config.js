import { vitePreprocess } from '@astrojs/svelte';

export default {
  preprocess: vitePreprocess({
    style: {
      css: {
        preprocessorOptions: {
          sass: {
            additionalData: (d) => {
              const prepend = `@use "/src/styles/utils.sass" as tint\n`
              const match = d.match(/^\s*/);
              const spaces = match ? match[0] : '';
              return `${spaces}${prepend}\n${d}`
            },
          },
        },
      },
    }
  }),
};
