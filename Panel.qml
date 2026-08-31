pragma ComponentBehavior: Bound

import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "io.github.deca.from-time-to-time"
  ipcTarget: "io.github.deca.from-time-to-time"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  property date now: new Date()
  property var config: Model.defaultConfig()
  property bool configMissing: false
  property double openingSeed: 0

  readonly property var activeBlock: Model.activeBlock(config.schedule, now)
  readonly property var nextBlock: Model.nextBlock(config.schedule, now)
  readonly property var todaySegments: Model.daySegments(config.schedule, now)
  readonly property var life: Model.lifeStats(config.life.birthDate, config.life.horizonYears, now)
  readonly property string visualizationMode: config.visualization.mode
  readonly property var perspective: Model.perspective(config, life, now)
  readonly property var cardDeck: Model.cardDeck(config, life, now, openingSeed)
  readonly property real nowMinute: Model.minuteOfDay(now)

  readonly property string barText: {
    if (config._error) return "TIME !"
    if (activeBlock) return activeBlock.label.toUpperCase() + "  " + Model.formatDuration(activeBlock.remainingMinutes)
    if (nextBlock) return "OPEN  " + Model.formatDuration(nextBlock.untilMinutes)
    return "OPEN"
  }
  readonly property string shortLabel: activeBlock
    ? activeBlock.label.substring(0, 4).toUpperCase()
    : "OPEN"
  readonly property color activeColor: activeBlock ? activeBlock.color : Color.accent
  readonly property real activeProgress: activeBlock ? activeBlock.progress : 0

  readonly property color contentForeground: bar ? bar.foreground : Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  property bool alertMonitorReady: false
  property double lastAlertTickMs: 0

  function activeToken(block) {
    return block ? block.id + ":" + block.starts.getTime() : ""
  }

  function resetAlertMonitor() {
    alertMonitorReady = false
    lastAlertTickMs = now.getTime()
  }

  function playTransition(previous, current) {
    if (!config.alerts.enabled) return

    var playEnd = previous && previous.sound
    var playStart = current && current.sound
    if (!playEnd && !playStart) return

    var kind = playEnd && playStart ? "switch" : (playStart ? "start" : "end")
    var eventKey
    if (kind === "switch")
      eventKey = "switch:" + previous.id + ":" + previous.ends.getTime()
        + ">" + current.id + ":" + current.starts.getTime()
    else if (kind === "start")
      eventKey = "start:" + current.id + ":" + current.starts.getTime()
    else
      eventKey = "end:" + previous.id + ":" + previous.ends.getTime()

    var startSound = current && current.startSound !== ""
      ? current.startSound : config.alerts.startSound
    var endSound = previous && previous.endSound !== ""
      ? previous.endSound : config.alerts.endSound
    var quiet = config.alerts.quietHours

    Quickshell.execDetached([
      Quickshell.env("HOME") + "/.config/omarchy/plugins/io.github.deca.from-time-to-time/play-transition.sh",
      eventKey,
      kind,
      startSound,
      endSound,
      quiet.enabled ? "true" : "false",
      quiet.start,
      quiet.end
    ])
  }

  function tick(nextDate) {
    var previous = Model.activeBlock(config.schedule, now)
    var gap = nextDate.getTime() - lastAlertTickMs
    now = nextDate
    var current = Model.activeBlock(config.schedule, now)

    if (!alertMonitorReady) {
      alertMonitorReady = true
      lastAlertTickMs = nextDate.getTime()
      return
    }

    // Clock jumps, shell stalls, and suspend/resume must never replay a cue
    // whose boundary passed while this instance was not actively observing.
    if (gap > 0 && gap <= 10000 && activeToken(previous) !== activeToken(current))
      playTransition(previous, current)

    lastAlertTickMs = nextDate.getTime()
  }

  function loadConfig(text) {
    configMissing = false
    config = Model.parseConfig(text)
    now = new Date()
    resetAlertMonitor()
  }

  function loadDefaultConfig() {
    configMissing = true
    config = Model.defaultConfig()
    now = new Date()
    resetAlertMonitor()
  }

  function refresh() {
    now = new Date()
    resetAlertMonitor()
    configFile.reload()
  }

  function open() {
    if (!opened) openingSeed = Date.now()
    refresh()
    controller.show()
  }

  function close() {
    controller.hide()
  }

  function toggle() {
    if (opened) close()
    else open()
  }

  function switchPanel(direction) {
    if (bar && typeof bar.switchPanelFrom === "function")
      return bar.switchPanelFrom(barIdentity, direction)
    return false
  }

  FileView {
    id: configFile
    path: Quickshell.env("HOME") + "/.config/omarchy/timeline.json"
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.loadConfig(text())
    onLoadFailed: root.loadDefaultConfig()
  }

  SystemClock {
    id: clock
    precision: SystemClock.Seconds
    onDateChanged: root.tick(date)
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    centerOnBar: true
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(620))
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight, Style.space(780))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(text) {
        if (text === "r" || text === "R") root.refresh()
      }

      Flickable {
        id: timelineScroll
        anchors.fill: parent
        contentWidth: width
        contentHeight: contentColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height

        Column {
          id: contentColumn
          width: timelineScroll.width
          spacing: Style.space(18)

          Column {
            width: parent.width
            spacing: Style.space(3)

            Text {
              width: parent.width
              text: root.activeBlock ? root.activeBlock.label.toUpperCase() : "UNSCHEDULED"
              color: root.activeColor
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.title
              font.bold: true
              horizontalAlignment: Text.AlignHCenter
            }

            Text {
              width: parent.width
              text: root.activeBlock
                ? Model.formatDuration(root.activeBlock.remainingMinutes) + " remaining"
                : (root.nextBlock
                    ? root.nextBlock.label + " begins in " + Model.formatDuration(root.nextBlock.untilMinutes)
                    : "No upcoming period")
              color: root.contentForeground
              opacity: 0.72
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.body
              horizontalAlignment: Text.AlignHCenter
            }
          }

          Column {
            width: parent.width
            spacing: Style.space(8)

            Row {
              width: parent.width

              Text {
                id: todayTitle
                text: "TODAY"
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.bodySmall
                font.bold: true
                font.letterSpacing: 1
              }

              Item { width: parent.width - todayTitle.width - todayDate.width; height: 1 }

              Text {
                id: todayDate
                text: Qt.formatDate(root.now, "dddd, MMMM d")
                color: root.contentForeground
                opacity: 0.62
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.bodySmall
              }
            }

            Item {
              id: dayTrack
              width: parent.width
              height: Style.space(54)

              Rectangle {
                anchors.fill: parent
                radius: Style.space(5)
                color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.08)
              }

              Repeater {
                model: root.todaySegments

                Rectangle {
                  required property var modelData
                  x: dayTrack.width * modelData.startMinute / 1440
                  y: Style.space(7)
                  width: Math.max(1, dayTrack.width * (modelData.endMinute - modelData.startMinute) / 1440)
                  height: dayTrack.height - Style.space(14)
                  color: modelData.color
                  opacity: 0.88
                  radius: Style.space(3)

                  Text {
                    anchors.centerIn: parent
                    width: parent.width - Style.space(6)
                    visible: parent.width > implicitWidth + Style.space(10)
                    text: modelData.label.toUpperCase()
                    elide: Text.ElideRight
                    horizontalAlignment: Text.AlignHCenter
                    color: "#111111"
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                  }
                }
              }

              Rectangle {
                x: Math.max(0, Math.min(dayTrack.width - width, dayTrack.width * root.nowMinute / 1440 - width / 2))
                width: Math.max(2, Style.space(2))
                height: parent.height + Style.space(5)
                anchors.verticalCenter: parent.verticalCenter
                color: Color.accent
                z: 3
              }
            }

            Row {
              width: parent.width
              Repeater {
                model: ["00", "06", "12", "18", "24"]
                Text {
                  required property string modelData
                  width: parent.width / 5
                  text: modelData
                  color: root.contentForeground
                  opacity: 0.48
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.caption
                  horizontalAlignment: modelData === "00"
                    ? Text.AlignLeft
                    : (modelData === "24" ? Text.AlignRight : Text.AlignHCenter)
                }
              }
            }

            Flow {
              width: parent.width
              spacing: Style.space(12)

              Repeater {
                model: root.config.schedule

                Row {
                  required property var modelData
                  spacing: Style.space(5)

                  Rectangle {
                    anchors.verticalCenter: parent.verticalCenter
                    width: Style.space(8)
                    height: width
                    radius: width / 2
                    color: modelData.color
                  }

                  Text {
                    text: modelData.label + "  " + modelData.start + "–" + modelData.end
                    color: root.contentForeground
                    opacity: 0.76
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.caption
                  }
                }
              }
            }
          }

          Rectangle {
            width: parent.width
            height: 1
            color: root.contentForeground
            opacity: 0.12
          }

          Column {
            visible: root.config.life.enabled
            width: parent.width
            spacing: Style.space(9)

            Row {
              width: parent.width

              Text {
                id: lifeTitle
                text: "LIFE"
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.bodySmall
                font.bold: true
                font.letterSpacing: 1
              }

              Item { width: parent.width - lifeTitle.width - lifePercent.width; height: 1 }

              Text {
                id: lifePercent
                text: root.life.valid ? root.life.percent + "%" : ""
                color: Color.accent
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.bodySmall
                font.bold: true
              }
            }

            Rectangle {
              visible: root.life.valid
              width: parent.width
              height: Style.space(13)
              radius: height / 2
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.12)

              Rectangle {
                width: parent.width * root.life.progress
                height: parent.height
                radius: height / 2
                color: Color.accent
              }

              Rectangle {
                x: Math.max(0, Math.min(parent.width - width, parent.width * root.life.progress - width / 2))
                anchors.verticalCenter: parent.verticalCenter
                width: Math.max(2, Style.space(3))
                height: parent.height + Style.space(5)
                radius: width / 2
                color: root.contentForeground
              }
            }

            Row {
              visible: root.life.valid
              width: parent.width

              Text {
                id: weeksLived
                text: root.life.valid ? root.life.elapsedWeeks.toLocaleString() + " weeks lived" : ""
                color: root.contentForeground
                opacity: 0.62
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.caption
              }

              Item { width: parent.width - weeksLived.width - horizonLabel.width; height: 1 }

              Text {
                id: horizonLabel
                text: root.life.valid ? root.life.horizonYears + "-year horizon" : ""
                color: root.contentForeground
                opacity: 0.62
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.caption
              }
            }

            Text {
              visible: !root.life.valid
              width: parent.width
              text: "Set life.birthDate in ~/.config/omarchy/timeline.json to reveal this view."
              wrapMode: Text.WordWrap
              color: root.contentForeground
              opacity: 0.68
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.body
            }
          }

          Column {
            visible: root.visualizationMode === "perspective"
              && root.config.life.enabled && root.life.valid && root.perspective.visible
            width: parent.width
            spacing: Style.space(10)

            Text {
              text: "PERSPECTIVE"
              color: root.contentForeground
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              font.letterSpacing: 1
            }

            Text {
              width: parent.width
              text: root.perspective.headline
              color: Color.accent
              horizontalAlignment: Text.AlignHCenter
              wrapMode: Text.WordWrap
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.title * 1.25
              font.bold: true
            }

            Text {
              width: parent.width
              text: root.perspective.context
              color: root.contentForeground
              horizontalAlignment: Text.AlignHCenter
              wrapMode: Text.WordWrap
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.body
            }

            Rectangle {
              anchors.horizontalCenter: parent.horizontalCenter
              width: Style.space(48)
              height: 1
              color: root.contentForeground
              opacity: 0.18
            }

            Text {
              visible: root.perspective.supporting !== ""
              width: parent.width
              text: root.perspective.supporting
              color: root.contentForeground
              opacity: 0.55
              horizontalAlignment: Text.AlignHCenter
              wrapMode: Text.WordWrap
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.bodySmall
            }
          }

          Column {
            visible: root.visualizationMode === "cards"
              && root.config.life.enabled && root.life.valid && root.cardDeck.length > 0
            width: parent.width
            spacing: Style.space(9)

            Text {
              text: "CARDS"
              color: root.contentForeground
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              font.letterSpacing: 1
            }

            Grid {
              id: cardGrid
              width: parent.width
              columns: 2
              columnSpacing: Style.space(9)
              rowSpacing: Style.space(9)

              Repeater {
                model: root.cardDeck

                Rectangle {
                  id: cardDelegate
                  required property var modelData
                  width: (cardGrid.width - cardGrid.columnSpacing) / 2
                  height: Style.space(112)
                  radius: Style.space(5)
                  color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.07)

                  Column {
                    anchors.fill: parent
                    anchors.margins: Style.space(9)
                    spacing: Style.space(3)

                    Text {
                      width: parent.width
                      text: cardDelegate.modelData.headline
                      color: Color.accent
                      elide: Text.ElideRight
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.display
                      font.bold: true
                    }

                    Text {
                      width: parent.width
                      text: cardDelegate.modelData.label
                      color: root.contentForeground
                      elide: Text.ElideRight
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.body
                      font.bold: true
                    }

                    Row {
                      id: weekStrip
                      visible: cardDelegate.modelData.kind === "week-strip"
                      width: parent.width
                      spacing: 1

                      Repeater {
                        model: cardDelegate.modelData.kind === "week-strip" ? cardDelegate.modelData.totalInHorizon : 0

                        Rectangle {
                          required property int index
                          width: (weekStrip.width - 51 * weekStrip.spacing) / 52
                          height: Style.space(13)
                          radius: Math.min(width / 2, Style.space(1))
                          color: index + 1 === cardDelegate.modelData.currentInHorizon ? Color.accent : root.contentForeground
                          opacity: index + 1 === cardDelegate.modelData.currentInHorizon
                            ? 1 : (index < cardDelegate.modelData.completedInHorizon ? 0.42 : 0.12)
                        }
                      }
                    }

                    Text {
                      width: parent.width
                      text: cardDelegate.modelData.reflection
                      color: root.contentForeground
                      opacity: 0.72
                      elide: Text.ElideRight
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.bodySmall
                    }

                    Text {
                      visible: cardDelegate.modelData.countdown !== ""
                      width: parent.width
                      text: cardDelegate.modelData.countdown
                      color: Color.accent
                      opacity: 0.78
                      elide: Text.ElideRight
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.bodySmall
                      font.bold: true
                    }
                  }
                }
              }
            }
          }

          Column {
            visible: root.configMissing || root.config._error !== "" || root.config._issues.length > 0
            width: parent.width
            spacing: Style.space(3)

            Text {
              visible: root.configMissing
              width: parent.width
              text: "No personal configuration yet. Copy timeline.example.json to ~/.config/omarchy/timeline.json."
              color: root.contentForeground
              opacity: 0.72
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.bodySmall
              wrapMode: Text.WordWrap
            }

            Text {
              visible: root.config._error !== ""
              width: parent.width
              text: root.config._error
              color: Color.urgent
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.bodySmall
              wrapMode: Text.WordWrap
            }

            Repeater {
              model: root.config._issues
              Text {
                required property string modelData
                width: contentColumn.width
                text: modelData
                color: Color.urgent
                opacity: 0.86
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.caption
                wrapMode: Text.WordWrap
              }
            }
          }
        }
      }
    }
  }
}
