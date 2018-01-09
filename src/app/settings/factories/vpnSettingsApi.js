/* @ngInject */
function vpnSettingsApi($http, url, vpnSettingsModel) {
    const requestURL = url.build('settings/vpn');
    const handleResult = ({ data = {} } = {}) => {
        if (data.Error) {
            throw new Error(data.Error);
        }

        if (data.Code === 1000) {
            vpnSettingsModel.set('all', data.VPNSettings);
        }

        return data;
    };
    const fetch = () => $http.get(requestURL()).then(handleResult);
    const updateName = (data) => $http.put(requestURL('name'), data).then(handleResult);
    const updatePassword = (data) => $http.put(requestURL('password'), data).then(handleResult);

    return { fetch, updateName, updatePassword };
}
export default vpnSettingsApi;
