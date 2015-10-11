/*
  Copyright (C) 2015 Petr Vytovtov
  Contact: Petr Vytovtov <osanwe@protonmail.ch>
  All rights reserved.

  This file is part of Kat.

  Kat is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Kat is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Kat.  If not, see <http://www.gnu.org/licenses/>.
*/

.import "../storage.js" as StorageJS
.import "../types.js" as TypesJS
.import "request.js" as RequestAPI
.import "users.js" as UsersAPI

var HISTORY_COUNT = 50;
var LONGPOLL_SERVER = {
    key: '',
    server: '',
    ts: -1,
    mode: 2
};

// -------------- API functions --------------

function api_getUnreadMessagesCounter(isCover) {
    RequestAPI.sendRequest("messages.getDialogs",
                           { unread:1 },
                           isCover ? callback_getUnreadMessagesCounter_cover :
                                     callback_getUnreadMessagesCounter_mainMenu)
}

function api_getDialogsList(offset) {
    RequestAPI.sendRequest("messages.getDialogs",
                           { offset: offset },
                           callback_getDialogsList)
}

function api_getHistory(isChat, dialogId, offset) {
    var data = {
        offset: offset,
        count: HISTORY_COUNT
    };
    data[isChat ? "chat_id" : "user_id"] = dialogId;
    RequestAPI.sendRequest("messages.getHistory",
                           data,
                           callback_getHistory)
}

function api_sendMessage(isChat, dialogId, message, attachments, isNew) {
    var data = {
        message: message,
        attachment: attachments
    };
    data[isChat ? "chat_id" : "user_id"] = dialogId;
    RequestAPI.sendRequest("messages.send",
                           data,
                           callback_sendMessage)
}

function api_createChat(ids, message) {
    RequestAPI.sendRequest("messages.createChat",
                           { user_ids: ids,
                             title: message },
                           callback_createChat)
}

function api_searchDialogs(substring) {
    RequestAPI.sendRequest("messages.searchDialogs",
                           { q: substring,
                             fields:"photo_100,online" },
                           callback_searchDialogs)
}

function api_markDialogAsRead(isChat, uid, mids) {
    RequestAPI.sendRequest("messages.markAsRead",
                           { message_ids: mids })
}


function api_getChat(dialogIds) {
    RequestAPI.sendRequest("messages.getChat",
                           { chat_ids: dialogIds },
                           callback_getChat)
}

function api_getChatUsers(dialogId) {
    RequestAPI.sendRequest("messages.getChatUsers",
                           { chat_id: dialogId,
                             fields: "online,photo_100,status" },
                           callback_getChatUsers)
}

function api_startLongPoll(mode) {
    if (mode) LONGPOLL_SERVER.mode = mode
    RequestAPI.sendRequest("messages.getLongPollServer",
                           { use_ssl:  1,
                             need_pts: 0 },
                           callback_startLongPoll)
}

// -------------- Callbacks --------------

function callback_getUnreadMessagesCounter_mainMenu(jsonObject) {
//    updateUnreadMessagesCounter(jsonObject.response.count)
}

function callback_getUnreadMessagesCounter_cover(jsonObject) {
    updateCoverCounters(jsonObject.response.count)
}

function callback_getDialogsList(jsonObject) {
    var uids = ""
    var chatsIds = ""
    var items = jsonObject.response.items
    for (var index in items) {
        var jsonMessage = items[index].message
        StorageJS.saveMessage(jsonMessage.id,
                              jsonMessage.chat_id,
                              jsonMessage.user_id,
                              jsonMessage.from_id,
                              jsonMessage.date,
                              jsonMessage.read_state,
                              jsonMessage.out,
                              jsonMessage.title,
                              jsonMessage.body,
                              jsonMessage.geo,
                              jsonMessage.attachments,
                              jsonMessage.fwd_messages)

        var dialogId = jsonMessage.user_id
        var messageBody = jsonMessage.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        var isChat = false
        if (jsonMessage.fwd_messages)
            messageBody = "[сообщения] " + messageBody
        if (jsonMessage.attachments)
            messageBody = "[вложения] " + messageBody
        if (jsonMessage.chat_id) {
            dialogId = jsonMessage.chat_id
            chatsIds += "," + jsonMessage.chat_id
            isChat = true
        } else {
            uids += "," + jsonMessage.user_id
        }
        formDialogsList(jsonMessage.out,
                        jsonMessage.title,
                        messageBody,
                        dialogId,
                        jsonMessage.read_state,
                        isChat)
    }
    if (uids.length === 0 && chatsUids.length === 0) {
        stopBusyIndicator()
    } else {
        uids = uids.substring(1)
        chatsIds = chatsIds.substring(1)
        UsersAPI.getUsersAvatarAndOnlineStatus(uids)
        api_getChat(chatsIds)
    }
}

