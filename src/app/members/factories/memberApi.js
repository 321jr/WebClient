/* @ngInject */
function memberApi($http, url, srp, gettextCatalog) {
    const I18N = {
        ERROR_NAME: gettextCatalog.getString('Error updating the name', null, 'Error'),
        ERROR_CREATE: gettextCatalog.getString('User creation failed', null, 'Error'),
        ERROR_REQUEST: gettextCatalog.getString('User request failed', null, 'Error'),
        ERROR_DELETE: gettextCatalog.getString('Error during deletion', null, 'Error'),
        ERROR_UPDATE_ROLE: gettextCatalog.getString('Error updating role', null, 'Error'),
        ERROR_PRIVATIZE: gettextCatalog.getString('Error privatizing the user', null, 'Error'),
        ERROR_QUOTA: gettextCatalog.getString('Error updating the disk space quota', null, 'Error'),
        ERROR_VPN: gettextCatalog.getString('Error updating the vpn option', null, 'Error')
    };

    const requestUrl = url.build('members');
    const requestSrp = url.make('members');

    const filterError = (error) => ({ data = {} }) => {
        if (data.Code !== 1000) {
            throw new Error(data.Error || error);
        }
        return data;
    };

    /**
     * Add a member to a group. This creates a new user. Returns the new {member_id} if successful.
     */
    const create = (Obj, password) => {
        return srp
            .getPasswordParams(password, Obj)
            .then((data) => $http.post(requestUrl(), data))
            .then(filterError(I18N.ERROR_CREATE));
    };

    /**
     * Authenticate on behalf of a member to view her inbox.
     * @param {String} memberID
     * @param {Object} params
     * @return {Promise}
     */
    const authenticate = (memberID, params) => {
        return srp
            .performSRPRequest('POST', requestSrp(memberID, 'auth'), {}, params)
            .then(({ data = {} }) => data.SessionToken)
            .catch((error) => {
                throw new Error(error.error_description);
            });
    };

    const query = () => {
        return $http.get(requestUrl()).then(filterError(I18N.ERROR_REQUEST));
    };

    /**
     * Get member info, including UserID and key pair.
     */
    const get = (memberID) => $http.get(requestUrl(memberID));

    /**
     * Update member name
     * @param {String} memberID
     * @param {String} name
     * @return {Promise}
     */
    const name = (memberID, Name) => {
        return $http.put(requestUrl(memberID, 'name'), { Name }).then(filterError(I18N.ERROR_NAME));
    };

    /**
     * Update disk space quota in bytes
     * @param {String} memberID
     * @param {Integer} space
     * @return {Promise}
     */
    const quota = (memberID, MaxSpace) => {
        return $http.put(requestUrl(memberID, 'quota'), { MaxSpace }).then(filterError(I18N.ERROR_QUOTA));
    };

    /**
     * Update vpn allocated
     * @param {String} memberID
     * @param {Integer} space
     * @return {Promise}
     */
    const vpn = (memberID, MaxVPN) => {
        return $http.put(requestUrl(memberID, 'vpn'), { MaxVPN }).then(filterError(I18N.ERROR_VPN));
    };

    /**
     * Update role
     * @param {String} memberID
     * @param {Object} params
     * @return {Promise}
     */
    const role = (memberID, params) => {
        return $http.put(requestUrl(memberID, 'role'), params).then(filterError(I18N.ERROR_UPDATE_ROLE));
    };

    /**
     * Update login password
     * @param {String} memberID
     * @param {String} password
     * @return {Promise}
     */
    const password = (memberID, password) => {
        return srp.getPasswordParams(password).then((data) => $http.post(requestUrl(memberID, 'password'), data));
    };

    /**
     * Make account private
     * @param {String} memberID
     * @return {Promise}
     */
    const privatize = (memberID) => {
        return $http.put(requestUrl(memberID, 'privatize')).then(filterError(I18N.ERROR_PRIVATIZE));
    };

    /**
     * Nuke the member. Protect against nuking the group owner.
     */
    const remove = (memberID) => {
        return $http.delete(requestUrl(memberID)).then(filterError(I18N.ERROR_DELETE));
    };

    /**
     * Revoke token.
     */
    const revoke = () => $http.delete(requestUrl('auth'));

    return {
        create,
        authenticate,
        query,
        get,
        name,
        quota,
        vpn,
        role,
        password,
        privatize,
        remove,
        revoke
    };
}
export default memberApi;
