angular.module('proton.message')
    .directive('injectMessageMedia', ($rootScope, displayImages, displayEmbedded) => {

        const wrapImage = (img) => {
            const hash = `${Math.random().toString(32).slice(2, 12)}-${Date.now()}`;
            img.setAttribute('data-hash', hash);
            angular.element(img).wrap(`<div class="image loading" data-hash="${hash}"></div>`);
        };
        const wrapImages = (list) => list.forEach(wrapImage);

        /**
         * Remove the loadedr when the image is loaded
         * Add a delay because that's better for the user to see an interaction,
         * even if it's fast.
         * @param  {Node} node    Main scope content
         * @param  {String} hash  Hash of the media
         * @return {void}
         */
        const removeLoader = (node, hash) => {
            _.defer(() => {
                const loader = node.querySelector(`.loading[data-hash="${hash}"]`);
                loader && $(loader).contents().unwrap();
            }, 100);
        };

        /**
         * From a list of all the media we need to load we wrap them inside a loader, then we load them.
         * @param  {Array} $list       Collection of nodes
         * @param  {Object} config      {selector, attribute, getValue(node)}
         * @return {Array}
         */
        function alltheThings($list, config = {}) {
            const { attribute, selector, setLoader = true, container } = config;
            $list.forEach((node) => {

                setLoader && wrapImage(node);

                if (node.nodeName !== 'IMG') {
                    node.setAttribute(attribute, config.getValue(node));
                    removeLoader(container, node.dataset.hash);
                }

                if (node.nodeName === 'IMG') {
                    node.onload = () => removeLoader(container, node.dataset.hash);
                    node.onerror = () => console.error(`Could not load ${node.getAttribute(selector)}`);
                    node.setAttribute(attribute, config.getValue(node));
                }
            });
        }

        /**
         * Inject to the message Body each embedded images
         * @param  {jQLite} el          Current node wrapper
         * @param  {Object} options.map Map {<cid:String>: <url:String>}
         * @return {void}
         */
        function injectInlineEmbedded(el, { map, action }) {
            const node = el[0];
            const selector = Object.keys(map)
                .map((cid) => `[proton-src="${cid}"]`)
                .join(',');
            const $list = [].slice.call(node.querySelectorAll(selector || '[proton-src^="cid:"]'));

            // Set the loader before we decrypt then load the image (better ux)
            if (action === 'user.inject.load') {
                return wrapImages($list);
            }

            alltheThings($list, {
                selector: 'proton-src',
                attribute: 'src',
                setLoader: false,
                container: node,
                map,
                getValue(node) {
                    return this.map[node.getAttribute('proton-src')];
                }
            });
        }

        /**
         * Inject to the message Body each embedded images
         * @param  {jQLite} el          Current node wrapper
         * @param  {Array} options.list Collection of content [ {<proton-x:String>:<url:String>} ]
         * @return {void}
         */
        function injectInlineRemote(el, { list, hasSVG }) {

            const node = el[0];
            const mapSelectors = list.reduce((acc, map) => {
                return Object.keys(map)
                    .reduce((acc, key) => {
                        acc[key] = (acc[key] || []).concat(`[${key}="${map[key]}"]`);
                        return acc;
                    }, acc);
            }, {});

            Object.keys(mapSelectors)
                .forEach((selector) => {
                    // Remove proton- from the selector to know which selector to use
                    const attribute = selector.substring(7);
                    // We don't want to parse embedded images
                    const $list = [].slice.call(node.querySelectorAll(`[${selector}]:not([${selector}^="cid:"])`));
                    alltheThings($list, {
                        selector, attribute,
                        container: node,
                        getValue(node) {
                            return node.getAttribute(this.selector);
                        }
                    });
                });

            // No need to replace the current node for each svg
            if (hasSVG) {
                node.innerHTML = node.innerHTML.replace(/proton-svg/g, 'svg');
            }
        }

        function injectAttributeStyles(element) {
            _.each(element[0].querySelectorAll('[style]'), (node) => {
                node.setAttribute('style', node.getAttribute('style').replace(/proton-(url)/g, '$1'));
            });
        }

        return {
            link(scope, el) {
                const unsubscribe = $rootScope.$on('message.open', (e, { type, data }) => {

                    if (data.message.ID !== scope.message.ID) {
                        return;
                    }

                    switch (type) {
                        case 'injectContent': {
                            const body = scope.body || scope.message.getDecryptedBody(true);
                            scope.$applyAsync(() => {
                                (data.action === 'remote') && displayImages(scope.message, body, 'user.inject');
                                (data.action === 'embedded') && displayEmbedded(scope.message, body, 'user.inject');
                            });
                            break;
                        }

                        case 'remote.injected':
                            if (data.action === 'user.inject') {
                                injectAttributeStyles(el);
                                return injectInlineRemote(el, data);
                            }
                            break;

                        case 'embedded.injected':
                            if (data.action === 'user.inject.load') {
                                return injectInlineEmbedded(el, data);
                            }
                            if (data.action === 'user.inject') {
                                return injectInlineEmbedded(el, data);
                            }
                            break;

                    }
                });

                scope.$on('$destroy', () => {
                    unsubscribe();
                });

            }
        };
    });