function callback_getHistory(jsonObject) {
    var items = jsonObject.response.items
    var messages = []
    for (var index in items) {
        var messageJsonObject = items[index]
        StorageJS.saveMessage(messageJsonObject.id,
                              messageJsonObject.chat_id,
                              messageJsonObject.user_id,
                              messageJsonObject.from_id,
                              messageJsonObject.date,
                              messageJsonObject.read_state,
                              messageJsonObject.out,
                              messageJsonObject.title,
                              messageJsonObject.body,
                              messageJsonObject.geo,
                              messageJsonObject.attachments,
                              messageJsonObject.fwd_messages)
        messages[messages.length] = parseMessage(messageJsonObject)
    }
    formMessagesListFromServerData(messages)
    stopBusyIndicator()
    scrollMessagesToBottom()
}

function callback_sendMessage(jsonObject, isNew) {
    scrollMessagesToBottom()
}

function callback_createChat(jsonObject) {
    api_sendMessage(true, jsonObject.response, message, true)
}

function callback_searchDialogs(jsonObject) {
    for (var index in jsonObject.response) {
        var name = jsonObject.response[index].first_name
        name += " " + jsonObject.response[index].last_name
        updateSearchContactsList(jsonObject.response[index].id,
                                 name,
                                 jsonObject.response[index].photo_100,
                                 jsonObject.response[index].online)
    }
}

function callback_getChat(jsonObject) {
    for (var index in jsonObject.response) {
        var chatInfo = jsonObject.response[index]
        var photo = chatInfo.photo_100
        if (photo) {
            updateDialogInfo(true,
                             index,
                             chatInfo.photo_100,
                             chatInfo.title,
                             false)
            stopBusyIndicator()
        }
    }
}

function callback_getChatUsers(jsonObject) {
    var users = []
    for (var index in jsonObject.response) {
        var name = jsonObject.response[index].first_name
        name += " " + jsonObject.response[index].last_name
        users[users.length] = {
            id:     jsonObject.response[index].id,
            name:   name,
            photo:  jsonObject.response[index].photo_100,
            online: jsonObject.response[index].online,
            status: jsonObject.response[index].status
        }
    }
    saveUsers(users)
}

function callback_startLongPoll(jsonObject) {
    var res = jsonObject.response
    if (res) {
        LONGPOLL_SERVER.key = res.key
        LONGPOLL_SERVER.server = res.server
        LONGPOLL_SERVER.ts = res.ts

        RequestAPI.sendLongPollRequest(LONGPOLL_SERVER.server,
                                       { key:  LONGPOLL_SERVER.key,
                                         ts:   LONGPOLL_SERVER.ts,
                                         wait: TypesJS.UpdateInterval.getValue(),
                                         mode: LONGPOLL_SERVER.mode },
                                       callback_doLongPoll)
    }
}

function callback_doLongPoll(jsonObject) {
    if (jsonObject) {
        if (jsonObject.updates) {
            for (var i in jsonObject.updates) {
                var update = jsonObject.updates[i]
                var eventId = update[0]

                switch (eventId) {
                case 0: // удаление сообщения
                    break;
                case 1: // замена флагов сообщения (FLAGS:=$flags)
                case 2: // установка флагов сообщения (FLAGS|=$mask)
                case 3: // сброс флагов сообщения (FLAGS&=~$mask)
                    var msgId = update[1]
                    var flags = update[2]
                    var userId = update.length > 3 ? update[3] : null
                    var action = eventId === 1 ? TypesJS.Action.SET:
                                (eventId === 2 ? TypesJS.Action.ADD :
                                                 TypesJS.Action.DEL)
                    TypesJS.LongPollWorker.applyValue('message.flags',
                                                 [msgId, flags, action, userId])
                    break;
                case 4: // добавление нового сообщения
                    TypesJS.LongPollWorker.applyValue('message.add', update.slice(1))
                    break;
                case 8: // друг стал онлайн/оффлайн
                case 9:
                    var isOnline = eventId === 8
                    var userId = update[1]
                    TypesJS.LongPollWorker.applyValue('friends', [-userId, isOnline])
                    break;
                case 80: // счетчик непрочитанных
                    var count = update[1]
                    TypesJS.LongPollWorker.applyValue('unread', [count])
                    break;
                default:
                    break;
                }
            }
        }

        RequestAPI.sendLongPollRequest(LONGPOLL_SERVER.server,
                                       { key:  LONGPOLL_SERVER.key,
                                         ts:   jsonObject.ts,
                                         wait: TypesJS.UpdateInterval.getValue(),
                                         mode: LONGPOLL_SERVER.mode },
                                       callback_doLongPoll)
    }
}

// -------------- Other functions --------------


