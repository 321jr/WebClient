angular.module("proton.controllers.Sidebar", ["proton.constants"])

.controller('SidebarController', function(
    $http,
    $log,
    $rootScope,
    $scope,
    $state,
    $stateParams,
    $timeout,
    $translate,
    authentication,
    CONFIG,
    CONSTANTS,
    Label,
    labelModal,
    Message,
    cacheCounters,
    networkActivityTracker,
    notify,
    tools
) {

    // Variables
    var mailboxes = CONSTANTS.MAILBOX_IDENTIFIERS;
    $scope.labels = authentication.user.Labels;
    $scope.appVersion = CONFIG.app_version;
    $scope.droppedMessages = [];
    $scope.droppableOptions = {
        accept: '.ui-draggable',
        activeClass: 'drop-active',
        hoverClass: 'drop-hover'
    };

    $scope.hideMobileSidebar = function() {
        $rootScope.$broadcast('sidebarMobileToggle');
    };

    // Listeners
    $scope.$on('updateLabels', function(event) { $scope.updateLabels(); });
    $scope.$on('updateCounters', function(event) { $scope.refreshCounters(); });
    $scope.$on('updatePageName', function(event) { $scope.updatePageName(); });
    $scope.$on('createLabel', function(event) { $scope.createLabel(); });

    /**
     * Called at the beginning
     */
    $scope.initialization = function() {
        $scope.refreshCounters();

        $(window).bind('resize', $scope.labelScroller );

        $scope.$on("$destroy", function() {
            $(window).unbind('resize', $scope.labelScroller );
        });
    };

    /**
     * Open modal to create a new label
     */
    $scope.createLabel = function() {
        labelModal.activate({
            params: {
                title: $translate.instant('CREATE_NEW_LABEL'),
                create: function(name, color) {
                    // already exist?
                    var result = _.find(authentication.user.Labels, function(label) {
                        return label.Name === name;
                    });

                    if (angular.isUndefined(result)) {
                        labelModal.deactivate();
                        networkActivityTracker.track(
                            Label.save({
                                Name: name,
                                Color: color,
                                Display: 0
                            }).$promise.then(function(result) {
                                if(angular.isDefined(result.Label)) {
                                    notify({message: $translate.instant('LABEL_CREATED'), classes: 'notification-success'});
                                    authentication.user.Labels.push(result.Label);
                                } else {
                                    notify({message: result.Error, classes: 'notification-danger'});
                                    $log.error(result);
                                }
                            }, function(error) {
                                notify({message: 'Error during the label creation request', classes: 'notification-danger'});
                                $log.error(error);
                            })
                        );
                    } else {
                        notify({message: $translate.instant('LABEL_NAME_ALREADY_EXISTS'), classes: 'notification-danger'});
                        labelModal.deactivate();
                    }
                },
                cancel: function() {
                    labelModal.deactivate();
                }
            }
        });
    };

    /**
     * Update the browser title to display the current mailbox and the number of unread messages in this folder
     */
    $scope.updatePageName = function() {
        var name;
        var value;
        var unread = '';
        var mailbox = $state.current.data && $state.current.data.mailbox;

        if(mailbox) {
            // get unread number
            if(mailbox === 'label') {
                value = cacheCounters.unread(id);
            } else {
                value = cacheCounters.unread(CONSTANTS.MAILBOX_IDENTIFIERS[mailbox]);
            }

            if(angular.isDefined(value) && value > 0) {
                unread = '(' + value + ') ';
            }

            // get name
            if(mailbox === 'label') {
                name = _.findWhere(authentication.user.Labels, {ID: $stateParams.label}).Name;
            } else {
                name = mailbox;
            }

            $rootScope.pageName = unread + _.string.capitalize(name);
        }
    };

    /**
     * Manipulates the DOM (labelScroller), sets unread count, and updates the title of the page
     */
    $scope.refreshCounters = function() {
        $scope.labelScroller();
    };

    $scope.updateLabels = function () {
        $scope.labels = authentication.user.Labels;
    };

    /**
     * Animates the inbox refresh icon
     */
    $scope.spinIcon = function() {
        $scope.spinMe = true;
        $timeout(function() {
            $scope.spinMe = false;
        }, 510);
    };

    /**
     * Call event to open new composer
     */
    $scope.compose = function() {
        $rootScope.$broadcast('newMessage');
    };

    /**
     * Returns a hexidecimal string for label colors
     * @return {String} "#333" or "#cc9999"
     */
    $scope.color = function(label) {
        if (label && label.Color) {
            return {
                color: label.Color
            };
        }
        else {
            // TODO log an error here that the label has no color.
            return {
                color: '#CCCCCC'
            };
        }
    };

    $scope.goTo = function(route) {
        var sameFolder = $state.current.name === route;
        var firstPage = $stateParams.page === 1 || angular.isUndefined($stateParams.page);

        $rootScope.$broadcast('goToFolder');
        // I used this instead of ui-sref because ui-sref-options is not synchronized when user click on it.
        if(sameFolder === true && firstPage === true) {
            // Do nothing
            // Chut...
        } else {
            var params = {page: undefined, filter: undefined, sort: undefined};

            $state.go(route, params); // remove the older parameters
        }
    };

    /**
     * Go to label folder + reset parameters
     */
    $scope.goToLabel = function(label) {
        var params = {page: undefined, filter: undefined, sort: undefined, label: label.ID};

        $state.go('secured.label', params);
    };

    /**
     * Return if the folder need to be `active`
     */
    $scope.activeLabel = function(label) {
        return $stateParams.label === label.ID;
    };

    /**
     * Returns a string for the storage bar used for CSS
     * @return {String} "12.5%"
     */
    $scope.sizeBar = function() {
        if (authentication.user.UsedSpace && authentication.user.MaxSpace) {
            return {
                width: (100 * authentication.user.UsedSpace / authentication.user.MaxSpace) + '%'
            };
        }
        else {
            // TODO: error, undefined variables
            return '';
        }
    };

    /**
     * Returns a string for the storage bar
     * @return {String} "12.5%"
     */
    $scope.storagePercentage = function() {
        if (authentication.user.UsedSpace && authentication.user.MaxSpace) {
            return Math.round(100 * authentication.user.UsedSpace / authentication.user.MaxSpace) + '%';
        }
        else {
            // TODO: error, undefined variables
            return '';
        }
    };

    /**
     * Returns a string for the storage bar
     * @return {String} "1.25/10 GB"
     */
    $scope.renderStorageBar = function() {
        return tools.renderStorageBar(authentication.user.UsedSpace, authentication.user.MaxSpace);
    };


    /**
     * "jqyoui-droppable" event handler. Moves or labels messages when drag & dropped
     */
    $scope.onDropMessage = function(event, ui, name) {
        var folders = ['inbox', 'archive', 'spam', 'trash'];

        if(_.contains(folders, name)) { // Is it a folder?
            if($state.is('secured.' + name)) { // Same folder?
                notify($translate.instant('SAME_FOLDER'));
            } else {
                $rootScope.$broadcast('moveMessagesTo', name);
            }
        } else if(name === 'starred') {
            // Just star selected messages
            $rootScope.$broadcast('starMessages');
        } else {
            var LabelID = name;
            // Apply label
            $rootScope.$broadcast('applyLabels', LabelID);
        }
    };

    /**
     * Returns the number of unread messages in a location
     * @param mailbox {String} name indentifier for folder
     * @param id {Integer} labelID for a label
     * @return {Integer}
     */
    $scope.getUnread = function(mailbox, id) {
        var result;
        var count;

        if(mailbox === 'label') {
            count = cacheCounters.unread(id);
        } else {
            count = cacheCounters.unread(CONSTANTS.MAILBOX_IDENTIFIERS[mailbox]);
        }

        if (count === undefined) {
            // THIS IS A BUG. TODO: WHY IS THIS UNDEFINED!
            result = '';
        } else if (count <= 0) {
            result = '';
        } else if (count > 1000) {
            result = '(999+)';
        } else {
            result = '(' + count + ')';
        }

        return result;
    };

    /**
     * Manipulates the DOM height for the scrollable labels area
     * TODO: Should be a directive? This needs to be fixed in v3.
     */
    $scope.labelScroller = function() {

        $('#sidebarLabels').css('height', 'auto');

        var sidebarWrapHeight = $('#sidebarWrap').outerHeight();
        var sidebarMenuHeight = 0;
        var height;

        $('#sidebarWrap > .list-group').each( function() {
            sidebarMenuHeight += $(this).outerHeight();
        });

        if (sidebarMenuHeight > 0) {
            height = (sidebarWrapHeight - sidebarMenuHeight);
        }

        if ($('.storage').is(':visible')) {
            height -= $('.storage').outerHeight();
        }

        $('#sidebarLabels').css('height', height);

    };

    $scope.initialization();
});
