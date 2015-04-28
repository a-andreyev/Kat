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

import QtQuick 2.0
import QtMultimedia 5.0
import Sailfish.Silica 1.0
import "../js/api/audios.js" as AudiosAPI
import "../js/api/videos.js" as VideosAPI
import "../emojione/emojione.js" as EmojiOne

BackgroundItem {
    /*
     out
     readState
    */

    function calculateMessageItemHeight() {
        var textHeight = datetimeText.height + messageText.height + photosAttachment.height +
                videosAttachment.height + audiosAttachment.height
        return Math.max(messageAvatar.height, textHeight) + 2 * Theme.paddingMedium
    }

    function buildMessageWithEmoji(message) {
//        EmojiOne.imageType = 'png'
//        EmojiOne.ascii = true
//        EmojiOne.imagePathPNG = '../emojione/png/'
        return EmojiOne.toImage(message)
    }

    function openVideoPlayer(urls, duration) {
        console.log(urls)
        console.log(duration)
        var url = ""

        if (urls.mp4_240) {
            url = urls.mp4_240
        } else if (urls.external) {
            Qt.openUrlExternally(urls.external)
            return
        }

        pageContainer.push("../pages/VideoPage.qml", { "url": url, "duration": duration })
    }

    function playAudio(url) {
        audioPlayer.source = url
        audioPlayer.play()
    }

    Audio {
        id: audioPlayer
    }

    anchors.left: parent.left
    anchors.right: parent.right
    height: calculateMessageItemHeight()
    highlighted: out === 0 & readState === 0

    Row {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.topMargin: Theme.paddingMedium
        anchors.leftMargin: Theme.paddingLarge
        anchors.rightMargin: Theme.paddingLarge
        spacing: Theme.paddingMedium
        layoutDirection: out === 0 ? Qt.LeftToRight : Qt.RightToLeft

        Image {
            id: messageAvatar
            height: Theme.itemSizeSmall - 2 * Theme.paddingSmall
            width: height
            source: out === 0 ? avatarSource : userAvatar
        }

        Column {

            Label {
                id: messageText
                width: parent.parent.width - Theme.paddingMedium - messageAvatar.width
                height: contentHeight
                horizontalAlignment: out === 1 ? Text.AlignRight : Text.AlignLeft
                text: buildMessageWithEmoji(message)
                textFormat: Text.StyledText
                linkColor: readState === 1 ? Theme.secondaryColor : Theme.secondaryHighlightColor
                color: readState === 1 ? Theme.primaryColor : Theme.highlightColor
                wrapMode: Text.Wrap

                onLinkActivated: Qt.openUrlExternally(link)
            }

            SilicaGridView {
                id: photosAttachment
                anchors.left: parent.left
                anchors.right: parent.right
                height: {
                    var div = Math.floor(model.count / 4)
                    if ((model.count % 4) != 0) div++
                    return div * Theme.itemSizeMedium
                }
                clip: true
                layoutDirection: out === 0 ? Qt.LeftToRight : Qt.RightToLeft
                interactive: false
                cellWidth: Theme.itemSizeMedium
                cellHeight: Theme.itemSizeMedium

                model: ListModel {}

                delegate: BackgroundItem {
                    width: Theme.itemSizeMedium - Theme.paddingSmall
                    height: Theme.itemSizeMedium - Theme.paddingSmall

                    Image {
                        anchors.fill: parent
                        source: src
                        fillMode: Image.PreserveAspectCrop
                    }

                    onClicked: {
                        try {
                            var data = { "imageSource": srcXXBig }
                        } catch (e) {
                            try {
                                data = { "imageSource": srcXBig }
                            } catch (e) {
                                try {
                                    data = { "imageSource": srcBig }
                                } catch (e) {
                                    data = { "imageSource": src }
                                }
                            }
                        } finally {
                            pageContainer.push("../pages/ImagePage.qml", data)
                        }
                    }
                }
            }

            SilicaListView {
                id: videosAttachment
                anchors.left: parent.left
                anchors.right: parent.right
                height: model.count * Theme.itemSizeLarge * 2 + model.count * Theme.paddingMedium
                clip: true
                layoutDirection: out === 0 ? Qt.LeftToRight : Qt.RightToLeft
                spacing: Theme.paddingMedium
                interactive: false

                model: ListModel {}

                delegate: BackgroundItem {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: Theme.itemSizeLarge * 2

                    Image {
                        anchors.fill: parent
                        source: image
                        fillMode: Image.PreserveAspectCrop

                        Image {
                            anchors.centerIn: parent
                            source: "image://theme/icon-l-play"
                        }
                    }

                    onClicked: VideosAPI.getVideo(vid)
                }
            }

            SilicaListView {
                id: audiosAttachment
                anchors.left: parent.left
                anchors.right: parent.right
                height: model.count * (Theme.itemSizeMedium + Theme.paddingMedium)
                clip: true
                layoutDirection: out === 0 ? Qt.LeftToRight : Qt.RightToLeft
                spacing: Theme.paddingMedium
                interactive: false

                model: ListModel {}

                delegate: Item {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: Theme.itemSizeMedium

                    property bool isPlaying: false

                    Image {
                        id: audioPlayPause
                        anchors.top: parent.top
                        anchors.bottom: parent.bottom
                        anchors.left: parent.left
                        width: height
                        source: isPlaying ? "image://theme/icon-l-pause" : "image://theme/icon-l-play"

                        MouseArea {
                            anchors.fill: parent
                            onClicked: {
                                if (isPlaying) {
                                    audioPlayer.pause()
                                    isPlaying = false
                                } else {
                                    audioPlayer.stop()
                                    isPlaying = true
                                    AudiosAPI.getAudio(oid, aid)
                                }
                            }
                        }
                    }

                    Row {
                        anchors.verticalCenter: audioPlayPause.verticalCenter
                        anchors.left: audioPlayPause.right
                        anchors.right: parent.right

                        Label {
                            text: artist
                            font.bold: true
                        }

                        Label {
                            text: " - " + title
                        }
                    }
                }
            }

            Label {
                id: datetimeText
                width: parent.parent.width - Theme.paddingMedium - messageAvatar.width
                horizontalAlignment: out === 1 ? Text.AlignRight : Text.AlignLeft
                text: datetime
                font.pixelSize: Theme.fontSizeTiny
                color: readState === 1 ? Theme.secondaryColor : Theme.secondaryHighlightColor
            }
        }

    }

    onClicked: console.log(messageText.text)

    Component.onCompleted: {
        for (var index = 0; index < attachmentsData.count; index++) {
            if (attachmentsData.get(index).type) {
                switch (attachmentsData.get(index).type) {
                    case "photo":
                        photosAttachment.model.append({ src:      attachmentsData.get(index).photo.src,
                                                        srcBig:   attachmentsData.get(index).photo.src_big,
                                                        srcXBig:  attachmentsData.get(index).photo.src_xbig,
                                                        srcXXBig: attachmentsData.get(index).photo.src_xxbig })
                        break
                    case "video":
                        videosAttachment.model.append({ vid:   attachmentsData.get(index).video.owner_id + "_" + attachmentsData.get(index).video.vid,
                                                        image: attachmentsData.get(index).video.image })
                        break
                    case "audio":
                        audiosAttachment.model.append({ oid:      attachmentsData.get(index).audio.owner_id,
                                                        aid:      attachmentsData.get(index).audio.aid,
                                                        artist:   attachmentsData.get(index).audio.artist,
                                                        title:    attachmentsData.get(index).audio.title })
                        break
                    case "doc": break
                    case "wall": break
                    case "point": break
                }
            } else {
                break
            }
        }
    }
}
