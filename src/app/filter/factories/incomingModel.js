angular.module('proton.filter')
    .factory('incomingModel', (notify, gettextCatalog, IncomingDefault, networkActivityTracker) => {

        const I18N = {
            ADD_SUCCESS: gettextCatalog.getString('Spam Filter Added', null, 'Filters'),
            UPDATE_SUCCESS: gettextCatalog.getString('Spam Filter Updated', null, 'Filters'),
            DELETE_SUCCESS: gettextCatalog.getString('Spam Filter Deleted', null, 'Filters')
        };

        const notifySuccess = (message) => notify({ message, classes: 'notification-success' });

        const get = (config) => {
            const promise = IncomingDefault.get(config)
                .then(({ data = {} }) => {
                    if (data.Error) {
                        throw new Error(data.Error);
                    }
                    return data.IncomingDefaults;
                });
            networkActivityTracker.track(promise);
            return promise;
        };

        const update = (ID, Location) => {
            const promise = IncomingDefault.update({ ID, Location })
                .then(({ data = {} }) => {
                    if (data.Error) {
                        throw new Error(data.Error);
                    }
                    notifySuccess(I18N.UPDATE_SUCCESS);
                    return data.IncomingDefault;
                });
            networkActivityTracker.track(promise);
            return promise;
        };

        const remove = (ID) => {
            const promise = IncomingDefault.delete({ IDs: [ ID ] })
                .then(({ data = {} }) => {
                    if (data.Error) {
                        throw new Error(data.Error);
                    }
                    notifySuccess(I18N.DELETE_SUCCESS);
                    return data.IncomingDefault;
                });
            networkActivityTracker.track(promise);
            return promise;
        };

        const create = (Email, Location) => {
            const promise = IncomingDefault.add({ Email, Location })
                .then(({ data = {} }) => {
                    if (data.Error) {
                        throw new Error(data.Error);
                    }
                    notifySuccess(I18N.ADD_SUCCESS);
                    return data.IncomingDefault;
                });
            networkActivityTracker.track(promise);
            return promise;
        };

        return { get, update, remove, create };
    });
