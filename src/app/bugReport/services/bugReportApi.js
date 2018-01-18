import _ from 'lodash';
import { CONSTANTS } from '../../constants';

/* @ngInject */
function bugReportApi(Bug, CONFIG, $state, aboutClient, authentication, gettextCatalog, networkActivityTracker, notification) {
    const { ROW_MODE, COLUMN_MODE, MESSAGE_VIEW_MODE, CONVERSATION_VIEW_MODE, CLIENT_TYPE } = CONSTANTS;
    const MAP_MODE = {
        layout: {
            [ROW_MODE]: 'row',
            [COLUMN_MODE]: 'column'
        },
        view: {
            [MESSAGE_VIEW_MODE]: 'row',
            [CONVERSATION_VIEW_MODE]: 'column'
        }
    };

    const getViewLayout = (type) => MAP_MODE.layout[type] || 'unknown';
    const getViewMode = (type) => MAP_MODE.view[type] || 'undefined';

    const getClient = ({ ViewLayout = '', ViewMode = '' } = {}) => {
        const os = aboutClient.getOS();
        const browser = aboutClient.getBrowser();
        const device = aboutClient.getDevice();
        return {
            OS: os.name,
            OSVersion: os.version || '',
            Browser: browser.name,
            BrowserVersion: browser.version,
            Client: 'Angular',
            ClientVersion: CONFIG.app_version,
            ClientType: CLIENT_TYPE,
            ViewLayout: getViewLayout(ViewLayout),
            ViewMode: getViewMode(ViewMode),
            DeviceName: device.vendor,
            DeviceModel: device.model
        };
    };

    /**
     * Generate the configuration for the main form
     * @return {Object}
     */
    const getForm = () => {
        const { Name = '', Addresses = [] } = authentication.user;
        const [{ Email = '' } = {}] = _.sortBy(Addresses, 'Order');

        return _.extend(getClient(authentication.user), {
            Resolution: `${window.innerHeight} x ${window.innerWidth}`,
            Title: `[Angular] Bug [${$state.$current.name}]`,
            Description: '',
            Username: Name,
            Email,
            attachScreenshot: false
        });
    };

    /**
     * Take a screenshot of the current state when we open the modal
     * @return {Promise}   resolve data is the image as a base64 string
     */
    const takeScreenshot = () =>
        new Promise((resolve) => {
            if (!window.html2canvas) {
                return resolve();
            }

            window.html2canvas(document.body, {
                onrendered(canvas) {
                    try {
                        resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
                    } catch (e) {
                        resolve(canvas.toDataURL().split(',')[1]);
                    }
                }
            });
        });

    /**
     * Send the form to the server
     * @param  {Object} form FormData from the user
     * @return {Promise}
     */
    const send = (form) => {
        return Bug.report(form).then(() => notification.success(gettextCatalog.getString('Bug reported', null, 'Bug report successfully')));
    };

    /**
     * Create a new report, upload the screenshot if we have to then send;
     * @param  {Object} form       FormData from the user
     * @param  {String} screenshot Screenshot as a base64
     * @return {Promise}
     */
    const report = (form, screenshot) => {
        let promise;
        if (form.attachScreenshot) {
            promise = Bug.uploadScreenshot(screenshot, form).then(send);
        } else {
            promise = send(form);
        }
        networkActivityTracker.track(promise);
        return promise;
    };

    const crash = (error) => {
        const crashData = _.extend(getClient(authentication.user), {
            Debug: { state: $state.$current.name, error }
        });
        return Bug.crash(crashData).catch(angular.noop);
    };

    return { getForm, takeScreenshot, report, getClient, crash };
}
export default bugReportApi;
