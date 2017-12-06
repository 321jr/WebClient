/* @ngInject */
function Contact($http, $rootScope, CONSTANTS, url, chunk, contactEncryption, sanitize) {
    const requestURL = url.build('contacts');
    const { CONTACTS_LIMIT_UPLOAD, EXPORT_CONTACTS_LIMIT } = CONSTANTS;

    /**
     * Clean contact datas
     * @param  {String} data
     * @return {Object}
     */
    function clearContacts(contacts = []) {
        return contacts.map((contact) => {
            contact.Email = sanitize.input(contact.Email);
            contact.Name = sanitize.input(contact.Name);
            return contact;
        });
    }

    function request(route, params = {}) {
        return $http.get(route, { params }).then(({ data = {} } = {}) => {
            if (data.Error) {
                throw new Error(data.Error);
            }
            return data;
        });
    }

    async function queryContacts(route = '', { PageSize, key = '' }) {
        const data = await request(route, { PageSize });
        const promises = [Promise.resolve(data[key])];
        const n = Math.ceil(data.Total / PageSize) - 1; // We already load 1 or 2 pages

        if (n > 0) {
            _.times(n, (index) => {
                const promise = request(route, {
                    PageSize,
                    Page: index + 1
                }).then((data) => data[key]);
                promises.push(promise);
            });
        }

        const list = await Promise.all(promises);
        return list.reduce((acc, item) => acc.concat(item), []);
    }

    /**
     * Get a list of Contact Emails right after Login
     * @return {Promise}
     */
    function hydrate(PageSize = CONSTANTS.CONTACT_EMAILS_LIMIT) {
        return queryContacts(requestURL('emails'), {
            key: 'ContactEmails',
            PageSize
        }).then(clearContacts);
    }

    /**
     * Get a list of Contacts minus their Data
     * @return {Promise}
     */
    const all = (PageSize = CONSTANTS.CONTACTS_LIMIT) => {
        return queryContacts(requestURL(), {
            key: 'Contacts',
            PageSize
        });
    };
    /**
     * Get a list of Contacts minus their Data
     * @return {Promise}
     */
    const load = (type = '') => {
        const url = type ? requestURL(type) : requestURL();
        const PageSize = type ? CONSTANTS.CONTACT_EMAILS_LIMIT : CONSTANTS.CONTACTS_LIMIT / 10;
        return request(url, { PageSize });
    };

    /**
     * Get full Contact
     * @param {String} contactID
     * @return {Promise}
     */
    function get(contactID) {
        return request(requestURL(contactID))
            .then(({ Contact }) => contactEncryption.decrypt([Contact]))
            .then((contacts) => contacts[0]);
    }

    function handleUpload(result = []) {
        const { created = [], total = 0, errors = [] } = _.reduce(
            result,
            (acc, { data = {} } = {}) => {
                if (data.Error) {
                    acc.errors.push({
                        code: data.Code,
                        error: data.Error
                    });

                    return acc;
                }

                _.each(data.Responses, ({ Response = {} }) => {
                    acc.total++;

                    if (Response.Error) {
                        acc.errors.push({
                            code: Response.Code,
                            name: Response.Name,
                            emails: Response.Emails,
                            error: Response.Error
                        });
                    }

                    if (Response.Code === 1000) {
                        acc.created.push(Response.Contact);
                    }
                });

                return acc;
            },
            { created: [], total: 0, errors: [] }
        );

        return { created, total, errors };
    }

    function uploadContacts(cards = [], total) {
        let progress = 50; // NOTE We start at 50% because the first part (encryption) is already done
        const chunkCards = chunk(cards, CONTACTS_LIMIT_UPLOAD);
        const promises = _.map(chunkCards, (Contacts) => {
            const params = { Contacts, Groups: 1, Overwrite: 1, Labels: 1 };

            return $http.post(requestURL(), params).then((data) => {
                progress += Math.floor(Contacts.length * 50 / total);
                $rootScope.$emit('progressBar', { type: 'contactsProgressBar', data: { progress } });

                return data;
            });
        });

        return Promise.all(promises).then(handleUpload);
    }

    /**
     * Create new contacts
     * @param {Array} contacts
     * @return {Promise}
     */
    function add(contacts = []) {
        return contactEncryption
            .encrypt(contacts)
            .then((result = []) => uploadContacts(result, contacts.length))
            .then((data) => {
                $rootScope.$emit('contacts', { type: 'contactsUpdated' });
                return data;
            });
    }

    /**
     * Update a contact
     * @param {Object} contact
     * @return {Promise}
     */
    function update(contact) {
        return contactEncryption.encrypt([contact]).then((contacts) => {
            return $http.put(requestURL(contact.ID), contacts[0]).then(({ data = {} } = {}) => {
                if (data.Error) {
                    throw new Error(data.Error);
                }
                // NOTE We need to pass the cards to update the encrypted icon in the contact view
                data.cards = contacts[0].Cards;
                return data;
            });
        });
    }

    /**
     * Delete array of contacts
     * @param {Array} contacts
     * @return {Promise}
     */
    const remove = (contacts) => $http.put(requestURL('delete'), contacts);

    /**
     * Delete all contacts
     * @return {Promise}
     */
    const clear = () => $http.delete(requestURL());

    /**
     * Get all ContactData's for export
     * @return {Promise}
     */
    function exportAll(PageSize = EXPORT_CONTACTS_LIMIT) {
        return queryContacts(requestURL('export'), {
            key: 'Contacts',
            PageSize
        }).then((contacts) => contactEncryption.decrypt(contacts));
    }

    /**
     * Get groups and their emails
     * @return {Promise}
     */
    const groups = () => $http.get(requestURL('groups'));

    return { hydrate, all, get, add, update, remove, clear, exportAll, groups, load };
}
export default Contact;
