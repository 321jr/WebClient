/* @ngInject */
function vcard(CONSTANTS, notification, sanitize) {
    const { VCARD_VERSION, VCARD_TYPES } = CONSTANTS;
    const merge = (vcards = []) => _.reduce(vcards, (acc, vcard = {}) => build(extractProperties(vcard), acc), new vCard());
    const to = (vcards = []) => _.reduce(vcards, (acc, vCard) => acc + clean(vCard).toString(VCARD_VERSION) + '\r\n', '');
    const from = (vcfString = '') => {
        try {
            return vCard.parse(vcfString).map((vcard) => clean(vcard));
        } catch (e) {
            notification.error(e);
        }
    };

    /**
     * Check if the type is valid
     * @param  {String}  [type='']
     * @return {Boolean}
     */
    function isValidType(type = '') {
        if (type.length) {
            return _.contains(VCARD_TYPES, type.toLowerCase());
        }

        return true;
    }

    /**
     * Purify value of each vCards
     * @param  {vCard}  vcard
     * @return {vCard}
     */
    function clean(vcard = new vCard()) {
        /* eslint new-cap: "off" */
        const properties = extractProperties(vcard);

        return _.reduce(
            properties,
            (acc, property) => {
                const type = property.getType();
                const typeValue = type && (Array.isArray(type) ? type.map((t) => cleanType(t)).filter((t) => t) : cleanType(type));
                const key = property.getField();
                const value = property.valueOf();
                const params = property.getParams();

                delete params.type;

                // Set Type only if it's valid
                if (typeValue && typeValue.length) {
                    params.type = typeValue;
                }

                acc.add(key, sanitize.input(cleanValue(value)), params);

                return acc;
            },
            new vCard()
        );
    }

    /**
     * Clean type value and prefix it by adding `x` if it's invalid
     * @param  {String} type
     * @return {String}
     */
    function cleanType(type = '') {
        // Gmail set by default INTERNET as Type for email
        // We just remove it and then the default Email value will be display
        if (type === 'x-INTERNET') {
            return '';
        }

        if (isValidType(type)) {
            return type;
        }

        if (type.toLowerCase().startsWith('x')) {
            return type;
        }

        return `x-${type}`;
    }

    /**
     * Clean value
     * @param  {String} value
     * @return {String}
     */
    function cleanValue(value = '') {
        const matches = value.match(/_\$!<(.*)>!\$_/);

        // Some imported vCards from Apple have weird bracket around the value _$!<value>!$_
        if (Array.isArray(matches)) {
            return matches[1];
        }

        return value;
    }

    /**
     * get all Properties for a specific vCard
     * @param  {vCard} vcard
     * @return {Array}
     */
    function extractProperties(vcard = new vCard()) {
        return _.reduce(
            Object.keys(vcard.data),
            (acc, key) => {
                const value = vcard.get(key);
                const props = Array.isArray(value) ? value : [value];

                return acc.concat(props);
            },
            []
        );
    }

    /**
     * Handle xablabel custom property and convert it to the vCard 4 format
     * Usually, vcards coming from Apple
     * NOTE not used for now
     * @param  {Array} vcards
     * @return {Array}
     */
    /* eslint no-unused-vars: "off" */
    function convertCustoms(vcard = new vCard()) {
        const groups = _.groupBy(extractProperties(vcard), (property) => property.getGroup() || 'nogroup');

        return _.reduce(
            Object.keys(groups),
            (acc, groupName) => {
                const group = groups[groupName];

                if (groupName === 'nogroup' || group.length === 1) {
                    _.each(group, (prop) => acc.addProperty(prop));

                    return acc;
                }

                const property1 = _.find(group, (prop) => prop.getField().toLowerCase() === 'xablabel');

                if (property1) {
                    const property2 = _.find(group, (prop) => prop.getField().toLowerCase() !== 'xablabel');
                    const key = property2.getField();
                    const value = property2.valueOf();
                    const params = property2.getParams() || {};
                    const type = property1.valueOf();

                    params.type = type;
                    acc.add(key, value, params);

                    return acc;
                }

                _.each(group, (prop) => acc.addProperty(prop));

                return acc;
            },
            new vCard()
        );
    }

    function build(properties = [], target = new vCard()) {
        _.each(properties, (property) => target.addProperty(property));

        return target;
    }

    return { from, to, extractProperties, merge, build, isValidType };
}
export default vcard;
