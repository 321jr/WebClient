angular.module('proton.dashboard')
    .directive('subscriptionSection', ($rootScope, CONSTANTS, subscriptionModel, gettextCatalog) => {
        const { MONTHLY, YEARLY, TWO_YEARS } = CONSTANTS.CYCLE;
        const I18N = {
            vpn: gettextCatalog.getString('VPN connections', null),
            addresses: gettextCatalog.getString('addresses', null),
            domain: gettextCatalog.getString('domain', null),
            domains: gettextCatalog.getString('domains', null),
            member: gettextCatalog.getString('user', null),
            members: gettextCatalog.getString('users', null),
            cycles: {
                [MONTHLY]: gettextCatalog.getString('Monthly', null),
                [YEARLY]: gettextCatalog.getString('Annually', null),
                [TWO_YEARS]: gettextCatalog.getString('2-years', null)
            },
            methods: {
                card: gettextCatalog.getString('Credit card', null),
                paypal: 'Paypal'
            }
        };

        const formatSubscription = (sub = {}) => {
            sub.cycle = I18N.cycles[sub.Cycle];
            sub.plans = _.reduce(sub.Plans, (acc, plan) => {
                if (plan.Type === CONSTANTS.PLANS_TYPE.PLAN) {
                    plan.addons = extractAddons(sub.Plans, plan.Name.indexOf('vpn') > -1);
                    acc.push(plan);
                }
                return acc;
            }, []);
            return sub;
        };

        const getFirstMethodType = (methods = []) => ((methods.length) ? I18N.methods[methods[0].Type] : 'None');
        const fromBase = (value) => value / (CONSTANTS.BASE_SIZE ** 3);

        function formatTitle(plan = {}) {
            switch (plan.Name) {
                case '1vpn':
                    plan.Title = `+ ${plan.time * plan.MaxVPN} ${I18N.vpn}`;
                    break;
                case '1gb':
                    plan.Title = `+ ${plan.time * fromBase(plan.MaxSpace)} GB`;
                    break;
                case '5address':
                    plan.Title = `+ ${plan.time * plan.MaxAddresses} ${I18N.addresses}`;
                    break;
                case '1domain':
                    plan.Title = `+ ${plan.time * plan.MaxDomains} ${(plan.time > 1) ? I18N.domains : I18N.domain}`;
                    break;
                case '1member':
                    plan.Title = `+ ${plan.time * plan.MaxMembers} ${(plan.time > 1) ? I18N.members : I18N.member}`;
                    break;
                default:
                    break;
            }
        }

        function extractAddons(plans = [], vpn = false) {
            return _.chain(plans)
                .where({ Type: 0 })
                .reduce((acc, plan) => {
                    if (vpn === (plan.Name.indexOf('vpn') > -1)) {
                        if (acc[plan.Name]) {
                            acc[plan.Name].Amount += plan.Amount;
                            acc[plan.Name].time++;
                        } else {
                            acc[plan.Name] = plan;
                            acc[plan.Name].time = 1;
                        }
                    }

                    return acc;
                }, {})
                .each((plan) => formatTitle(plan))
                .value();
        }

        return {
            scope: { methods: '=' },
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/dashboard/subscriptionSection.tpl.html',
            link(scope) {
                const subscription = subscriptionModel.get();
                const unsubscribe = $rootScope.$on('subscription', (event, { type, data = {} }) => {
                    if (type === 'update') {
                        scope.$applyAsync(() => {
                            scope.subscription = formatSubscription(data.subscription);
                        });
                    }
                });

                scope.subscription = formatSubscription(subscription);
                scope.method = getFirstMethodType(scope.methods);

                scope.$on('$destroy', () => unsubscribe());
            }
        };
    });
