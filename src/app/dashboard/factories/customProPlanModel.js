/* @ngInject */
function customProPlanModel($rootScope, CONSTANTS, dashboardConfiguration, dashboardModel) {
    const { PLANS, BASE_SIZE, MAX_MEMBER, HUGE_MEMBER } = CONSTANTS;
    const { PLAN, ADDON } = PLANS;
    const { MEMBER } = ADDON;
    const { PROFESSIONAL } = PLAN;
    const SLIDER_TYPES = ['members', 'storage', 'addresses'];

    const fromBase = (value) => value / BASE_SIZE ** 3;
    const CACHE = {};
    const refreshSlider = (type) => $rootScope.$emit('refresh.slider', { type, data: { value: CACHE[type] } });
    const send = () => {
        const { plan } = dashboardModel.get(dashboardConfiguration.cycle());
        const professionalPlan = plan[PROFESSIONAL];

        $rootScope.$emit('dashboard', {
            type: 'change.addon',
            data: { plan: 'professional', addon: 'member', value: CACHE.members - professionalPlan.MaxMembers }
        });
    };

    function needMoreMember() {
        const { plan } = dashboardModel.get(dashboardConfiguration.cycle());
        const professionalPlan = plan[PROFESSIONAL];
        const { professional } = dashboardConfiguration.get();

        return Number(professional.member) + professionalPlan.MaxMembers >= MAX_MEMBER;
    }

    function getSliders() {
        CACHE.maxMembers = needMoreMember() ? HUGE_MEMBER : MAX_MEMBER;

        return _.reduce(
            ['members', 'storage', 'addresses'],
            (acc, type) => {
                acc[type] = getSliderParameters(type);
                return acc;
            },
            {}
        );
    }

    function getEquivalentOptions() {
        const { plan, addons } = dashboardModel.get(dashboardConfiguration.cycle());
        const professionalPlan = plan[PROFESSIONAL];
        const memberAddon = addons[MEMBER];

        return _.range(0, CACHE.maxMembers).map((value) => ({
            members: value * memberAddon.MaxMembers + professionalPlan.MaxMembers,
            storage: value * fromBase(memberAddon.MaxSpace) + fromBase(professionalPlan.MaxSpace),
            addresses: value * memberAddon.MaxAddresses + professionalPlan.MaxAddresses
        }));
    }

    function getSliderParameters(type) {
        const { addons, plan } = dashboardModel.get(dashboardConfiguration.cycle());
        const memberAddon = addons[MEMBER];
        const professionalPlan = plan[PROFESSIONAL];
        const { professional } = dashboardConfiguration.get();
        const options = getEquivalentOptions();
        const option = _.findWhere(options, { members: Number(professional.member) + professionalPlan.MaxMembers });

        let step;
        let start;
        let min;
        let max;

        switch (type) {
            case 'members':
                step = memberAddon.MaxMembers;
                start = option.members;
                min = _.first(options).members;
                max = _.last(options).members;
                break;
            case 'storage':
                step = fromBase(memberAddon.MaxSpace);
                start = option.storage;
                min = _.first(options).storage;
                max = _.last(options).storage;
                break;
            case 'addresses':
                step = memberAddon.MaxAddresses;
                start = option.addresses;
                min = _.first(options).addresses;
                max = _.last(options).addresses;
                break;
        }

        return {
            value: start,
            options: {
                type,
                animate: false,
                tooltips: true,
                connect: [true, false],
                start,
                step,
                range: { min, max },
                pips: {
                    mode: 'positions',
                    values: [0, 25, 50, 75, 100],
                    density: 4,
                    stepped: true
                },
                format: {
                    to(value) {
                        return `${Number(value).toFixed()}`;
                    },
                    from(value) {
                        return value;
                    }
                }
            }
        };
    }

    function refreshSliders(type, value) {
        const options = getEquivalentOptions();
        const { members, storage, addresses } = _.findWhere(options, { [type]: value });

        CACHE.members = members;
        CACHE.storage = storage;
        CACHE.addresses = addresses;

        refreshSlider('members');
        refreshSlider('storage');
        refreshSlider('addresses');
    }

    function increaseRanges() {
        CACHE.maxMembers = HUGE_MEMBER; // Important to have it before getEquivalentOptions()

        const options = getEquivalentOptions();
        const min = _.first(options);
        const max = _.last(options);

        SLIDER_TYPES.forEach((type) => {
            $rootScope.$emit('update.slider.options', {
                type,
                data: {
                    options: {
                        range: {
                            min: min[type],
                            max: max[type]
                        }
                    }
                }
            });
        });
    }

    $rootScope.$on('slider.updated', (event, { type, data = {} }) => {
        if (_.contains(['members', 'storage', 'addresses'], type)) {
            refreshSliders(type, data.value);
        }
    });

    return { init: angular.noop, getSliders, send, increaseRanges, needMoreMember };
}
export default customProPlanModel;
