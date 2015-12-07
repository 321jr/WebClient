angular.module("proton.labels", [])

.directive('dropdownLabels', function ($timeout, $q, $rootScope, $filter, authentication) {
    return {
        restrict: 'E',
        templateUrl: 'templates/directives/labels.tpl.html',
        replace: true,
        scope: {
            getMessages: '=messages',
            saveLabels: '=save'
        },
        link: function(scope, element, attrs) {
            $('.open-label').click(function() {
                scope.open();
            });

            scope.open = function() {
                if(angular.isFunction(scope.getMessages) && angular.isFunction(scope.saveLabels)) {
                    var messagesLabel = [];
                    var messages = scope.getMessages();

                    scope.alsoArchive = false;
                    scope.labels = $filter('labels')(angular.copy(authentication.user.Labels));

                    _.each(messages, function(message) {
                        messagesLabel = messagesLabel.concat(_.map(message.LabelIDs, function(id) {
                            return id;
                        }));
                    });

                    messagesLabel = _.uniq(messagesLabel);

                    _.each(scope.labels, function(label) {
                        var count = _.filter(messagesLabel, function(m) {
                            return m === label.ID;
                        }).length;

                        label.Selected = count > 0;
                    });

                    $timeout(function() {
                        $('#searchLabels').focus();
                    });
                }
            };

            scope.color = function(label) {
                return {
                    color: label.Color
                };
            };

            scope.save = function() {
                scope.saveLabels(scope.labels, scope.alsoArchive);
                scope.close();
            };

            scope.close = function() {
                $('[data-toggle="dropdown"]').parent().removeClass('open');
            };

            scope.labelsSelected = function() {
                return _.where(scope.labels, {Selected: true});
            };

            scope.createLabel = function() {
                $rootScope.$broadcast('createLabel');
            };
        }
    };
});
