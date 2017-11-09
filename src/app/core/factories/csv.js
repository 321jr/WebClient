angular.module('proton.core')
    .factory('csv', ($q, csvFormat) => {
        const properties = csvFormat.getAllProperties();
        const toVCard = (contact) => {
            return _.reduce(properties, (acc, key = '') => {
                const props = csvFormat[key](contact);

                if (props.length) {
                    _.each(props, ({ value = '', parameter = '' }) => {
                        const params = {};

                        if (parameter) {
                            params.type = parameter;
                        }

                        acc.add(key, value, params);
                    });
                }

                return acc;
            /* eslint new-cap: "off" */
            }, new vCard());
        };

        return {
            /**
             * Convert CSV data to vCard
             * @return {Promise}
             */
            csvToVCard(file) {
                const deferred = $q.defer();
                const onComplete = (results = {}) => {
                    const contacts = results.data.map((contact) => toVCard(contact));

                    deferred.resolve(contacts);
                };
                const onError = (error) => deferred.reject(error);
                const config = {
                    header: true, // If true, the first row of parsed data will be interpreted as field names. An array of field names will be returned in meta, and each row of data will be an object of values keyed by field name instead of a simple array. Rows with a different number of fields from the header row will produce an error.
                    dynamicTyping: true, // If true, numeric and boolean data will be converted to their type instead of remaining strings.
                    complete: onComplete,
                    error: onError,
                    skipEmptyLines: true // If true, lines that are completely empty will be skipped. An empty line is defined to be one which evaluates to empty string.
                };

                Papa.parse(file, config);

                return deferred.promise;
            }
        };
    });
