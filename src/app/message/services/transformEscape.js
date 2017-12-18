/* @ngInject */
function transformEscape() {
    /**
     * Create all possibilites based on a collection
     * @{@link  https://stackoverflow.com/questions/4331092/finding-all-combinations-of-javascript-array-values#answer-37276760}
     * @param  {Array} arr Array of array
     * @return {String}
     */
    function getPermutation(list, prefix = '') {
        if (!list.length) {
            return prefix;
        }

        return list[0]
            .reduce((acc, value) => {
                return acc.concat(getPermutation(list.slice(1), prefix + value));
            }, [])
            .join('|');
    }

    /* eslint no-useless-escape: off */
    const matchURLS = getPermutation([['&#117;', 'u'], ['&#114;', 'r', '\&#114;'], ['&#108;', 'l', '\&#108;', '\l']]);

    /**
     * Prevent escape url on the textContent if you display some code
     * inside the message
     * @param  {Node} node
     * @return {void}
     */
    const recursiveCleanerCode = (node) => {
        _.each(node.querySelectorAll('*'), (node) => {
            if (node.childElementCount) {
                return recursiveCleanerCode(node);
            }

            if (/proton-/g.test(node.textContent)) {
                node.textContent = node.textContent.replace(/proton-/g, '');
            }
        });
    };

    /**
     * Unescape the textContent only and inside a synthax Highlighting block
     * Compat
     *     - fontawesome
     *     - prism
     *     - etc.
     * @param  {Node} dom
     * @return {Node}
     */
    const syntaxHighlighterFilter = (dom) => {
        const $pre = dom.querySelectorAll('.pre, pre, code');
        _.each($pre, (node) => {
            if ((node.nodeName === 'PRE' || node.nodeName === 'CODE') && !node.childElementCount) {
                node.textContent = node.textContent.replace(/proton-/g, '');
                return;
            }
            recursiveCleanerCode(node);
        });

        return dom;
    };

    /*
        * match attributes or elements with svg, xlink, srcset, src, background, poster.
        * the regex checks that the element/attribute is actually in an element by looking forward and seeing if it
        * ends properly with a >
        *
        * Another assumption in these regex are: all attributes use the " quotes instead of the ' quote. This is satisfied
        * by the previous standardization steps
        */
    const BLACK_LIST = ['svg', 'xlink:href', 'srcset=', 'src=', 'background=', 'poster='];
    const FORBIDDEN_HTML = `(${BLACK_LIST.join('|')})`;
    const NO_SPECIALS = '([^"><\\\\]|\\\\[^><])';
    const NO_QUOTS = '(\\\\.|[^"\\\\])';
    const HTML_STRING = `("${NO_QUOTS}*")`;
    const VERIFY_ELEMENT_END = `(?=(${NO_SPECIALS}|${HTML_STRING})*>)`;

    const STYLE_ATTRIBUTE = '(style\\s*=\\s*")';
    // The style attribute_value makes sure that there is at least a url( string inside the attribute, otherwise
    // it's no use to investigate it further.
    const ATTRIBUTE_VALUE = '((?:(?:[^"\\\\]|\\\\.)*))(")';

    const REGEXP_IS_BREAK = new RegExp(FORBIDDEN_HTML + VERIFY_ELEMENT_END, 'gi');
    const REGEXP_IS_STYLE = new RegExp(STYLE_ATTRIBUTE + ATTRIBUTE_VALUE + VERIFY_ELEMENT_END, 'gi');

    /*
            This is valid
             - background:&#117;r&#108;(
             - background:url&lpar;
             - etc.
         */
    const CSS_URL = `((${matchURLS})(\\(|&(#40|#x00028|lpar);))`;
    const REGEXP_URL_ATTR = new RegExp(CSS_URL, 'gi');

    /**
     * Escape some WTF from the CSSParser, cf spec files
     * @param  {String} style
     * @return {String}
     */
    const escapeURLinStyle = (style) => {
        // handle the case where the value is html encoded, e.g.:
        // background:&#117;rl(&quot;https://i.imgur.com/WScAnHr.jpg&quot;)
        const decodedStyle = _.unescape(style);
        const encodeFlag = decodedStyle !== style;

        const escapedStyle = decodedStyle.replace(/\\r/g, 'r').replace(REGEXP_URL_ATTR, 'proton-url(');

        if (escapedStyle === decodedStyle) {
            // nothing escaped: just return input
            return style;
        }

        return encodeFlag ? _.escape(escapedStyle) : escapedStyle;
    };

    const escapeURL = (input, action) => {
        if (action === 'user.inject') {
            return input;
        }
        /*
            * first grep the style, then we make sure the style doesn't contain urls...
            * This is needed because javascript regex doesn't support lookbehinds, making it impossible to match
            * an url and lookbehind us to see if we are in a style attribute
            */
        return input.replace(REGEXP_IS_STYLE, (match, p1, p2, p3) => `${p1}${escapeURLinStyle(p2)}${p3}`);
    };

    return (html, message, { content = '', action }) => {
        html.innerHTML = escapeURL(content.replace(REGEXP_IS_BREAK, 'proton-$1'), action);
        return syntaxHighlighterFilter(html);
    };
}
export default transformEscape;
