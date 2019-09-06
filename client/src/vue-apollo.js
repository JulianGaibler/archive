import Vue from 'vue'
import VueApollo from 'vue-apollo'
import { createApolloClient, restartWebsockets } from 'vue-cli-plugin-apollo/graphql-client'
import { createUploadLink } from 'apollo-upload-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import customFetch from './utils/customFetch'

// Install the vue plugin
Vue.use(VueApollo)

const cache = new InMemoryCache({
    dataIdFromObject: object => object.id || null,
})

// Http endpoint
const httpEndpoint = process.env.VUE_APP_GRAPHQL_HTTP || 'http://localhost:4000'
// Files URL root
export const filesRoot = process.env.VUE_APP_FILES_ROOT || httpEndpoint.substr(0, httpEndpoint.indexOf(''))


const link = createUploadLink({
    uri: 'http://localhost:4000',
    fetch: customFetch,
    credentials: 'include', // same-origin include
})

Vue.prototype.$filesRoot = filesRoot

// Config
const defaultOptions = {
    httpEndpoint,
    wsEndpoint: process.env.VUE_APP_GRAPHQL_WS || 'ws://localhost:4000',
    // Enable Automatic Query persisting with Apollo Engine
    persisting: false,
    // Use websockets for everything (no HTTP)
    // You need to pass a `wsEndpoint` for this to work
    // Is being rendered on the server?
    ssr: false,
    link,
    cache,

    defaultHttpLink: false,
}

// Create apollo client
const { apolloClient, wsClient } = createApolloClient(defaultOptions)
apolloClient.wsClient = wsClient

export { apolloClient }

// Call this in the Vue app file
export function createProvider() {
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
export async function resetStore() {
    if (apolloClient.wsClient) restartWebsockets(apolloClient.wsClient)
    try {
        await apolloClient.resetStore()
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('%cError on cache reset', 'color: orange;', e.message)
    }
}
