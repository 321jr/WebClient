angular.module('proton.cache', [])

.service('cache', (
    $interval,
    $q,
    $rootScope,
    $state,
    $stateParams,
    authentication,
    CONSTANTS,
    Conversation,
    Message,
    cacheCounters,
    networkActivityTracker,
    tools
) => {
    const api = {};
    let messagesCached = []; // In this array we store the messages cached
    let conversationsCached = []; // In this array we store the conversations cached
    let dispatcher = [];
    const timeCached = {};
    const DELETE = 0;
    const CREATE = 1;
    const UPDATE_DRAFT = 2;
    const UPDATE_FLAGS = 3;

    $interval(expiration, 1000, 0, false);

    /**
    * Save conversations in conversationsCached and add loc in attribute
    * @param {Array} conversations
    */
    const storeConversations = function (conversations) {
        _.each(conversations, (conversation) => {
            updateConversation(conversation);
        });
    };

    /**
     * Save messages in cache
     * @param {Array} messages
     */
    const storeMessages = function (messages) {
        _.chain(messages)
            .map((message) => new Message(message))
            .each(updateMessage);
    };

    /**
     * Store time for conversation per location
     * @param {String} conversationId
     * @param {String} loc
     * @param {Integer} time
     */
    const storeTime = function (conversationId, loc, time) {
        timeCached[conversationId] = timeCached[conversationId] || {};
        timeCached[conversationId][loc] = time;
    };

    /**
     * Update message cached
     * @param {Object} message
     */
    function updateMessage(currentMsg, isSend) {
        const current = _.findWhere(messagesCached, { ID: currentMsg.ID });
        const message = new Message(currentMsg);

        if (angular.isDefined(current)) {
            manageCounters(current, message, 'message');
            messagesCached = _.map(messagesCached, (msg) => {

                // Force update if it's a new message
                if (isSend && msg.ID === message.ID) {
                    return message;
                }

                if (msg.ID === message.ID) {
                    const m = _.extend(new Message(msg), message);
                    // It can be 0
                    m.Type = message.Type;
                    return m;
                }

                return msg;
            });
        } else {
            messagesCached.push(message);
        }

        manageTimes(message.ConversationID);

        $rootScope.$emit('labelsElement.' + message.ID, message);
        $rootScope.$emit('foldersMessage.' + message.ID, message);
        $rootScope.$emit('foldersElement.' + message.ID, message);
    }

    /**
     * Update conversation cached
     * @param {Object} conversation
     */
    function updateConversation(conversation) {
        const current = _.findWhere(conversationsCached, { ID: conversation.ID });

        if (angular.isDefined(current)) {
            let labelIDs = conversation.LabelIDs || current.LabelIDs || [];

            if (angular.isArray(conversation.LabelIDsRemoved)) {
                labelIDs = _.difference(labelIDs, conversation.LabelIDsRemoved);
                delete conversation.LabelIDsRemoved;
            }

            if (angular.isArray(conversation.LabelIDsAdded)) {
                labelIDs = _.uniq(labelIDs.concat(conversation.LabelIDsAdded));
                delete conversation.LabelIDsAdded;
            }

            conversation.LabelIDs = labelIDs;
            manageCounters(current, conversation, 'conversation');
            _.extend(current, conversation);
        } else {
            conversationsCached.push(conversation);
        }

        manageTimes(conversation.ID);
        $rootScope.$emit('labelsElement.' + conversation.ID, conversation);
        $rootScope.$emit('foldersElement.' + conversation.ID, conversation);
    }

    /**
     * Return a vector to calculate the counters
     * @param {Object} element - element to analyse (conversation or message)
     * @param {Boolean} unread - true if unread case
     * @param {String} type = conversation or message
     * @return {Object}
     */
    const vector = function (element, unread, type) {
        const result = {};
        let condition = true;
        const locs = ['0', '1', '2', '3', '4', '6', '10'].concat(_.map(authentication.user.Labels, (label) => { return label.ID; }) || []);

        if (unread === true) {
            if (type === 'message') {
                condition = element.IsRead === 0;
            } else if (type === 'conversation') {
                condition = element.NumUnread > 0;
            }
        }

        _.each(locs, (loc) => {
            if (angular.isDefined(element.LabelIDs) && element.LabelIDs.indexOf(loc) !== -1 && condition) {
                result[loc] = 1;
            } else {
                result[loc] = 0;
            }
        });

        return result;
    };

    /**
     * Update time for conversation
     * @param {String} conversationID
     */
    function manageTimes(conversationID) {
        if (angular.isDefined(conversationID)) {
            const conversation = api.getConversationCached(conversationID);
            const messages = api.queryMessagesCached(conversationID); // messages are ordered by -Time

            if (angular.isDefined(conversation) && angular.isArray(conversation.LabelIDs) && messages.length > 0) {
                conversation.LabelIDs.forEach((labelID) => {
                    // Get the most recent message for a specific label
                    const message = _.chain(messages)
                        .filter(({ LabelIDs }) => angular.isArray(LabelIDs) && LabelIDs.indexOf(labelID) !== -1)
                        .first()
                        .value();

                    if (angular.isDefined(message) && angular.isDefined(message.Time)) {
                        storeTime(conversationID, labelID, message.Time);
                    }
                });
            }
        }
    }

    /**
     * Manage the updating to calcultate the total number of messages and unread messages
     * @param {Object} oldElement
     * @param {Object} newElement
     * @param {String} type - 'message' or 'conversation'
     */
    function manageCounters(oldElement, newElement, type) {
        const oldUnreadVector = vector(oldElement, true, type);
        const newUnreadVector = vector(newElement, true, type);
        const newTotalVector = vector(newElement, false, type);
        const oldTotalVector = vector(oldElement, false, type);
        const locs = ['0', '1', '2', '3', '4', '6', '10'].concat(_.map(authentication.user.Labels, (label) => { return label.ID; }) || []);

        _.each(locs, (loc) => {
            const deltaUnread = newUnreadVector[loc] - oldUnreadVector[loc];
            const deltaTotal = newTotalVector[loc] - oldTotalVector[loc];
            let currentUnread;
            let currentTotal;

            if (type === 'message') {
                currentUnread = cacheCounters.unreadMessage(loc);
                currentTotal = cacheCounters.totalMessage(loc);
                cacheCounters.updateMessage(loc, currentTotal + deltaTotal, currentUnread + deltaUnread);
            } else if (type === 'conversation') {
                currentUnread = cacheCounters.unreadConversation(loc);
                currentTotal = cacheCounters.totalConversation(loc);
                cacheCounters.updateConversation(loc, currentTotal + deltaTotal, currentUnread + deltaUnread);
            }
        });
    }

    /**
     * Return loc specified in the request
     * @param {Object} request
     * @return {String} loc
     */
    const getLocation = function (request) {
        return request.Label;
    };

    /**
     * Call API to get the list of conversations
     * @param {Object} request
     * @return {Promise}
     */
    const queryConversations = (request) => {
        const loc = getLocation(request);
        const context = tools.cacheContext();

        request.Limit = request.Limit || CONSTANTS.CONVERSATION_LIMIT; // We don't call 50 conversations but 100 to improve user experience when he delete message and display quickly the next conversations

        const promise = api.getDispatcher()
        .then(() => Conversation.query(request))
        .then(({ data }) => {
            if (data.Code === 1000) {
                // Set total value in rootScope
                $rootScope.Total = data.Total;

                data.Conversations.forEach((conversation) => {
                    conversation.loaded = true; // Mark this conversation as loaded
                    storeTime(conversation.ID, loc, conversation.Time); // Store time value
                });

                // Only for cache context
                if (context) {
                    const unread = (data.Total === 0) ? 0 : data.Unread;
                    // Set total value in cache
                    cacheCounters.updateConversation(loc, data.Total, unread);
                    // Store conversations
                    storeConversations(data.Conversations);
                    // Return conversations ordered
                    return Promise.resolve(api.orderConversation(data.Conversations.slice(0, CONSTANTS.ELEMENTS_PER_PAGE), loc));
                }

                return Promise.resolve(data.Conversations.slice(0, CONSTANTS.ELEMENTS_PER_PAGE));
            }

            return Promise.reject();

            /* eslint no-unreachable: "off" */
            api.clearDispatcher();
        });

        networkActivityTracker.track(promise);

        return promise;
    };

    /**
     * Query api to get messages
     * @param {Object} request
     * @return {Promise}
     */
    const queryMessages = (request) => {
        const loc = getLocation(request);
        const context = tools.cacheContext();

        request.Limit = request.Limit || CONSTANTS.MESSAGE_LIMIT; // We don't call 50 messages but 100 to improve user experience when he delete message and display quickly the next messages

        const promise = api.getDispatcher()
        .then(() => Message.query(request).$promise)
        .then((result) => {
            const messages = result.Messages;

            $rootScope.Total = result.Total;

            messages.forEach((message) => {
                message.loaded = true;
                message.Senders = [message.Sender];
                message.Recipients = _.uniq([].concat(message.ToList || []).concat(message.CCList || []).concat(message.BCCList || []));
            });

            // Store messages
            storeMessages(messages);

            // Only for cache context
            if (context) {
                // Set total value in cache
                cacheCounters.updateMessage(loc, result.Total);
                // Return messages ordered
                return Promise.resolve(api.orderMessage(messages.slice(0, CONSTANTS.ELEMENTS_PER_PAGE)));
            }
            return Promise.resolve(messages.slice(0, CONSTANTS.ELEMENTS_PER_PAGE));

            api.clearDispatcher();
        });

        networkActivityTracker.track(promise);

        return promise;
    };

    /**
     * Get conversation from back-end and store it in the cache
     * @param {String} conversationID
     * @return {Promise}
     */
    function getConversation(conversationID = '') {
        const promise = Conversation.get(conversationID)
            .then(({ data = {} }) => {
                const { Code, Conversation, Messages } = data;

                if (Code === 1000) {
                    const conversation = Conversation;
                    const messages = Messages;
                    const message = _.max(messages, ({ Time }) => Time); // NOTE Seems wrong, we should check Time and LabelIDs

                    messages.forEach((message) => message.loaded = true);
                    conversation.loaded = true;
                    conversation.Time = message.Time;
                    storeConversations([conversation]);
                    storeMessages(messages);

                    return Promise.resolve(conversation);
                }

                return Promise.reject(data.Error);
            });

        networkActivityTracker.track(promise);

        return promise;
    }

    /**
    * Call the API to get message
    * @param {String} messageID
    * @return {Promise}
    */
    function getMessage(messageID = '') {
        const promise = Message.get({ id: messageID }).$promise
        .then((data) => {
            if (data.Code === 1000) {
                const message = new Message(data.Message);

                message.loaded = true;
                storeMessages([message]);

                return Promise.resolve(message);
            } else if (data.Error) {
                return Promise.reject(data.Error);
            }
        });

        networkActivityTracker.track(promise);

        return promise;
    }

    /**
     * Add action promise to the dispatcher
     * @param {Promise} action
     */
    api.addToDispatcher = function (action) {
        dispatcher.push(action);
    };

    /**
     * Clear the dispatcher
     */
    api.clearDispatcher = function () {
        dispatcher = [];
    };

    /**
     * Return the promises state of the dispatcher
     * @return {Promise}
     */
    api.getDispatcher = function () {
        return $q.all(dispatcher);
    };

    api.empty = (mailbox) => {
        const loc = CONSTANTS.MAILBOX_IDENTIFIERS[mailbox];

        for (let index = conversationsCached.length - 1; index >= 0; index--) {
            const conversation = conversationsCached[index];

            if (angular.isDefined(conversation) && angular.isArray(conversation.LabelIDs) && conversation.LabelIDs.indexOf(loc) !== -1) {
                conversationsCached.splice(index, 1);
            }
        }

        $rootScope.$emit('refreshElements');
    };

    /**
     * Return a list of conversations reordered by Time for a specific location
     * @param {Array} conversations
     * @param {String} loc
     * @return {Array} don't miss this array is reversed
     */
    api.orderConversation = (conversations = [], loc = '') => {
        return reverse(conversations.sort((a, b) => {
            if (api.getTime(a.ID, loc) < api.getTime(b.ID, loc)) {
                return -1;
            }

            if (api.getTime(a.ID, loc) > api.getTime(b.ID, loc)) {
                return 1;
            }

            if (a.Order < b.Order) {
                return -1;
            }

            if (a.Order > b.Order) {
                return 1;
            }

            return 0;
        }));
    };

    function reverse(list = []) {
        return list.reduce((acc, item) => (acc.unshift(item), acc), []);
    }

    /**
     * Return a list of messages reordered by Time
     * @param {Array} messages
     * @return {Array} don't miss this array is reversed
     */
    api.orderMessage = function (messages = [], doReverse = true) {
        const list = messages
            .sort((a, b) => {
                if (a.Time < b.Time) {
                    return -1;
                }

                if (a.Time > b.Time) {
                    return 1;
                }

                if (a.Order < b.Order) {
                    return -1;
                }

                if (a.Order > b.Order) {
                    return 1;
                }

                return 0;
            });

        return doReverse ? reverse(list) : list;
    };

    /**
     * Elements ordered
     * @param  {Array}   [elements=[]]    [description]
     * @param  {String}  [type='message'] [description]
     * @param  {Boolean} [doReverse=true] [description]
     * @param  {String}  [loc='']         [description]
     * @return {Array}
     */
    api.orderElements = (elements = [], type = 'message', doReverse = true, loc = '') => {
        const list = elements.sort((a, b) => {
            const timeA = (type === 'message') ? a.Time : api.getTime(a.ID, loc);
            const timeB = (type === 'message') ? b.Time : api.getTime(b.ID, loc);

            if (timeA < timeB) {
                return -1;
            }

            if (timeA > timeB) {
                return 1;
            }

            if (a.Order < b.Order) {
                return -1;
            }

            if (a.Order > b.Order) {
                return 1;
            }

            return 0;
        });

        return doReverse ? reverse(list) : list;
    };

    /**
     * Return time for a specific conversation and location
     * @return {Integer}
     */
    api.getTime = function (conversationId, loc) {
        if (angular.isDefined(timeCached[conversationId]) && angular.isNumber(timeCached[conversationId][loc])) {
            return timeCached[conversationId][loc];
        }

        const conversation = api.getConversationCached(conversationId);
        if (angular.isDefined(conversation)) {
            return conversation.Time;
        }

        return '';
    };

    /**
     * Return message list
     * @param {Object} request
     * @param {Boolean} firstLoad
     * @return {Promise}
     */
    api.queryMessages = function (request, firstLoad = false) {
        const deferred = $q.defer();
        const loc = getLocation(request);
        const context = tools.cacheContext();
        const callApi = function () {
            deferred.resolve(queryMessages(request));
        };

        if (context && !firstLoad) {
            const page = request.Page || 0;
            const start = page * CONSTANTS.ELEMENTS_PER_PAGE;
            const end = start + CONSTANTS.ELEMENTS_PER_PAGE;
            let total;
            let number;
            const mailbox = tools.currentMailbox();
            let messages = _.filter(messagesCached, (message) => {
                return angular.isDefined(message.LabelIDs) && message.LabelIDs.indexOf(loc) !== -1;
            });

            messages = api.orderMessage(messages);

            switch (mailbox) {
                case 'label':
                    total = cacheCounters.totalMessage($stateParams.label);
                    break;
                default:
                    total = cacheCounters.totalMessage(CONSTANTS.MAILBOX_IDENTIFIERS[mailbox]);
                    break;
            }

            if (angular.isDefined(total)) {
                if (total === 0) {
                    number = 0;
                } else if ((total % CONSTANTS.ELEMENTS_PER_PAGE) === 0) {
                    number = CONSTANTS.ELEMENTS_PER_PAGE;
                } else if ((Math.ceil(total / CONSTANTS.ELEMENTS_PER_PAGE) - 1) === page) {
                    number = total % CONSTANTS.ELEMENTS_PER_PAGE;
                } else {
                    number = CONSTANTS.ELEMENTS_PER_PAGE;
                }

                messages = messages.slice(start, end);

                // Supposed total equal to the total cache?
                if (messages.length === number) {
                    deferred.resolve(messages);
                } else {
                    callApi();
                }
            } else {
                callApi();
            }
        } else {
            callApi();
        }

        return deferred.promise;
    };

    /**
     * Return conversation list with request specified in cache or call api
     * @param {Object} request
     * @param {Boolean} firstLoad
     * @return {Promise}
     */
    api.queryConversations = function (request, firstLoad = false) {
        const deferred = $q.defer();
        const loc = getLocation(request);
        const context = tools.cacheContext();
        const callApi = function () {
            // Need data from the server
            deferred.resolve(queryConversations(request));
        };

        // In cache context?
        if (context && !firstLoad) {
            const page = request.Page || 0;
            const start = page * CONSTANTS.ELEMENTS_PER_PAGE;
            const end = start + CONSTANTS.ELEMENTS_PER_PAGE;
            let total;
            let number;
            const mailbox = tools.currentMailbox();
            let conversations = _.filter(conversationsCached, (conversation) => {
                return angular.isDefined(conversation.LabelIDs) && conversation.LabelIDs.indexOf(loc) !== -1 && angular.isDefined(api.getTime(conversation.ID, loc));
            });

            conversations = api.orderConversation(conversations, loc);

            switch (mailbox) {
                case 'label':
                    total = cacheCounters.totalConversation($stateParams.label);
                    break;
                default:
                    total = cacheCounters.totalConversation(CONSTANTS.MAILBOX_IDENTIFIERS[mailbox]);
                    break;
            }

            if (angular.isDefined(total)) {
                if (total === 0) {
                    number = 0;
                } else if ((total % CONSTANTS.ELEMENTS_PER_PAGE) === 0) {
                    number = CONSTANTS.ELEMENTS_PER_PAGE;
                } else if ((Math.ceil(total / CONSTANTS.ELEMENTS_PER_PAGE) - 1) === page) {
                    number = total % CONSTANTS.ELEMENTS_PER_PAGE;
                } else {
                    number = CONSTANTS.ELEMENTS_PER_PAGE;
                }

                conversations = conversations.slice(start, end);

                // Supposed total equal to the total cache?
                if (conversations.length === number) {
                    deferred.resolve(conversations);
                } else {
                    callApi();
                }
            } else {
                callApi();
            }
        } else {
            callApi();
        }

        return deferred.promise;
    };

    /**
     * Return a copy of messages cached for a specific ConversationID
     * @param {String} conversationID
     */
    api.queryMessagesCached = (ConversationID) => {
        const list = api.orderMessage(_.where(messagesCached, { ConversationID }));
        return list.slice(); // Create a copy
    };

    /**
     * Return conversation cached
     * @param {String} conversationId
     * @return {Object}
     */
    api.getConversationCached = function (conversationId) {
        const result = _.findWhere(conversationsCached, { ID: conversationId });

        return angular.copy(result);
    };

    /**
     * Return message cached
     * @param {String} messageId
     * @return {Object}
     */
    api.getMessageCached = function (messageId) {
        return angular.copy(_.findWhere(messagesCached, { ID: messageId }));
    };

    /**
     * @param {String} conversationID
     * @return {Promise}
     */
    api.getConversation = (ID) => {
        const conversation = _.findWhere(conversationsCached, { ID }) || {};
        const messages = api.queryMessagesCached(ID); // messages are ordered by -Time

        if (conversation.loaded === true && messages.length === conversation.NumMessages) {
            return Promise.resolve(conversation);
        }

        return getConversation(ID);
    };

    /**
    * Return the message specified by the id from the cache or the back-end
    * @param {String} ID - Message ID
    * @return {Promise}
    */
    api.getMessage = (ID = '') => {
        const deferred = $q.defer();
        const message = _.findWhere(messagesCached, { ID });

        if (angular.isDefined(message) && angular.isDefined(message.Body)) {
            deferred.resolve(angular.copy(message));
        } else {
            getMessage(ID)
            .then((message) => {
                deferred.resolve(angular.copy(message));
            });
        }

        return deferred.promise;
    };

    /**
    * Delete message or conversation in the cache if the element is present
    * @param {Object} event
    * @return {Promise}
    */
    api.delete = function (event) {
        // Delete message
        messagesCached = messagesCached.filter(({ ID }) => ID !== event.ID);

        // Delete conversation
        conversationsCached = conversationsCached.filter(({ ID }) => ID !== event.ID);

        return Promise.resolve();
    };

    /**
    * Add a new message in the cache
    * @param {Object} event
    * @return {Promise}
    */
    api.createMessage = function (event) {
        // Insert the new message in the cache
        updateMessage(event.Message);
        return Promise.resolve();
    };

    /**
     * Add a new conversation in the cache
     * @param {Object} event
     * @return {Promise}
     */
    api.createConversation = function (event) {
        const deferred = $q.defer();

        // Insert the new conversation in the cache without download
        updateConversation(event.Conversation);
        deferred.resolve();

        return deferred.promise;
    };

    /**
     * Update draft conversation
     * @param {Object}
     * @return {Promise}
     */
    api.updateDraftConversation = function (event) {
        const deferred = $q.defer();

        // Insert the new conversation in the cache without download
        updateConversation(event.Conversation);
        deferred.resolve();

        return deferred.promise;
    };

    /**
    * Update message attached to the id specified
    * @param {Object} event
    * @return {Promise}
    */
    api.updateFlagMessage = (event, isSend) => {
        const current = _.findWhere(messagesCached, { ID: event.ID });

        // We need to force the update if the update is coming from a Send (new message)
        if (!isSend && (!current || (current && event.Message.Time === current.Time))) {
            return Promise.resolve();
        }

        const message = _.extend(new Message(current), event.Message);

        // Manage labels
        if (angular.isDefined(event.Message.LabelIDsRemoved)) {
            message.LabelIDs = _.difference(message.LabelIDs, event.Message.LabelIDsRemoved);
            delete message.LabelIDsRemoved;
        }

        if (angular.isDefined(event.Message.LabelIDsAdded)) {
            message.LabelIDs = _.uniq(message.LabelIDs.concat(event.Message.LabelIDsAdded));
            delete message.LabelIDsAdded;
        }

        return Promise.resolve(updateMessage(message, isSend));
    };

    /**
     * Update a conversation
     */
    api.updateFlagConversation = function (event) {
        const deferred = $q.defer();
        const current = _.find(conversationsCached, { ID: event.ID });

        if (angular.isDefined(current) && current.loaded === true) {
            updateConversation(event.Conversation);
            deferred.resolve();
        } else {
            getConversation(event.ID).then((conversation) => {
                conversation.LabelIDsAdded = event.Conversation.LabelIDsAdded;
                conversation.LabelIDsRemoved = event.Conversation.LabelIDsRemoved;
                updateConversation(conversation);
                deferred.resolve();
            });
        }

        return deferred.promise;
    };

    /**
    * Manage the cache when a new event comes
    * @param {Array} events - Object managing interaction with messages and conversations stored
    * @param {Boolean} fromBackend - indicate if the events come from the back-end
    * @return {Promise}
    */
    api.events = function (events, fromBackend, isSend) {
        const deferred = $q.defer();
        const promises = [];
        const messageIDs = [];
        const conversationIDs = [];

        if (fromBackend === true) {
            console.log('events from the back-end', events);
        } else {
            console.log('events from the front-end', events);
        }

        events.forEach((event) => {
            if (event.Action === DELETE) { // Can be for message or conversation
                promises.push(api.delete(event));
                messageIDs.push(event.ID);
                conversationIDs.push(event.ID);
            } else if (angular.isDefined(event.Message)) { // Manage message action
                event.Message.ID = event.ID;
                messageIDs.push(event.ID);

                switch (event.Action) {
                    case CREATE:
                        promises.push(api.createMessage(event));
                        break;
                    case UPDATE_DRAFT:
                        promises.push(api.updateFlagMessage(event, isSend));
                        break;
                    case UPDATE_FLAGS:
                        promises.push(api.updateFlagMessage(event, isSend));
                        break;
                    default:
                        break;
                }
            } else if (angular.isDefined(event.Conversation)) { // Manage conversation action
                event.Conversation.ID = event.ID;
                conversationIDs.push(event.ID);

                switch (event.Action) {
                    case CREATE:
                        promises.push(api.createConversation(event));
                        break;
                    case UPDATE_DRAFT:
                        promises.push(api.updateDraftConversation(event));
                        break;
                    case UPDATE_FLAGS:
                        promises.push(api.updateFlagConversation(event));
                        break;
                    default:
                        break;
                }
            }
        });

        $q.all(promises).then(() => {
            api.callRefresh(messageIDs, conversationIDs);
            deferred.resolve();
        }, () => {
            deferred.reject();
        });

        return deferred.promise;
    };

    /**
     * Ask to the message list controller to refresh the messages
     * First with the cache
     * Second with the query call
     */
    api.callRefresh = (messageIDs = [], conversationIDs = []) => {
        $rootScope.$broadcast('refreshElements');
        $rootScope.$broadcast('updatePageName');
        $rootScope.$emit('refreshConversation', conversationIDs);
        $rootScope.$emit('message.refresh', messageIDs);
    };

    /**
     * Reset cache and hash then preload inbox and sent
     */
    api.reset = function () {
        conversationsCached = [];
        messagesCached = [];
    };

    /**
     * Manage expiration time for messages in the cache
     */
    function expiration() {
        const now = moment().unix();
        const { list, removeList } = messagesCached
            .reduce((acc, message = {}) => {
                const { ExpirationTime, ID } = message;
                const test = !(ExpirationTime !== 0 && ExpirationTime < now);
                if (test) {
                    acc.list.push(message);
                } else {
                    acc.removeList.push(ID);
                }
                return acc;
            }, { list: [], removeList: [] });

        messagesCached = list;
        (removeList.length) && $rootScope.$emit('message.expiration', removeList);
    }

    /**
     * Return previous ID of message specified
     * @param {String} elementID - can be a message ID or a conversation ID
     * @param {String} action - 'next' or 'previous'
     * @param {String} type - 'conversation' or 'message'
     * @return {Promise}
     */
    api.more = (elementID, action, type) => {
        const elementsCached = (type === 'conversation') ? conversationsCached : messagesCached;
        const loc = tools.currentLocation();
        const callApi = () => {
            const request = { Label: loc };
            const promise = (type === 'conversation') ? queryConversations(request) : queryMessages(request);

            return promise.then((elements = []) => {
                if (elements.length) {
                    return Promise.resolve(elements[0]);
                }

                return Promise.reject();
            });
        };

        const elements = elementsCached.filter(({ LabelIDs = [] }) => LabelIDs.indexOf(loc) > -1);
        const elementsOrdered = api.orderElements(elements, type, true, loc);
        const currentIndex = _.findIndex(elementsOrdered, { ID: elementID });

        if (currentIndex > -1) {
            if (action === 'previous' && elementsOrdered[currentIndex + 1]) {
                return Promise.resolve(elementsOrdered[currentIndex + 1]);
            } else if (action === 'next' && elementsOrdered[currentIndex - 1]) {
                return Promise.resolve(elementsOrdered[currentIndex - 1]);
            }
        }

        return callApi();
    };

    return api;
})

