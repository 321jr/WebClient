/* @ngInject */
function toggleExpand() {
    const EXPAND_CLASS = 'fa-chevron-down';
    const COLLAPSE_CLASS = 'fa-chevron-right';
    return {
        restrict: 'E',
        replace: true,
        template: '<button class="pm_button link">{{text}} <i class="fa"></fa></button>',
        scope: { model: '=', text: '@' },
        link(scope, element) {
            const $i = element[0].querySelector('.fa');
            scope.model.toggle = !!scope.model.toggle;

            toggleClass();

            function toggleClass() {
                const toAdd = scope.model ? EXPAND_CLASS : COLLAPSE_CLASS;
                const toRemove = scope.model ? COLLAPSE_CLASS : EXPAND_CLASS;
                $i.classList.remove(toRemove);
                $i.classList.add(toAdd);
            }

            function onClick() {
                scope.$applyAsync(() => {
                    scope.model.toggle = !scope.model.toggle;
                    toggleClass();
                });
            }

            element[0].addEventListener('click', onClick);

            scope.$on('$destroy', () => {
                element[0].removeEventListener('click', onClick);
            });
        }
    };
}
export default toggleExpand;
