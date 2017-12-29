/* @ngInject */
function generateModal(
    pmModal,
    authentication,
    networkActivityTracker,
    Key,
    pmcw,
    notification,
    CONSTANTS,
    generateKeyModel,
    gettextCatalog,
    setupKeys,
    addressWithoutKeys
) {
    const STATE = generateKeyModel.getStates();
    const I18N = {
        success(email) {
            return gettextCatalog.getString('Key created for {{email}}', { email }, 'Generate key modal');
        },
        title: gettextCatalog.getString('Setting up your Addresses', null, 'Title'),
        message: gettextCatalog.getString(
            'Before you can start sending and receiving emails from your new addresses you need to create encryption keys for them. 4096-bit keys only work on high performance computers. For most users, we recommend using 2048-bit keys.',
            null,
            'Info'
        )
    };

    return pmModal({
        controllerAs: 'ctrl',
        templateUrl: 'templates/modals/generate.tpl.html',
        /* @ngInject */
        controller: function(params, $scope) {
            this.size = CONSTANTS.ENCRYPTION_DEFAULT; // To match the [radio] value
            this.process = false;
            this.title = params.title || I18N.title;
            this.message = params.message || I18N.message;
            // Kill this for now
            this.askPassword = false; // = params.password.length === 0;
            this.password = params.password;
            this.cancel = () => params.close();
            this.addresses = _.map(params.addresses, (adr) => ((adr.state = STATE.QUEUED), adr));

            $scope.$on('updateUser', () => {
                !addressWithoutKeys.fromUser().length && this.cancel();
            });

            this.submit = () => {
                this.process = true;
                const promise = Promise.all(
                    _.map(this.addresses, (address) =>
                        generateKeyModel.generate({
                            address,
                            numBits: this.size,
                            passphrase: this.password,
                            organizationKey: params.organizationKey,
                            memberMap: params.memberMap
                        })
                    )
                )
                    .then((addresses = []) => addresses.forEach(({ Email }) => notification.success(I18N.success(Email))))
                    .then(params.onSuccess)
                    .catch((e) => {
                        params.close(this.addresses, this.password);
                        throw e;
                    });

                networkActivityTracker.track(promise);
            };
        }
    });
}
export default generateModal;
