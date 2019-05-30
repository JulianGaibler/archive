import Vue from 'vue'
import VueApollo from 'vue-apollo'
import { createApolloClient, restartWebsockets } from 'vue-cli-plugin-apollo/graphql-client'
//import { createHttpLink } from 'apollo-link-http'
import { createUploadLink } from 'apollo-upload-client'
import { InMemoryCache } from 'apollo-cache-inmemory';

// Install the vue plugin
Vue.use(VueApollo)

const cache = new InMemoryCache();

// Http endpoint
const httpEndpoint = process.env.VUE_APP_GRAPHQL_HTTP || 'http://localhost:4000'
// Files URL root
export const filesRoot = process.env.VUE_APP_FILES_ROOT || httpEndpoint.substr(0, httpEndpoint.indexOf(''))

const link = createUploadLink({
    uri: 'http://localhost:4000',
    credentials: 'include' // same-origin include
});

Vue.prototype.$filesRoot = filesRoot

// Config
const defaultOptions = {
    // You can use `https` for secure connection (recommended in production)
    httpEndpoint,
    // You can use `wss` for secure connection (recommended in production)
    // Use `null` to disable subscriptions
    wsEndpoint: process.env.VUE_APP_GRAPHQL_WS || 'ws://localhost:4000',
    // Enable Automatic Query persisting with Apollo Engine
    persisting: false,
    // Use websockets for everything (no HTTP)
    // You need to pass a `wsEndpoint` for this to work
    websocketsOnly: false,
    // Is being rendered on the server?
    ssr: false,
    // Override default apollo link
    // note: don't override httpLink here, specify httpLink options in the
    // httpLinkOptions property of defaultOptions.
    // link: myLink

    // Override default cache
    // TODO: workaround for https://github.com/Akryum/vue-apollo/issues/631 or https://github.com/Akryum/vue-apollo/issues/630
    cache: cache,

    // Override the way the Authorization header is set
    // getAuth: (tokenName) => ...

    // Additional ApolloClient options
    apollo: {
        link,
    },

    // Client local data (see apollo-link-state)
    // clientState: { resolvers: { ... }, defaults: { ... } }
}

// Call this in the Vue app file
export function createProvider (options = {}) {
    // Create apollo client
    const { apolloClient, wsClient } = createApolloClient({
        ...defaultOptions,
        ...options,
    })
    apolloClient.wsClient = wsClient

    // Create vue apollo provider
    const apolloProvider = new VueApollo({
        defaultClient: apolloClient,
        defaultOptions: {
            $query: {
                // fetchPolicy: 'cache-and-network',
            },
        },
    })

    return apolloProvider
}

// Manually call this when user log in
export async function onLogin (apolloClient) {
    if (apolloClient.wsClient) restartWebsockets(apolloClient.wsClient)
    try {
        await apolloClient.resetStore()
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('%cError on cache reset (login)', 'color: orange;', e.message)
    }
}

// Manually call this when user log out
export async function onLogout (apolloClient) {
    if (apolloClient.wsClient) restartWebsockets(apolloClient.wsClient)
    try {
        await apolloClient.resetStore()
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('%cError on cache reset (logout)', 'color: orange;', e.message)
    }
}
