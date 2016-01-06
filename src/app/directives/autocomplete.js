angular.module('proton.autocomplete', [])
.constant("regexEmail", /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/gi)
.directive('autocomplete', function ($timeout, $filter, regexEmail, authentication) {
    return {
        restrict: 'E',
        templateUrl: 'templates/directives/autocomplete.tpl.html',
        replace: true,
        scope: {
            emails: '='
        },
        link: function (scope, element, attrs) {
            // Constants
            var TAB_KEY = 9;
            var ENTER_KEY = 13;
            var BACKSPACE_KEY = 8;
            var UP_KEY = 38;
            var DOWN_KEY = 40;
            var ESC_KEY = 27;
            var SPACE_KEY = 32;

            // Variables
            scope.params = {
                contactsFiltered: [],
                newValue: '',
                selected: null
            };

            // Helpers
            var buildLabel = function(label, value) {
                var result;

                if(label.length > 0) {
                    result = label;
                } else {
                    result = value;
                }

                return result;
            };

            var buildValue = function(label, value) {
                var result;

                if(label.length > 0) {
                    result = label + ' <' + value + '>';
                } else {
                    result = value;
                }

                return result;
            };

            /**
             * Clean new value submited
             */
            var clean = function(value) {
                return value
                    .replace(/</g, '')
                    .replace(/>/g, '')
                    .replace(/"/g, '')
                    .replace(/,/g, '')
                    .trim();
            };

            var matchEmail = function(value) {
                var emails = [];
                var result = value.match(regexEmail);

                if(result) {
                    emails = result;
                }

                return emails;
            };

            var getEmails = function(value) {
                var values = matchEmail(value);
                var emails = [];

                if(values) {
                    var tempValue = value;

                    emails = scope.emails;

                    for (var i = 0; i < values.length; i++) {
                        if(tempValue) {
                            var email = clean(values[i]);
                            var arrayValue = tempValue.split(email);
                            var label = clean(arrayValue[0]);
                            var contact = {
                                Address: email,
                                Name: buildLabel(label, email)
                            };

                            emails.push(contact);
                            tempValue = arrayValue[1];
                        }
                    }
                }

                return emails;
            };

            /**
             * Highlight value searched in the autocompletion
             */
            var highlight = function(string, word) {
        		var regex = new RegExp('(' + word + ')', 'gi');

        		return string.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(regex, "<strong>$1</strong>");
        	};

            var createNewInput = function() {
                $timeout(function() {
                    scope.params.newValue = '';
                    scope.onChange();
                });

                $timeout(function() {
                    angular.element(element).find('input.new-value-email').focus();
                });
            };

            // Functions
            /**
             * Function called at the initialization of this directive
             */
            scope.initialization = function() {
                scope.emails = scope.emails || [];
                createNewInput();
            };
            /**
             * Submit a new address
             */
            scope.onSubmit = function() {
                if(scope.params.selected !== null) {
                    scope.onAddEmail(scope.params.contactsFiltered[scope.params.selected]);
                } else if(scope.params.newValue.length > 0) {
                    var emails = getEmails(scope.params.newValue);

                    if(emails.length > 0) {
                        scope.emails = _.union(scope.emails, emails);
                    }

                    scope.params.newValue = '';
                    scope.onChange();
                }
            };

            scope.onRemove = function(index) {
                scope.emails.splice(index, 1);
                scope.params.newValue = '';
                scope.onChange();
            };

            scope.onMouseDown = function(event) {
                scope.onClick(event);
            };

            scope.onClick = function(event) {
                if(event.target === element[0].firstElementChild) {
                    createNewInput();
                }
            };

            scope.onAddEmail = function(email) {
                var index = scope.emails.indexOf(email);

                if(index === -1) {
                    scope.emails.push(email);
                    scope.params.newValue = '';
                    scope.onChange();
                }
            };

            scope.onClose = function() {
                scope.params.selected = null;
            };

            scope.onOpen = function() {
                scope.params.selected = 0;
            };

            scope.onChange = function() {
                var contacts = _.map(authentication.user.Contacts, function(contact) {
                    return { Name: contact.Name, Address: contact.Email };
                });
                var byName = $filter('filter')(contacts, {Name: scope.params.newValue});
                var byAddress = $filter('filter')(contacts, {Address: scope.params.newValue});
                var list = $filter('limitTo')(_.union(byName, byAddress), 10); // We limit the number of contact by 10

                if(scope.params.newValue.length > 0) {
                    scope.params.contactsFiltered = list;
                } else {
                    scope.params.contactsFiltered = [];
                }

                if(scope.params.contactsFiltered.length > 0) {
                    scope.onOpen();
                } else {
                    scope.onClose();
                }
            };

            scope.onKeyDown = function(event, email) {
                switch (event.keyCode) {
                    case BACKSPACE_KEY:
                        var value = scope.params.newValue;
                        var emails = scope.emails;

                        if(value.length === 0 && emails.length > 0) {
                            this.onRemove(emails.length - 1);
                        }
                        break;
                    case DOWN_KEY:
                    case UP_KEY:
                    case TAB_KEY:
                    case ENTER_KEY:
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    default:
                        break;
                }
            };

            scope.onKeyUp = function(event, email) {
                switch (event.keyCode) {
                    case ENTER_KEY:
                        scope.onSubmit();
                        break;
                    case TAB_KEY:
                        if(scope.params.newValue.length > 0) {
                            scope.onSubmit();
                        } else {
                            // Focus next input (autocomplete or subject)
                            angular.element(element).parent().nextAll('.row:visible:first').find('input').focus();
                        }
                        break;
                    case DOWN_KEY:
                        if(scope.params.contactsFiltered.length > 0) {
                            if(scope.params.selected === null) {
                                 scope.params.selected = 0;
                            } else if(scope.params.contactsFiltered.length > 0 && scope.params.selected < scope.params.contactsFiltered.length - 1) {
                                  scope.params.selected++;
                            }
                        }
                        break;
                    case UP_KEY:
                        if(scope.params.contactsFiltered.length > 0) {
                            if(scope.params.selected > 1) {
                                scope.params.selected--;
                            } else {
                                scope.params.selected = 0;
                            }
                        }
                        break;
                    default:
                        break;
                }
            };
            // Initialization
            scope.initialization();
        }
    };
});
