/* @ngInject */
function DashboardController(
    $rootScope,
    $scope,
    $stateParams,
    blackFridayModel,
    methods,
    authentication,
    dashboardConfiguration,
    subscriptionModel,
    blackFridayModal
) {
    const scrollToPlans = () => $('.settings').animate({ scrollTop: $('#plans').offset().top }, 1000);
    const updateUser = () => ($scope.isPaidUser = authentication.user.Subscribed);
    const updateMethods = (methods) => ($scope.methods = methods);
    const unsubscribe = $rootScope.$on('updateUser', () => {
        $scope.$applyAsync(() => updateUser());
    });

    if ($stateParams.scroll === true) {
        scrollToPlans();
    }

    updateUser();
    updateMethods(methods);

    dashboardConfiguration.set('cycle', $stateParams.cycle || subscriptionModel.cycle());
    dashboardConfiguration.set('currency', $stateParams.currency || subscriptionModel.currency());

    if (blackFridayModel.isBlackFridayPeriod(true) && !$stateParams.noBlackFridayModal) {
        blackFridayModal.activate({
            params: {
                close() {
                    blackFridayModal.deactivate();
                }
            }
        });
    }

    $scope.$on('$destroy', () => unsubscribe());
}
export default DashboardController;
