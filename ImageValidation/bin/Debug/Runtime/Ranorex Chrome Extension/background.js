// RANOREX

var forwardPorts = {};

var lastForwardPort;
var lastMsgSeq = 0;
var lastFunc = null;
var window = chrome.windows.getCurrent();

importScripts('msgport.js');

RXmsg.initMsgHost();

console.log("Ranorex: setup background page");


function senderToKey(sender) {
    return toKey(sender.tab.id, sender.frameId);
}

function getMainFrameKey(tabId) {
    return toKey(tabId, 0);
}

function toKey(tabId, frameId) {
    return tabId + ":" + (frameId || 0);
}
//V3 change
chrome.alarms.onAlarm.addListener(
    function alarmListener(alarm) {
        console.log("Alarm name " + alarm.name);
        if (alarm.name == "msgPortAlarm") {
            console.log("msgPortAlarm Connect Native");
            window.RXmsg.msgPort = chrome.runtime.connectNative("com.ranorex.chrome_msghost");
            window.RXmsg.msgPort.onMessage.addListener(window.RXmsg.onRecv);
            chrome.alarms.clear("msgPortAlarm");
        }
    }
);

chrome.runtime.onConnect.addListener(function (port) {

    if (!port.sender.tab)
        return;
    console.log("Ranorex: tab " + senderToKey(port.sender) + " has connected");

    forwardPorts[senderToKey(port.sender)] = port;
    port.windowId = port.sender.tab.windowId;
    port.tabId = port.sender.tab.id;
    port.frameId = port.sender.frameId;

    // forward tab replies back to msghost
    port.onMessage.addListener(function (msg) {
        if (msg.msg === "rx-getframeid-response") {
            //route message back to querying tab/frame
            msg.tabid = port.tabId;
            msg.frameid = msg.parentFrameId;
            msg.f = msg.msg;
            //post to content.js default handler
            window.RXmsg.onRecv(msg);
        }
        else {
            lastForwardPort = null;
            RXmsg.post(msg);
        }
    });

    port.onDisconnect.addListener(function () {
        if (lastForwardPort) {
            // special case for execScript() because it might navigate away from the page,
            // return "null" because dom page has no chance to send a reply
            if (lastFunc == "executeScript")
                RXmsg.post({ f: "executeScript", _n: lastMsgSeq, result: "" });
            else
                RXmsg.post({ err: "Tab with id " + lastForwardPort.tabId + " is no longer available.", _n: lastMsgSeq, warnOnly: true });
            lastForwardPort = null;
            lastFunc = null;
        }
        console.log("Ranorex: tab " + senderToKey(port.sender) + " has disconnected");

        let key = senderToKey(port.sender);

        if (forwardPorts[key] === port) {
            delete forwardPorts[key];
        }
    });
});

// handles request by the page to reflect its tabid/windowid
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (sender.tab) {
            sendResponse({
                "query": "tabinfo",
                "tabid": sender.tab.id,
                "windowid": sender.tab.windowId,
                "frameid": sender.frameId,
            });
        }
        else {
            sendResponse({
                "query": "tabinfo",
                "tabid": -1,
                "windowid": -1,
                "frameid": -1,
            });
        }
    });

console.log("Ranorex: begin extension init");

// try to get chrome version from storage Cache
chrome.storage.local.get('browserVersion', function (result) {
    console.log('browserVersion currently is ' + result.browserVersion);
    if (!result.browserVersion) {
        try {
            //V3 Change
            chrome.storage.local.set({ "browserVersion": navigator.appVersion.match(/Chrome\/(.*?) /)[1] }, function () {
                console.log('browserVersion is set to ' + navigator.appVersion.match(/Chrome\/(.*?) /)[1]);
            });
        }
        catch (x) { //undefined is unknown
            chrome.storage.local.set({ "browserVersion": undefined }, function () {
                console.log("Ranorex: Failed to get browser version from user agent");
            });
        }
    }
});

// handlers for everything handled by the background page

RXmsg.addHandler("getAllWindows", function (m, r) {
    try {
        chrome.windows.getAll({ populate: true }, function (wnds) {
            try {
                for (var i = 0; i < wnds.length; i++) {
                    var tabs = wnds[i].tabs;
                    var filteredTabs = [];
                    var k = 0;

                    for (var j = 0; j < tabs.length; j++) {
                        if (!forwardPorts[getMainFrameKey(tabs[j].id)])
                            tabs[j].filtered = true;
                    }
                }
            }
            catch (ee) {
                console.log("Ranorex: Failed to filter tabs, using fallback list: " + ee);
            }

            //V3 changes usage of Storage API to get
            chrome.storage.local.get('browserVersion', function (result) {
                r({ windows: wnds, version: result.browserVersion });
            });
        });
    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
});

RXmsg.addHandler("getWindow", function (m, r) {
    try {
        chrome.windows.get(m.wndid, { populate: true }, function (wnd) {
            r(wnd);
        });
    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
});

RXmsg.addHandler("getTab", function (m, r) {
    try {
        chrome.tabs.get(m.arg1, function (tab) {
            if (!tab || tab.id == -1)
                r({ err: "tab not found" });
            else {
                chrome.windows.get(m.arg0, {}, function (wnd) {
                    //V3 change
                    chrome.storage.local.get('browserVersion', function (result) {
                        r({ tab: tab, wnd: wnd, version: result.browserVersion });
                    });
                });
            }
        });
    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
});

RXmsg.addHandler("closeTab", function (m, r) {
    try {
        chrome.tabs.remove(m.arg0);
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
});

RXmsg.addHandler("selectTab", function (m, r) {
    try {
        chrome.tabs.update(m.arg0, { "selected": true });
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
});

RXmsg.addHandler("navigateTab", function (m, r) {
    try {
        chrome.tabs.update(m.arg0, { "url": m.arg1 });
        r({});
    }
    catch (e) {
        r({ err: 'Error ' + e });
    }
});

RXmsg.addHandler("reflectBackground", function (m, r) {
    r({ "reflect": "background", "value": m.arg0 });
});

RXmsg.addHandler("getFeatures", function (m, r) {
    r({ "fromPath": true });
});

RXmsg.addDefaultHandler(function (m, r) {
    var p = forwardPorts[toKey(m.tabid, m.frameid)];
    if (p) {
        lastForwardPort = p;
        try {
            lastFunc = m.f;
            lastMsgSeq = m._n;
            p.postMessage(m);
        }
        catch (pe) {
            r({ err: "Tab msg post failed" });
        }
    }
    else {
        r({ err: "Tab id does not exist" });
    }
});


// browser toolbar button
//This function is not needed in V3 as this alert is supported from manifest.json's 'action' property
/*chrome.action.onClicked.addListener(function (tab) {
   alert("Ranorex Automation Extension for Chrome\n(c) Ranorex GmbH");
});*/

// set attached msg host to "master" mode
RXmsg.postInitMessage("init-background", -1, -1);

console.log("Ranorex: extension init complete");
