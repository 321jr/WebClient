/* @ngInject */
function confirmModal(pmModal, gettextCatalog) {
    const I18N = {
        confirm: gettextCatalog.getString('Confirm', null, 'Default text for the confirm button in the confirm modal'),
        cancel: gettextCatalog.getString('Cancel', null, 'Default text for the cancel button in the confirm modal')
    };
    return pmModal({
        controllerAs: 'ctrl',
        templateUrl: 'templates/modals/confirm.tpl.html',
        /* @ngInject */
        controller: function(params, hotkeys) {
            hotkeys.unbind(['enter']);
            this.title = params.title;
            this.message = params.message;
            this.confirmText = params.confirmText || I18N.confirm;
            this.cancelText = params.cancelText || I18N.cancel;
            this.confirm = () => (hotkeys.bind(['enter']), params.confirm());
            this.cancel = () => (hotkeys.bind(['enter']), params.cancel());

            // The button is not directly available
            setTimeout(() => angular.element('#confirmModalBtn').focus(), 100);
        }
    });
}
export default confirmModal;
