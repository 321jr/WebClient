/* @ngInject */
function memberModel($rootScope, memberApi, gettextCatalog, authentication, CONSTANTS) {
    let CACHE = [];
    const { FREE_USER_ROLE, PAID_ADMIN_ROLE, PAID_MEMBER_ROLE, STATUS } = CONSTANTS;
    const I18N = {
        ROLES: {
            [PAID_ADMIN_ROLE]: gettextCatalog.getString('Admin', null, 'User role'),
            [PAID_MEMBER_ROLE]: gettextCatalog.getString('Member', null, 'User role')
        }
    };

    const USER_MEMBER = { Self: 1 };

    const get = () => CACHE;
    const clear = () => (CACHE.length = 0);
    const set = (list = []) => (clear(), CACHE.push(...list));

    const remove = ({ ID }) => memberApi.remove(ID);
    const changeRole = ({ ID }, payload) => memberApi.role(ID, payload);
    const makePrivate = ({ ID }) => memberApi.privatize(ID);
    const login = ({ ID }, params) => memberApi.authenticate(ID, params);
    const formatUserMember = () => {
        _.extend(USER_MEMBER, {
            Name: authentication.user.Name,
            Addresses: authentication.user.Addresses,
            UsedSpace: authentication.user.UsedSpace,
            MaxSpace: authentication.user.MaxSpace
        });
    };

    const fetch = () => {
        formatUserMember();
        return memberApi.query().then((data = {}) => set(expandSelfMember(data.Members)));
    };

    function expandSelfMember(members = []) {
        return _.map(members, (member) => {
            member.toggle = member.Self === 1;
            return member;
        });
    }

    function getUser() {
        formatUserMember();
        return [USER_MEMBER];
    }

    function getAll() {
        const members = authentication.user.Role === FREE_USER_ROLE ? getUser() : get();
        return expandSelfMember(members);
    }

    const getNonPrivate = () => _.filter(getAll(), ({ Private }) => Private === 0);
    const getSelf = () => _.find(getAll(), ({ Self }) => Self === 1);
    const hasAdmins = () => _.some(getAll(), ({ Role }) => Role === PAID_ADMIN_ROLE);
    const getRoles = () => angular.copy(I18N.ROLES);

    /**
     * Refresh the cache based on the eventManager
     * Dispatch an event update at the end of the process
     * @param  {Array}  members List of updates relative to members
     * @return {void}
     */
    const manageCache = (members = []) => {
        const operations = _.reduce(
            members,
            (acc, { Action, Member, ID }) => {
                acc[Action].push({ ID, Member });
                return acc;
            },
            { [STATUS.DELETE]: [], [STATUS.CREATE]: [], [STATUS.UPDATE]: [] }
        );

        operations[STATUS.DELETE].forEach(({ ID }) => {
            const index = _.findIndex(CACHE, { ID });
            index > -1 && CACHE.splice(index, 1);
        });

        operations[STATUS.CREATE].forEach(({ Member }) => {
            CACHE.push(Member);
        });

        operations[STATUS.UPDATE].forEach(({ ID, Member }) => {
            const index = _.findIndex(CACHE, { ID });
            index === -1 && CACHE.push(Member);
            index > -1 && _.extend(CACHE[index], Member);
        });

        CACHE = _.sortBy(CACHE, 'Name');

        $rootScope.$emit('members', {
            type: 'update',
            data: {
                list: CACHE,
                operations
            }
        });
    };

    const isMember = () => authentication.user.Role === PAID_MEMBER_ROLE;

    $rootScope.$on('app.event', (e, { type, data = {} }) => {
        type === 'members' && manageCache(data);
    });

    $rootScope.$on('logout', () => {
        clear();
    });

    return {
        get,
        set,
        fetch,
        clear,
        remove,
        changeRole,
        makePrivate,
        login,
        getAll,
        getNonPrivate,
        hasAdmins,
        getSelf,
        getRoles,
        isMember
    };
}
export default memberModel;