.service('cacheCounters', (Message, CONSTANTS, Conversation, $q, $rootScope, authentication) => {
    const api = {};
    let counters = {};
    // {
    //     loc: {
    //         message: {
    //             total: value,
    //             unread: value
    //         },
    //         conversation: {
    //             total: value,
    //             unread: value
    //         }
    //     }
    // }
    const exist = function (loc) {

        if (angular.isUndefined(counters[loc])) {
            counters[loc] = {
                message: {
                    total: 0,
                    unread: 0
                },
                conversation: {
                    total: 0,
                    unread: 0
                }
            };
        }
    };

    /**
    * Query unread and total
    * Find the total and unread items per message and conversation
    * @return {Promise}
    */
    api.query = function () {
        const deferred = $q.defer();
        const idsLabel = _.map(authentication.user.Labels, ({ ID }) => ID) || [];
        const locs = ['0', '1', '2', '3', '4', '6', '10'].concat(idsLabel);

        $q.all({
            message: Message.count().$promise,
            conversation: Conversation.count()
        })
        .then(({ message = {}, conversation = {} } = {}) => {

            // Initialize locations
            locs.forEach(exist);

            _.chain(message.Counts)
                .filter(({ LabelID }) => counters[LabelID])
                .each(({ LabelID, Total = 0, Unread = 0 }) => {
                    counters[LabelID].message.total = Total;
                    counters[LabelID].message.unread = Unread;
                });

            _.chain(conversation.data.Counts)
                .filter(({ LabelID }) => counters[LabelID])
                .each(({ LabelID, Total = 0, Unread = 0 }) => {
                    counters[LabelID].conversation.total = Total;
                    counters[LabelID].conversation.unread = Unread;
                });

            deferred.resolve();
        }, deferred.reject);

        return deferred.promise;
    };

    /**
     * Add a new location
     * @param {String} loc
     */
    api.add = function (loc) {
        exist(loc);
    };

    /**
    * Update the total / unread for a specific loc
    * @param {String} loc
    * @param {Integer} total
    * @param {Integer} unread
    */
    api.updateMessage = function (loc, total, unread) {
        exist(loc);

        if (angular.isDefined(total)) {
            counters[loc].message.total = total;
        }

        if (angular.isDefined(unread)) {
            counters[loc].message.unread = unread;
        }
    };

    /**
     * Update the total / unread for a specific loc
     * @param {String} loc
     * @param {Integer} total
     * @param {Integer} unread
     */
    api.updateConversation = function (loc, total, unread) {
        exist(loc);

        if (angular.isDefined(total)) {
            counters[loc].conversation.total = total;
        }

        if (angular.isDefined(unread)) {
            counters[loc].conversation.unread = unread;
        }
    };

    /**
    * Get the total of messages for a specific loc
    * @param {String} loc
    */
    api.totalMessage = function (loc) {
        return counters[loc] && counters[loc].message && counters[loc].message.total;
    };

    /**
    * Get the total of conversation for a specific loc
    * @param {String} loc
    */
    api.totalConversation = function (loc) {
        return counters[loc] && counters[loc].conversation && counters[loc].conversation.total;
    };

    /**
    * Get the number of unread messages for the specific loc
    * @param {String} loc
    */
    api.unreadMessage = function (loc) {
        return counters[loc] && counters[loc].message && counters[loc].message.unread;
    };

    /**
    * Get the number of unread conversation for the specific loc
    * @param {String} loc
    */
    api.unreadConversation = function (loc) {
        return counters[loc] && counters[loc].conversation && counters[loc].conversation.unread;
    };

    api.reset = function () {
        counters = {};
    };

    return api;
});
