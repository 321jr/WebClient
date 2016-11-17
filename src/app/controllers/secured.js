angular.module('proton.controllers.Secured', [])
.controller('SecuredController', (
    $cookies,
    $filter,
    $q,
    $rootScope,
    $scope,
    $state,
    $stateParams,
    $timeout,
    $window,
    authentication,
    cache,
    cacheCounters,
    CONSTANTS,
    desktopNotifications,
    eventManager,
    feedbackModal,
    generateModal,
    gettextCatalog,
    hotkeys,
    notify,
    messageActions, // added here to initialize $rootScope.$on
    organization,
    Organization,
    Payment,
    pmcw,
    tools
) => {
    const dirtyAddresses = [];

    $scope.tools = tools;
    $scope.user = authentication.user;
    $scope.isAdmin = authentication.user.Role === CONSTANTS.PAID_ADMIN;
    $scope.isFree = authentication.user.Role === CONSTANTS.FREE_USER;
    $scope.keyPhase = CONSTANTS.KEY_PHASE;
    $scope.organization = organization;
    $rootScope.isLoggedIn = true; // Shouldn't be there
    $rootScope.isLocked = false; // Shouldn't be there

    // Set language used for the application
    gettextCatalog.setCurrentLanguage(authentication.user.Language);

    // Request for desktop notification
    desktopNotifications.request();

    // Enable hotkeys
    if (authentication.user.Hotkeys === 1) {
        hotkeys.bind();
    } else {
        hotkeys.unbind();
    }

    // if the user subscribed to a plan during the signup process
    if ($rootScope.tempPlan && ['plus', 'visionary'].indexOf($rootScope.tempPlan.Name) !== -1 && $rootScope.tempPlan.Amount === authentication.user.Credit) {
        const subscribe = function () {
            const deferred = $q.defer();

            Payment.subscribe({
                Amount: 0,
                Currency: $rootScope.tempPlan.Currency,
                PlanIDs: [$rootScope.tempPlan.ID]
            }).then((result) => {
                if (result.data && result.data.Code === 1000) {
                    deferred.resolve();
                } else if (result.data && result.data.Error) {
                    deferred.reject(new Error(result.data.Error));
                }
            });

            return deferred.promise;
        };

        const organizationKey = function () {
            const deferred = $q.defer();
            const mailboxPassword = authentication.getPassword();

            pmcw.generateKeysRSA('pm_org_admin', mailboxPassword)
            .then((response) => {
                const privateKey = response.privateKeyArmored;

                deferred.resolve({
                    DisplayName: gettextCatalog.getString('My organization', null, 'Title'),
                    PrivateKey: privateKey,
                    BackupPrivateKey: privateKey
                });
            }, () => {
                deferred.reject(new Error('Error during the generation of new keys for pm_org_admin'));
            });

            return deferred.promise;
        };

        const createOrganization = function (parameters) {
            const deferred = $q.defer();

            Organization.create(parameters)
            .then((result) => {
                if (result.data && result.data.Code === 1000) {
                    deferred.resolve(result);
                } else if (result.data && result.data.Error) {
                    deferred.reject(new Error(result.data.Error));
                } else {
                    deferred.reject(new Error(gettextCatalog.getString('Error during organization request', null, 'Error')));
                }
            }, () => {
                deferred.reject(new Error(gettextCatalog.getString('Error during organization request', null, 'Error')));
            });

            return deferred.promise;
        };

        subscribe()
        .then(organizationKey)
        .then(createOrganization)
        .then(eventManager.call)
        .catch((error) => {
            notify({ message: error, classes: 'notification-danger' });
        });
    }

    // We save the payment method used during the subscription
    if ($rootScope.tempMethod && $rootScope.tempMethod.Type === 'card') {
        Payment.updateMethod($rootScope.tempMethod)
        .then((result) => {
            if (result.data && result.data.Code === 1000) {
                delete $rootScope.tempMethod;
            }
        });
    }

    // Set event ID
    eventManager.start(authentication.user.EventID);

    // Initialize counters for conversation (total and unread)
    cacheCounters.query();

    // Listeners
    $scope.$on('updatePageName', () => $scope.updatePageName());

    $scope.$on('updateUser', () => {
        $scope.$applyAsync(() => {
            $scope.user = authentication.user;
            $scope.isAdmin = authentication.user.Role === CONSTANTS.PAID_ADMIN;
            $scope.isFree = authentication.user.Role === CONSTANTS.FREE_USER;
        });
    });

    $scope.$on('organizationChange', (event, organization) => {
        $scope.$applyAsync(() => {
            $scope.organization = organization;
        });
    });

    $scope.$on('$destroy', () => {
        // Disable hotkeys
        hotkeys.unbind();
    });

    _.each(authentication.user.Addresses, (address) => {
        if (address.Keys.length === 0 && address.Status === 1 && authentication.user.Private === 1) {
            dirtyAddresses.push(address);
        }
    });

    if (dirtyAddresses.length > 0 && generateModal.active() === false) {
        generateModal.activate({
            params: {
                title: 'Setting up your Addresses',
                message: 'Before you can start sending and receiving emails from your new addresses you need to create encryption keys for them. Simply select your preferred encryption strength and click "Generate Keys".', // TODO need text
                addresses: dirtyAddresses,
                password: authentication.getPassword(),
                close(success) {
                    if (success) {
                        eventManager.call();
                    }

                    generateModal.deactivate();
                }
            }
        });
    }

    $scope.idDefined = function () {
        const id = $state.params.id;

        return angular.isDefined(id) && id.length > 0;
    };


    /**
     * Returns a string for the storage bar
     * @return {String} "123/456 [MB/GB]"
     */
    $scope.storageUsed = function () {
        if (authentication.user.UsedSpace && authentication.user.MaxSpace) {
            const gb = 1073741824;
            const mb = 1048576;
            const units = (authentication.user.MaxSpace >= gb) ? 'GB' : 'MB';
            const isGB = units === 'GB';
            const used = (authentication.user.UsedSpace / (isGB ? gb : mb));
            const total = (authentication.user.MaxSpace / (isGB ? gb : mb));

            return used.toFixed(1) + '/' + total + ' ' + units;
        }

        return '';
    };

    $scope.getEmails = function (emails) {
        return _.map(emails, (email) => email.Address).join(',');
    };

    /**
     * Go to route specified
     */
    $scope.goTo = function (route) {
        if (angular.isDefined(route)) {
            $state.go(route);
        }
    };

    function getFirstSortedAddresses() {
        return _.chain(authentication.user.Addresses)
            .where({ Status: 1, Receive: 1 })
            .sortBy('Send')
            .first()
            .value() || {};
    }

    /**
     * Update the browser title to display the current mailbox and
     * the number of unread messages in this folder
     */
    $scope.updatePageName = function () {
        let value;
        let name;
        let unread = '';
        const state = tools.currentMailbox();
        const { Email = '' } = getFirstSortedAddresses();

        switch (state) {
            case 'drafts':
                value = cacheCounters.unreadMessage(CONSTANTS.MAILBOX_IDENTIFIERS[state]);
                break;
            case 'label':
                value = cacheCounters.unreadConversation($state.params.label);
                break;
            default:
                value = cacheCounters.unreadConversation(CONSTANTS.MAILBOX_IDENTIFIERS[state]);
                break;
        }

        if (angular.isDefined(value) && value > 0) {
            unread = '(' + value + ') ';
        }

        switch (state) {
            case 'inbox':
                name = unread + gettextCatalog.getString('Inbox', null, 'Title');
                break;
            case 'drafts':
                name = unread + gettextCatalog.getString('Drafts', null, 'Title');
                break;
            case 'sent':
                name = unread + gettextCatalog.getString('Sent', null, 'Title');
                break;
            case 'starred':
                name = unread + gettextCatalog.getString('Starred', null, 'Title');
                break;
            case 'archive':
                name = unread + gettextCatalog.getString('Archive', null, 'Title');
                break;
            case 'spam':
                name = unread + gettextCatalog.getString('Spam', null, 'Title');
                break;
            case 'trash':
                name = unread + gettextCatalog.getString('Trash', null, 'Title');
                break;
            case 'label': {
                const label = _.findWhere(authentication.user.Labels, { ID: $state.params.label });

                if (angular.isDefined(label)) {
                    name = label.Name;
                } else {
                    name = gettextCatalog.getString('Label', null, 'Title');
                }
                break;
            }
            case 'contacts':
                name = gettextCatalog.getString('Contacts', null, 'Title');
                break;
            case 'dashboard':
                name = gettextCatalog.getString('Dashboard', null, 'Title');
                break;
            case 'account':
                name = gettextCatalog.getString('Account', null, 'Title');
                break;
            case 'labels':
                name = gettextCatalog.getString('Labels', null, 'Title');
                break;
            case 'security':
                name = gettextCatalog.getString('Security', null, 'Title');
                break;
            case 'appearance':
                name = gettextCatalog.getString('Appearance', null, 'Title');
                break;
            case 'domains':
                name = gettextCatalog.getString('Domains', null, 'Title');
                break;
            case 'users':
                name = gettextCatalog.getString('Users', null, 'Title');
                break;
            case 'invoices':
                name = gettextCatalog.getString('Invoices', null, 'Title');
                break;
            default:
                name = '';
                break;
        }

        if (name.length > 0) {
            name += ' | ';
        }

        $rootScope.pageName = name + Email;
    };
});
