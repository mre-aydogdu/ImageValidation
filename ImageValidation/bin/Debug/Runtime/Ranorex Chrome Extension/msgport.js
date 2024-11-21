// RANOREX 
// message port

var RXmsg = {
    handler: {}
};

window.RXmsg = RXmsg;

window.RXmsg.onRecv = function (msg) {
    if (msg.f) {
        var h = window.RXmsg.handler[msg.f];
        if (h) {
            h(msg, function (resp) {

                if (!resp)
                    resp = window.RXmsg.defaultResp;
                resp.f = msg.f;
                resp._n = msg._n;
                window.RXmsg.msgPort.postMessage(resp);
            });
        }
        else if (window.RXmsg.defaultHandler)
            window.RXmsg.defaultHandler(msg, function (resp) {

                if (!resp)
                    resp = window.RXmsg.defaultResp;
                resp.f = msg.f;
                resp._n = msg._n;
                window.RXmsg.msgPort.postMessage(resp);
            });
    }
}

window.RXmsg.addHandler = function (f, h) {
    window.RXmsg.handler[f] = h;
}

window.RXmsg.addDefaultHandler = function (h) {
    window.RXmsg.defaultHandler = h;
}


window.RXmsg.initMsgHost = function () {
    try {
        window.RXmsg.defaultResp = { f: "unknown", err: "No handler." };
        window.RXmsg.handler = {};
        window.RXmsg.msgPort = chrome.runtime.connectNative("com.ranorex.chrome_msghost");
        window.RXmsg.msgPort.onMessage.addListener(window.RXmsg.onRecv);

        window.RXmsg.msgPort.onDisconnect.addListener = function (evt) {
            console.warn("Ranorex: Port has been disconnected. " + evt);
            //V3 Change
            chrome.alarms.create("msgPortAlarm", { delayInMinutes: 0.1 });
        };
    }
    catch (e) {
        console.warn("Ranorex: Failed to create connection to Ranorex message host. " + e);
    }
}

window.RXmsg.createBgPort = function () {
    try {
        window.RXmsg.defaultResp = { f: "unknown", err: "No handler." };
        window.RXmsg.msgPort = chrome.runtime.connect();
        window.RXmsg.msgPort.onDisconnect.addListener = function (evt) {
            console.warn("Ranorex: Bg Port has been disconnected. " + evt);
        };
        window.RXmsg.msgPort.onMessage.addListener(window.RXmsg.onRecv);
    }
    catch (e) {
        console.warn("Ranorex: Failed to create connection to background page. " + e);
    }
}

window.RXmsg.post = function (msg) {
    RXmsg.msgPort.postMessage(msg);
}

window.RXmsg.postInitMessage = function (mode, wndId, tabId, frameid) {
    window.RXmsg.msgPort.postMessage({ notify: mode, wndid: wndId, tabid: tabId, frameid: frameid });
};
