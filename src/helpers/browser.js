export const hasSessionStorage = () => {
    const mod = 'modernizr';
    try {
        sessionStorage.setItem(mod, mod);
        sessionStorage.removeItem(mod);
        return true;
    } catch (error) {
        return false;
    }
};
export const hasCookie = () => navigator.cookieEnabled;
export const getBrowser = () => $.ua.browser;
export const getDevice = () => $.ua.device;
export const isMobile = () => {
    const { type } = getDevice();
    return type === 'mobile';
};

export const getOS = () => {
    const { name = 'other', version = '' } = $.ua.os;
    return { name, version };
};
export const isSafari = () => ['Safari', 'Mobile Safari'].includes($.ua.browser.name);
export const isSafariMobile = () => $.ua.browser.name === 'Mobile Safari';
export const isIE11 = () => $.ua.browser.name === 'IE' && $.ua.browser.major === '11';
export const isEdge = () => $.ua.browser.name === 'Edge';
export const isFirefox = () => $.ua.browser.name === 'Firefox';
export const isChrome = () => $.ua.browser.name === 'Chrome';
export const isMac = () => getOS().name === 'Mac OS';
export const hasTouch = 'ontouchstart' in document.documentElement;

export const isFileSaverSupported = () => 'download' in document.createElement('a') || navigator.msSaveOrOpenBlob;

export const prngAvailable = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        return true;
    }
    if (
        typeof window !== 'undefined' &&
        typeof window.msCrypto === 'object' &&
        typeof window.msCrypto.getRandomValues === 'function'
    ) {
        return true;
    }

    return false;
};

export const doNotTrack = () => {
    return (
        navigator.doNotTrack === '1' ||
        navigator.doNotTrack === 'yes' ||
        navigator.msDoNotTrack === '1' ||
        window.doNotTrack === '1'
    );
};

/**
 * Open an URL inside a new tab/window and remove the referrer
 * @links { https://mathiasbynens.github.io/rel-noopener/}
 * @param  {String} url
 * @return {void}
 */
export function openWindow(url) {
    if (isSafari()) {
        const anchor = document.createElement('A');
        anchor.setAttribute('rel', 'noreferrer nofollow noopener');
        anchor.setAttribute('target', '_blank');
        anchor.href = url;
        return anchor.click();
    }

    const win = window.open();
    win.opener = null;
    win.location = url;
}

export const parseURL = (url = '') => {
    const parser = document.createElement('a');
    const searchObject = {};
    let split;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    const queries = parser.search.replace(/^\?/, '').split('&');

    for (let i = 0; i < queries.length; i++) {
        split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }

    return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        searchObject,
        hash: parser.hash
    };
};
