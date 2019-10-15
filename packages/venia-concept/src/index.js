import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloLink } from 'apollo-link';
import { setContext } from 'apollo-link-context';
import { RetryLink } from 'apollo-link-retry';
import { Util } from '@magento/peregrine';
import { Adapter } from '@magento/venia-drivers';
import store from './store';
import app from '@magento/peregrine/lib/store/actions/app';
import App, { AppContextProvider } from '@magento/venia-ui/lib/components/App';
import './index.css';

import { Extension } from '@magento/venia-ui/lib/components/Extension';
import { WelcomeToast } from './extensions/WelcomeToast/WelcomeToast';
import { ProductRecommendations } from './extensions/ProductRecommendations/ProductRecommendations';

const { BrowserPersistence } = Util;
const apiBase = new URL('/graphql', location.origin).toString();

/**
 * The Venia adapter provides basic context objects: a router, a store, a
 * GraphQL client, and some common functions.
 */

// The Venia adapter is not opinionated about auth.
const authLink = setContext((_, { headers }) => {
    // get the authentication token from local storage if it exists.
    const storage = new BrowserPersistence();
    const token = storage.getItem('signin_token');

    // return the headers to the context so httpLink can read them
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : ''
        }
    };
});

// @see https://www.apollographql.com/docs/link/composition/.
const apolloLink = ApolloLink.from([
    // by default, RetryLink will retry an operation five (5) times.
    new RetryLink(),
    authLink,
    // An apollo-link-http Link
    Adapter.apolloLink(apiBase)
]);

ReactDOM.render(
    <Adapter apiBase={apiBase} apollo={{ link: apolloLink }} store={store}>
        <AppContextProvider>
            <App />
            {/* Some extensions require a target */}
            <Extension targetId="main-ep-before-children">
                <div style={{ textAlign: 'center' }}>
                    I'm not even an extension component, I'm just some DOM!
                </div>
            </Extension>
            <Extension targetId="main-ep-before-children">
                <div style={{ textAlign: 'center' }}>
                    I'm an example of an extension trying to overload an
                    extension point!
                </div>
            </Extension>
            <Extension targetId="main-ep-after-children">
                <ProductRecommendations />
            </Extension>
            {/* Other extensions don't need target (assumes #root at least) */}
            <Extension>
                <WelcomeToast />
            </Extension>
        </AppContextProvider>
    </Adapter>,
    document.getElementById('root')
);

if (
    process.env.NODE_ENV === 'production' ||
    process.env.DEV_SERVER_SERVICE_WORKER_ENABLED
) {
    window.addEventListener('load', () =>
        navigator.serviceWorker
            .register('/sw.js')
            .then(registration => {
                console.log('Service worker registered: ', registration);
            })
            .catch(error => {
                console.log('Service worker registration failed: ', error);
            })
    );
}

window.addEventListener('online', () => {
    store.dispatch(app.setOnline());
});
window.addEventListener('offline', () => {
    store.dispatch(app.setOffline());
});
