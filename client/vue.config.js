process.env.VUE_APP_VERSION = require('./package.json').version

module.exports = {
    pluginOptions: {
        i18n: {
            locale: 'en',
            fallbackLocale: 'en',
            localeDir: 'locales',
            enableInSFC: false,
        },
    },
    chainWebpack: config => {
        config.resolveLoader.alias.set('changelog-loader', './webpack/changelog-loader.js')
        config.module
            .rule('changelog')
            .test(/changelog.yaml/)
            .use('changelog-loader')
            .loader('changelog-loader')
            .end()
    },
}
