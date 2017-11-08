angular.module('proton.commons')
    .factory('Address', ($http, url, gettextCatalog) => {

        const I18N = {
            ERROR_UPDATE: gettextCatalog.getString('Error during updating', null, 'Error'),
            ERROR_ORDER: gettextCatalog.getString('Unable to save your changes, please try again.', null, 'Error'),
            ERROR_DELETE: gettextCatalog.getString('Error during deletion', null, 'Error'),
            ERROR_DISABLE: gettextCatalog.getString('Error during disable request', null, 'Error'),
            ERROR_ENABLE: gettextCatalog.getString('Error during enable request', null, 'Error'),
            ERROR_CREATE: gettextCatalog.getString('Address creation failed', null, 'Error')
        };

        const requestUrl = url.build('addresses');

        const filterError = (error) => ({ data = {} }) => {
            if (data.Code !== 1000) {
                throw new Error(data.Error || error);
            }
            return data;
        };

        /**
         * Add an address to a domain, returns {address_id} if successful, group address limit and usage
         * @param {Object} address
         * @return {Promise}
         */
        const create = (address) => {
            return $http.post(requestUrl(), address)
                .then(filterError(I18N.ERROR_CREATE));
        };

        /**
         * Add an address to a domain, returns {address_id} if successful, group address limit and usage
         * @param {Object} address
         * @return {Promise}
         */
        const setup = (params) => {
            return $http.post(requestUrl('setup'), params);
        };

        /**
         * Edit address
         * @param {String} addressID
         * @param {Object} params
         * @return {Promise}
         */
        const edit = (addressID, params) => {
            return $http.put(requestUrl(addressID), params)
                .then(filterError(I18N.ERROR_UPDATE));
        };

        /**
         * Enable address
         * @param {String} addressID
         * @return {Promise}
         */
        const enable = (addressID) => {
            return $http.put(requestUrl(addressID, 'enable'))
                .then(filterError(I18N.ERROR_ENABLE));
        };

        /**
         * Disable address
         * @param {String} addressID
         * @return {Promise}
         */
        const disable = (addressID) => {
            return $http.put(requestUrl(addressID, 'disable'))
                .then(filterError(I18N.ERROR_DISABLE));
        };

        /**
         * Delete an address (alias), returns group address limit and usage
         * @param {String} addressID
         * @return {Promise}
         */
        const remove = (addressID) => {
            return $http.delete(requestUrl(addressID))
                .then(filterError(I18N.ERROR_DELETE));
        };

        const order = (params) => {
            return $http.post(requestUrl('order'), params)
                .then(filterError(I18N.ERROR_ORDER));
        };

        return { create, setup, edit, enable, disable, remove, order };
    });
