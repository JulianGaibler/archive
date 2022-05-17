import React from 'react'
import ReactDOM from 'react-dom'
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
  from,
} from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'

import './styles/global.sass'

import App from './app'

const httpLink = new HttpLink({
  uri: 'http://localhost:4000',
  credentials: 'include',
})

const client = new ApolloClient({
  link: from([httpLink]),
  cache: new InMemoryCache(),
})

ReactDOM.render(
  <ApolloProvider client={client}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ApolloProvider>,
  document.getElementById('app-root'),
)
