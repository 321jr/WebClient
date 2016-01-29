angular.module("proton.controllers.Settings")

.controller('DomainsController', function(
    $q,
    $rootScope,
    $scope,
    $translate,
    Address,
    addressModal,
    buyDomainModal,
    confirmModal,
    dkimModal,
    dmarcModal,
    Domain,
    domainModal,
    domains,
    Member,
    members,
    mxModal,
    networkActivityTracker,
    notify,
    organization,
    Organization,
    spfModal,
    verificationModal
) {
    // Variables
    $scope.organization = organization.data.Organization;
    $scope.domains = domains.data.Domains;
    $scope.members = members.data.Members;
    $scope.addressMemberID = $scope.members[0];

    // Listeners
    $scope.$on('domain', function(event, domain) {
        $scope.closeModals();
        $scope.addDomain(domain);
    });

    $scope.$on('spf', function(event, domain) {
        $scope.closeModals();
        $scope.spf(domain);
    });

    $scope.$on('address', function(event, domain) {
        $scope.closeModals();
        $scope.addAddress(domain);
    });

    $scope.$on('mx', function(event, domain) {
        $scope.closeModals();
        $scope.mx(domain);
    });

    $scope.$on('dkim', function(event, domain) {
        $scope.closeModals();
        $scope.dkim(domain);
    });

    $scope.$on('verification', function(event, domain) {
        $scope.closeModals();
        $scope.verification(domain);
    });

    $scope.$on('dmarc', function(event, domain) {
        $scope.closeModals();
        $scope.dmarc(domain);
    });

    /**
     * Open modal process to add a custom domain.
     * @param {Object} domain
     * Docs: https://github.com/ProtonMail/Slim-API/blob/develop_domain/api-spec/pm_api_domains.md
     */
    $scope.wizard = function(domain) {
        // go through all steps and show the user the step they need to complete next. allow for back and next options.
        // if domain has a name, we can skip the first step
        /* steps:
            1. verify ownership with txt record
            2. add addresses
            3. add mx
            4. add spf
            5. add dkim
            6. add dmarc
        */
        if (!domain.DomainName) {
            // show first step
            $scope.addDomain();
        } else if ((domain.VerifyState !== 2)) {
            $scope.verification(domain);
        } else if (domain.Addresses.length === 0) {
            $scope.addAddress(domain);
        } else if (domain.MxState !== 3) {
            $scope.mx(domain);
        } else if (domain.SpfState !== 3) {
            $scope.spf(domain);
        } else if (domain.DkimState !== 4) {
            $scope.dkim(domain);
        } else if (domain.DmarcState !== 3) {
            $scope.dmarc(domain);
        }
    };

    /**
     * Open modal process to buy a new domain
     */
    $scope.buyDomain = function() {
        buyDomainModal.activate({
            params: {
                submit: function(datas) {
                    console.log(datas);
                    buyDomainModal.deactivate();
                },
                cancel: function() {
                    buyDomainModal.deactivate();
                }
            }
        });
    };

    /**
     * Delete domain
     * @param {Object} domain
     */
    $scope.deleteDomain = function(domain) {
        var index = $scope.domains.indexOf(domain);

        confirmModal.activate({
            params: {
                title: $translate.instant('DELETE_DOMAIN'),
                message: $translate.instant('Are you sure you want to delete this domain? This action will also delete addresses linked.'),
                confirm: function() {
                    networkActivityTracker.track(Domain.delete(domain.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            notify({message: $translate.instant('DOMAIN_DELETED'), classes: 'notification-success'});
                            $scope.domains.splice(index, 1); // Remove domain in interface
                            confirmModal.deactivate();
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('ERROR_DURING_DELETION'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('ERROR_DURING_DELETION'), classes: 'notification-danger'});
                    }));
                },
                cancel: function() {
                    confirmModal.deactivate();
                }
            }
        });
    };

    /**
     * Delete address
     * @param {Object} address
     * @param {Object} domain
     */
    $scope.deleteAddress = function(address, domain) {
        var index = domain.Addresses.indexOf(address);

        confirmModal.activate({
            params: {
                title: $translate.instant('DELETE_ADDRESS'),
                message: $translate.instant('Are you sure you want to delete this address?'),
                confirm: function() {
                    networkActivityTracker.track(Address.delete(address.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            notify({message: $translate.instant('ADDRESS_DELETED'), classes: 'notification-success'});
                            domain.Addresses.splice(index, 1); // Remove address in interface
                            confirmModal.deactivate();
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('ERROR_DURING_DELETION'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('ERROR_DURING_DELETION'), classes: 'notification-danger'});
                    }));
                },
                cancel: function() {
                    confirmModal.deactivate();
                }
            }
        });
    };

    /**
     * Open modal process to add a custom domain
     */
    $scope.addDomain = function() {
        domainModal.activate({
            params: {
                step: 1,
                submit: function(name) {
                    networkActivityTracker.track(Domain.create({Name: name}).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            notify({message: $translate.instant('DOMAIN_CREATED'), classes: 'notification-success'});
                            $scope.domains.push(result.data.Domain);
                            domainModal.deactivate();
                            // open the next step
                            $scope.verification(result.data.Domain);
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('ERROR_DURING_CREATION'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('ERROR_DURING_CREATION'), classes: 'notification-danger'});
                    }));
                },
                cancel: function() {
                    domainModal.deactivate();
                }
            }
        });
    };

    /**
     * Refresh status for a domain
     * @param {Object} domain
     */
    $scope.refreshStatus = function(domains) {
        networkActivityTracker.track(Domain.query().then(function(result) {
            if(angular.isDefined(result.data) && result.data.Code === 1000) {
                $scope.domains = result.data.Domains;
            } else {
                notify({message: $translate.instant('ERROR_WITH_DOMAIN'), classes: 'notification-danger'});
            }
        }));
    };

    /**
     * Open verification modal
     * @param {Object} domain
     */
    $scope.verification = function(domain) {
        var index = $scope.domains.indexOf(domain);

        verificationModal.activate({
            params: {
                domain: domain,
                step: 2,
                submit: function() {
                    networkActivityTracker.track(Domain.get(domain.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            // check verification code
                            // 0 is default, 1 is has code but wrong, 2 is good
                            switch (result.data.Domain.VerifyState) {
                                case 0:
                                    notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                                    break;
                                case 1:
                                    notify({
                                        message: $translate.instant('HAS_CODE_BUT_WRONG'),
                                        classes: 'notification-danger',
                                        duration: 30000
                                    });
                                    break;
                                case 2:
                                    notify({message: $translate.instant('DOMAIN_VERIFIED'), classes: 'notification-success'});
                                    $scope.domains[index] = result.data.Domain;
                                    verificationModal.deactivate();
                                    // open the next step
                                    $scope.addAddress(result.data.Domain);
                                    break;
                                default:
                                    break;
                            }
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                    }));
                },
                next: function() {
                    $scope.addAddress(domain);
                },
                close: function() {
                    verificationModal.deactivate();
                }
            }
        });
    };

    /**
     * Open modal to add a new address
     */
    $scope.addAddress = function(domain) {
        var index = $scope.domains.indexOf(domain);

        addressModal.activate({
            params: {
                step: 3,
                domain: domain,
                members: $scope.members,
                add: function(address, member) {
                    networkActivityTracker.track(
                        Address.create({
                            Local: address, // local part
                            Domain: domain.DomainName,
                            MemberID: member.ID // either you custom domain or a protonmail domain
                        })
                    ).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            notify({message: $translate.instant('ADDRESS_ADDED'), classes: 'notification-success'});
                            domain.Addresses.push(result.data.Address);
                            addressModal.deactivate();
                            $scope.addAddress(domain);
                        } else if(angular.isDefined(result.data) && result.data.Code === 31006) {
                            notify({message: $translate.instant('DOMAIN_NOT_FOUND'), classes: 'notification-danger'});
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('ADDRESS_CREATION_FAILED'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('ADDRESS_CREATION_FAILED'), classes: 'notification-danger'});
                    });
                },
                next: function() {
                    addressModal.deactivate();
                    $scope.dmarc(domain);
                },
                cancel: function() {
                    addressModal.deactivate();
                }
            }
        });
    };

    /**
     * Open MX modal
     * @param {Object} domain
     */
    $scope.mx = function(domain) {
        var index = $scope.domains.indexOf(domain);

        mxModal.activate({
            params: {
                domain: domain,
                step: 4,
                verify: function() {
                    networkActivityTracker.track(Domain.get(domain.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            // check verification code
                            // 0 is default, 1 and 2 has us but priority is wrong, 3 is good
                            switch (result.data.Domain.MxState) {
                                case 0:
                                    notify({message: $translate.instant('MX_NOT_FOUND'), classes: 'notification-danger'});
                                    break;
                                case 1:
                                case 2:
                                    notify({message: $translate.instant('PRIORITY_IS_WRONG'), classes: 'notification-danger'});
                                    break;
                                case 3:
                                    notify({message: $translate.instant('MX_VERIFIED'), classes: 'notification-success'});
                                    $scope.domains[index] = result.data.Domain;
                                    // open the next step
                                    $scope.spf(result.data.Domain);
                                    break;
                                default:
                                    break;
                            }
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                    }));
                },
                submit: function() {
                    mxModal.deactivate();
                },
                close: function() {
                    mxModal.deactivate();
                }
            }
        });
    };

    /**
     * Open SPF modal
     * @param {Object} domain
     */
    $scope.spf = function(domain) {
        var index = $scope.domains.indexOf(domain);

        spfModal.activate({
            params: {
                domain: domain,
                step: 5,
                verify: function() {
                    networkActivityTracker.track(Domain.get(domain.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            // check verification code
                            // 0 is default, 1 and 2 means detected a record but wrong, 3 is good
                            switch (result.data.Domain.SpfState) {
                                case 0:
                                    notify({message: $translate.instant('SPF_NOT_FOUND'), classes: 'notification-danger'});
                                    break;
                                case 1:
                                case 2:
                                    notify({message: $translate.instant('DETECTED_RECORD_BUT_WRONG'), classes: 'notification-danger'});
                                    break;
                                case 3:
                                    notify({message: $translate.instant('SPF_VERIFIED'), classes: 'notification-success'});
                                    $scope.domains[index] = result.data.Domain;
                                    // open the next step
                                    $scope.dkim(result.data.Domain);
                                    break;
                                default:
                                    break;
                            }
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                    }));
                },
                submit: function() {
                    spfModal.deactivate();
                },
                close: function() {
                    spfModal.deactivate();
                }
            }
        });
    };

    /**
     * Open DKIM modal
     * @param {Object} domain
     */
    $scope.dkim = function(domain) {
        var index = $scope.domains.indexOf(domain);

        dkimModal.activate({
            params: {
                domain: domain,
                step: 6,
                verify: function() {
                    networkActivityTracker.track(Domain.get(domain.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            // check dkim code
                            // 0 is default, 1 and 2 means detected record but wrong, 3 means key is wrong, 4 is good
                            switch (result.data.Domain.DkimState) {
                                case 0:
                                    notify({message: $translate.instant('DKIM_NOT_FOUND'), classes: 'notification-danger'});
                                    break;
                                case 1:
                                case 2:
                                    notify({message: $translate.instant('DETECTED_RECORD_BUT_WRONG'), classes: 'notification-danger'});
                                    break;
                                case 3:
                                    notify({message: $translate.instant('KEY_IS_WRONG'), classes: 'notification-danger'});
                                    break;
                                case 4:
                                    notify({message: $translate.instant('DKIM_VERIFIED'), classes: 'notification-success'});
                                    $scope.domains[index] = result.data.Domain;
                                    // open the next step
                                    $scope.dmarc(result.data.Domain);
                                    break;
                                default:
                                    break;
                            }
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                    }));
                },
                submit: function() {
                    dkimModal.deactivate();
                },
                close: function() {
                    dkimModal.deactivate();
                }
            }
        });
    };

    /**
     * Open DMARC modal
     * @param {Object} domain
     */
    $scope.dmarc = function(domain) {
        var index = $scope.domains.indexOf(domain);

        dmarcModal.activate({
            params: {
                domain: domain,
                step: 7,
                verify: function() {
                    networkActivityTracker.track(Domain.get(domain.ID).then(function(result) {
                        if(angular.isDefined(result.data) && result.data.Code === 1000) {
                            // check dmarc code
                            // 0 is default, 1 and 2 means detected record but wrong, 3 is good
                            switch (result.data.Domain.DmarcState) {
                                case 0:
                                    notify({message: $translate.instant('DMARC_NOT_FOUND'), classes: 'notification-danger'});
                                    break;
                                case 1:
                                case 2:
                                    notify({message: $translate.instant('DETECTED_RECORD_BUT_WRONG'), classes: 'notification-danger'});
                                    break;
                                case 3:
                                    notify({message: $translate.instant('DMARC_VERIFIED'), classes: 'notification-danger'});
                                    $scope.domains[index] = result.data.Domain;
                                    break;
                                default:
                                    break;
                            }
                        } else if(angular.isDefined(result.data) && result.data.Error) {
                            notify({message: result.data.Error, classes: 'notification-danger'});
                        } else {
                            notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                        }
                    }, function(error) {
                        notify({message: $translate.instant('VERIFICATION_FAILED'), classes: 'notification-danger'});
                    }));
                },
                submit: function() {
                    dmarcModal.deactivate();
                },
                close: function() {
                    dmarcModal.deactivate();
                }
            }
        });
    };

    /**
     * Close all verification modals
     */
    $scope.closeModals = function() {
        domainModal.deactivate();
        verificationModal.deactivate();
        dkimModal.deactivate();
        dmarcModal.deactivate();
        spfModal.deactivate();
        mxModal.deactivate();
        addressModal.deactivate();
    };

    /**
     * Initialize user model value (select)
     * @param {Object} address
     */
    $scope.initMember = function(address) {
        _.each($scope.members, function(member) {
            var found = _.findWhere(member.Addresses, {ID: address.ID});

            if(angular.isDefined(found)) {
                address.select = member;
            }
        });
    };

    /**
     * Change user model value (select)
     */
    $scope.changeMember = function(address) {

    };
});
