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
const httpEndpoint = process.env.GRAPHQL_HTTP || 'http://localhost:4000'

const link = createUploadLink({
    uri: 'http://localhost:4000',
    fetch: customFetch,
    credentials: 'include', // same-origin include
})

// Config
const defaultOptions = {
    httpEndpoint,
    wsEndpoint: process.env.GRAPHQL_WS || 'ws://localhost:4000',
    // Enable Automatic Query persisting with Apollo Engine
    persisting: false,
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
                fetchPolicy: 'cache-and-network',
            },
        },
    })

    return apolloProvider
}

/**
 * Resets the apollo store and forces a refetch
 * @param  {Boolean} noWebsocket By default the websocket will be restarted aswell, this can be disabled.
 */
export async function resetStore(noWebsocket = false) {
    if (apolloClient.wsClient && !noWebsocket) restartWebsockets(apolloClient.wsClient)
    try {
        await apolloClient.resetStore()
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('%cError on cache reset', 'color: orange;', e.message)
    }
}

/**
 * Removes query results from the store.
 * Caution: This does not force a refetch on active components. Use refetchQueries or resetStore for that.
 * @param  {string} names Array of query names
 */
export function removeFromCache(names) {
    if (names.constructor !== Array) { names = [names] }
    try {
        // Apollo 1.x
        // let rootQuery = this.props.client.store.getState().apollo.data.ROOT_QUERY;
        let rootQuery = cache.data.data.ROOT_QUERY
        Object.keys(rootQuery)
            .filter(query => !includesArray(query, names))
            .forEach(query => {
                delete rootQuery[query]
            })
    } catch (error) {
        console.error(`deleteStoreQuery: ${error}`)
    }
}

/**
 * Helper function that extends String.include to arrays of strings.
 * @param  {string} string  The values to search in.
 * @param  {string[]} array The values to search for.
 * @return {boolean}        true if one of the strings in array is found within the string
 */
function includesArray(string, array) {
    for (let i = 0, max = array.length; i < max; i++) {
        if (string.includes(array[i])) return true
    }
    return false
}
