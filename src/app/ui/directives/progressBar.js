angular.module('proton.ui')
    .directive('progressBar', ($rootScope) => {
        return {
            restrict: 'E',
            replace: true,
            template: '<progress class="progressBar-container"></progress>',
            scope: {},
            compile(element, { id = 'progress', max = 100 }) {
                element[0].value = 1;
                element[0].max = max;

                return (scope) => {
                    const unsubscribe = $rootScope.$on('progressBar', (event, { type = '', data = {} }) => {
                        const { progress = 0 } = data;

                        if (id === type) {
                            element[0].value = +progress;
                        }
                    });

                    scope.$on('$destroy', unsubscribe);
                };
            }
        };
    });
