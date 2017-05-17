angular.module('proton.conversation')
.directive('conversationView', ($state, $stateParams, cache, tools) => ({
    restrict: 'E',
    replace: true,
    template: '<div class="conversationView-container"><conversation ng-if="conversation" data-conversation="conversation"></conversation></div>',
    link(scope) {
        const conversationID = $stateParams.id;
        const ID = tools.currentLocation();

        function back() {
            const route = $state.$current.name.replace('.element', '');
            $state.go(route, { id: null });
        }

        cache.getConversation(conversationID)
            .then((conversation) => {
                const labelID = _.findWhere(conversation.Labels, { ID });
                if (labelID || $state.includes('secured.search.**')) {
                    return scope.conversation = conversation;
                }
                return back();
            });
    }
}));