/**
 * The function for parsing the json object of a message.
 *
 * [In]  + jsonObject - the json object of the message.
 *
 * [Out] + The associative array of message data, which contains message and date.
 *         Also it can contain informaion about attachments, forwarded messages and location.
 */
function parseMessage(jsonObject) {
    var date = new Date()
    date.setTime(parseInt(jsonObject.date) * 1000)

    var messageAttachments = []
    if (jsonObject.attachments) for (var index in jsonObject.attachments)
            messageAttachments[messageAttachments.length] = jsonObject.attachments[index]
    if (jsonObject.fwd_messages) for (var index in jsonObject.fwd_messages)
            messageAttachments[messageAttachments.length] = jsonObject.fwd_messages[index]
    if (jsonObject.geo) messageAttachments[messageAttachments.length] = jsonObject.geo

    var messageData = {
        mid:             jsonObject.id,
        fromId:          jsonObject.from_id,
        readState:       jsonObject.read_state,
        out:             jsonObject.out,
        message:         jsonObject.body.replace(/&/g, '&amp;')
                                        .replace(/</g, '&lt;')
                                        .replace(/>/g, '&gt;')
                                        .replace(/\n/g, "<br>")
                                        .replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\">$1</a>"),
        datetime:        ("0" + date.getHours()).slice(-2) + ":" +
                         ("0" + date.getMinutes()).slice(-2) + ", " +
                         ("0" + date.getDate()).slice(-2) + "." +
                         ("0" + (date.getMonth() + 1)).slice(-2) + "." +
                         ("0" + date.getFullYear()).slice(-2),
        attachmentsData: messageAttachments,
        avatarSource:    "",
        isNewsContent:   false
    }

    return messageData
}

/**
 * The function for parsing the json object of a dialog list item.
 *
 * [In]  + jsonObject - the json object of the dialog item.
 *
 * [Out] + The array of dialog item data, which contains info about the dialog.
 */
function parseDialogListItem(jsonObject) {
    if (Object.keys(jsonObject).length === 0)
        return null

    var itemData = []

    var body = jsonObject.body.replace(/<br>/g, " ")
                              .replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;')
    var title = jsonObject.title.replace(/&/g, '&amp;')
                                .replace(/</g, '&lt; ')
                                .replace(/>/g, ' &gt;')
    var isChat = false
    var dialogId = jsonObject.user_id

    if (jsonObject.fwd_messages)
        body = "[сообщения] " + body
    if (jsonObject.attachments)
        body = "[вложения] " + body
    if (jsonObject.chat_id) {
        dialogId = jsonObject.chat_id
        isChat = true
    }

    itemData[0] = jsonObject.out
    itemData[1] = title
    itemData[2] = body
    itemData[3] = dialogId
    itemData[4] = jsonObject.read_state
    itemData[5] = isChat

    return itemData
}

/**
 * The function for parsing message from long polling.
 *
 * [In]  + argsArray - the array of message data.
 *
 * [Out] + Standart json object of message data.
 */
function parseLongPollMessage(argsArray) {
    var jsonObject = {}
    var flags = argsArray[1]
    var extra = argsArray[6]

    jsonObject.id = argsArray[0]
    jsonObject.from_id = argsArray[2]
    jsonObject.date = argsArray[3]
    jsonObject.read_state = +!((1 & flags) === 1)
    jsonObject.out = +((2 & flags) === 2)
    jsonObject.title = argsArray[4]
    jsonObject.body = argsArray[5]

    var media = []
    Object.keys(extra).forEach(function(key) {
        if (key === "from") {
            jsonObject.chat_id = jsonObject.from_id - 2000000000
            jsonObject.from_id = extra.from
        }
        else if (key.indexOf("attach") === 0) {
            if (key.length - key.lastIndexOf("_type") === 5) {
                var keyVal = key.substr(0, key.indexOf('_'))
                var owner_item = extra[keyVal].split('_')
                var ownerId = parseInt(owner_item[0], 10)
                var itemId = parseInt(owner_item[1], 10)
                var item = {}

                switch(extra[key]) {
                case 'photo':
                case 'video':
                case 'audio':
                case 'doc':
                    item[key[0] + id] = itemId
                    item.owner_id = ownerId
                    break
                case 'wall':
                    item.id = itemId
                    item.to_id = ownerId
                    break
                }
                media.push(item)
            }
        }
        else if (key === "fwd") {
            jsonObject.fwd_messages = []
            extra.fwd.forEach(function (o) {
                var user_msg = o.split('_')
                jsonObject.fwd_messages.push({
                    "uid":user_msg[0],
                    "mid":user_msg[1]
                })
            })
        }
    })
    if (media.length > 0)
        jsonObject.attachments = media

    if (!jsonObject.chat_id)
        jsonObject.user_id = jsonObject.from_id

    console.log(JSON.stringify(jsonObject))
    return jsonObject
}
