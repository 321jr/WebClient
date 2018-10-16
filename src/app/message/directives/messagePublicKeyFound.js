import { SEND_TYPES } from '../../constants';
import keyAlgorithm from '../../keys/helper/keyAlgorithm';

/* @ngInject */
function messagePublicKeyFound(
    dispatchers,
    trustPublicKeyModal,
    pmcw,
    networkActivityTracker,
    attachedPublicKey,
    gettextCatalog,
    notification,
    eventManager
) {
    const I18N = {
        SUCCES_MESSAGE: gettextCatalog.getString('Public Key trusted', null, 'Success'),
        ERROR_MESSAGE: gettextCatalog.getString('Error while adding the public key to the contacts', null, 'Error')
    };

    return {
        replace: true,
        restrict: 'E',
        templateUrl: require('../../../templates/message/messagePublicKeyFound.tpl.html'),
        link(scope, el) {
            const { dispatcher } = dispatchers(['message']);
            const element = el[0];

            const trust = () => {
                const keyInfoPromise = pmcw.keyInfo(scope.message.attachedPublicKey);
                const addressesPromise = keyInfoPromise.then((keyInfo) =>
                    attachedPublicKey.extractAddresses(scope.message, keyInfo)
                );
                const promises = Promise.all([keyInfoPromise, addressesPromise]).then(([keyInfo, addresses]) => {
                    if (addresses.length === 0) {
                        return;
                    }
                    keyInfo.algType = keyAlgorithm.describe(keyInfo);
                    trustPublicKeyModal.activate({
                        params: {
                            addresses,
                            isInternal: scope.message.IsEncrypted === SEND_TYPES.SEND_PM,
                            keyInfo,
                            submit(addresses) {
                                const promise = attachedPublicKey.attachPublicKey(
                                    scope.message.attachedPublicKey,
                                    addresses
                                );

                                promise
                                    .then((attached) => {
                                        if (!attached) {
                                            return;
                                        }

                                        // makes sure the contactEmails are updated.
                                        const refreshPromise = eventManager
                                            .call()
                                            // trigger re-verification, checking if the current banner should still be shown etcetera.
                                            .then(() =>
                                                dispatcher.message('reload', {
                                                    conversationID: scope.message.ConversationID
                                                })
                                            )
                                            .then(() => notification.success(I18N.SUCCES_MESSAGE));
                                        networkActivityTracker.track(refreshPromise);
                                        return refreshPromise;
                                    })
                                    .catch(() => notification.error(I18N.ERROR_MESSAGE));
                                trustPublicKeyModal.deactivate();
                            },
                            cancel() {
                                trustPublicKeyModal.deactivate();
                            }
                        }
                    });
                });
                networkActivityTracker.track(promises);

                // no-keys && external user => confirm => ask for encryption
                // keys available ask if primary key => confirm => ask to use as main encryption
            };

            const button = element.querySelector('.public-key-found-button');
            button.addEventListener('click', trust);

            scope.$on('$destroy', () => {
                button.removeEventListener('click', trust);
            });
        }
    };
}
export default messagePublicKeyFound;
